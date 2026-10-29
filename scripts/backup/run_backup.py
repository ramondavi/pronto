"""Independent, read-only Supabase backup. Never print provider exception details.

Requires PostgreSQL 17 tools, age and requirements.txt. Secrets come only from the
execution environment; this program never loads dotenv files or writes credentials.
"""

from __future__ import annotations

import base64
import hashlib
from contextlib import contextmanager
import json
import os
from pathlib import Path
import re
import ssl
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timedelta, timezone
from urllib.error import HTTPError
from urllib.parse import quote, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import uuid


SCHEMAS = ("public", "auth", "storage", "supabase_migrations")
PLATFORM_SCHEMAS = ("information_schema", "extensions", "vault", "realtime", "_realtime",
                    "graphql", "graphql_public", "pgbouncer", "pgsodium", "pgsodium_masks", "net", "cron", "_analytics")
FORMAT = "pronto-backup-v1"
RENEW_AFTER = timedelta(days=80)
MAX_STORED_BYTES = 8_000_000_000  # Reserve below B2's 10 GB free allowance.
MAX_ARCHIVE_BYTES = 2_000_000_000
MAX_OBJECT_BYTES = 5 * 1024 * 1024  # Current Nada Consta application limit.
OPERATOR_TOOL_PATH = re.compile(r"windows/([0-9a-f]{64})/Pronto-Backup-Manual\.zip")
MAX_OPERATOR_TOOL_BYTES = 50 * 1024 * 1024



class BackupError(Exception):
    """Message must be a static, non-sensitive diagnostic code."""


def require(condition: bool, code: str) -> None:
    if not condition:
        raise BackupError(code)


def b2_error_code(error):
    # Only fixed operation/reason labels may leave this process. Provider
    # messages, request IDs, endpoints and unknown error codes stay private.
    operation_name = getattr(error, "operation_name", "")
    operation_name = operation_name if isinstance(operation_name, str) else ""
    operation = {"GetBucketAcl": "privacy", "GetObjectLockConfiguration": "retention",
                 "GetBucketLifecycleConfiguration": "lifecycle", "PutObject": "upload",
                 "GetObject": "download", "HeadObject": "metadata", "ListObjectVersions": "versions",
                 "ListObjectsV2": "inventory"}.get(operation_name, "connection")
    response = getattr(error, "response", None)
    reason = "check_failed"
    if isinstance(response, dict):
        details = response.get("Error", {})
        provider_code = details.get("Code") if isinstance(details, dict) else None
        provider_code = provider_code if isinstance(provider_code, str) else None
        reason = {"AccessDenied": "access_denied", "Unauthorized": "access_denied",
                  "InvalidAccessKeyId": "credentials_not_accepted", "ExpiredToken": "credentials_not_accepted",
                  "InvalidToken": "credentials_not_accepted", "SignatureDoesNotMatch": "signature_not_accepted",
                  "NoSuchBucket": "bucket_not_found", "NoSuchLifecycleConfiguration": "lifecycle_not_configured",
                  "ObjectLockConfigurationNotFoundError": "retention_not_configured",
                  "RequestTimeTooSkewed": "clock_skew", "NotImplemented": "request_not_supported",
                  "InvalidRequest": "request_rejected", "BadDigest": "checksum_rejected"}.get(provider_code, reason)
    if type(error).__name__ in {"EndpointConnectionError", "ConnectTimeoutError", "ReadTimeoutError"}:
        reason = "network_unavailable"
    if type(error).__name__ == "SSLError":
        reason = "tls_validation_failed"
    return "b2_" + operation + "_" + reason


def execution_error_code(error):
    if isinstance(error, BackupError):
        return str(error)
    if isinstance(getattr(error, "response", None), dict) or type(error).__module__.startswith("botocore."):
        return b2_error_code(error)
    if isinstance(error, HTTPError):
        return {401: "http_authentication_failed", 403: "http_access_denied",
                404: "http_resource_not_found", 429: "http_rate_limited"}.get(error.code, "http_request_failed")
    sqlstate = getattr(error, "sqlstate", None)
    if isinstance(sqlstate, str):
        return {"42501": "database_permission_denied", "57014": "database_query_timeout",
                "55P03": "database_lock_unavailable", "28P01": "database_credentials_not_accepted",
                "08006": "database_connection_failed"}.get(sqlstate, "database_operation_failed")
    return "execution_failed"


def digest_file(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def digest_json(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, default=str).encode()).hexdigest()


def canonical_sql(content: bytes) -> bytes:
    # pg_dump headers and random psql restrict tokens change on every execution.
    return b"\n".join(line for line in content.splitlines()
                      if not line.startswith((b"--", b"\\restrict ", b"\\unrestrict ")))


def needs_backup(previous: dict | None, fingerprint: str, now: datetime) -> bool:
    if previous is None:
        return True
    created = datetime.fromisoformat(previous["created_at"])
    require(created.tzinfo is not None and created <= now, "invalid_backup_time")
    return previous["fingerprint"] != fingerprint or now - created >= RENEW_AFTER


def run_tool(command: list[str]) -> None:
    # Inspect stderr locally for fixed categories; never publish its contents.
    tool = {"pg_dump": "pg_dump", "pg_dumpall": "pg_dumpall", "pg_restore": "pg_restore", "age": "age",
            "age-keygen": "age_keygen"}.get(Path(command[0]).stem, "external_tool")
    try:
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=900)
    except subprocess.CalledProcessError as error:
        message = (error.stderr or b"").decode("utf-8", errors="replace").lower()
        reason = "permission_denied" if "permission denied" in message else "failed"
        if "server version" in message and "pg_dump version" in message:
            reason = "version_mismatch"
        if "snapshot" in message and "does not exist" in message:
            reason = "snapshot_unavailable"
        raise BackupError(tool + "_" + reason) from None
    except subprocess.TimeoutExpired:
        raise BackupError(tool + "_timeout") from None


def report_progress(stage):
    allowed = {"validate_destination", "inspect_destination", "open_snapshot", "export_schema", "export_roles",
               "fingerprint", "inventory_documents", "export_database", "verify_sequences", "export_documents",
               "verify_documents", "package_encrypt", "upload_archive", "verify_upload", "commit_archive",
               "report_completion", "monitor_start", "monitor_success"}
    require(stage in allowed, "invalid_progress_stage")
    print("Backup: etapa " + stage + ".", flush=True)


def content_md5(body):
    # Compatibility checksum required by Object Lock. SHA-256 readback remains
    # the security/integrity verification; MD5 here is only the HTTP protocol field.
    if isinstance(body, bytes):
        digest = hashlib.md5(body, usedforsecurity=False).digest()
    else:
        position = body.tell()
        try:
            digest = hashlib.file_digest(body, lambda: hashlib.md5(usedforsecurity=False)).digest()
        finally:
            body.seek(position)
    return base64.b64encode(digest).decode("ascii")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise BackupError("http_redirect_rejected")


def safe_request(url: str, *, headers: dict | None = None, method="GET"):
    require(urlsplit(url).scheme == "https", "https_required")
    return build_opener(NoRedirect).open(Request(url, headers=headers or {}, method=method), timeout=90)


def heartbeat(suffix: str = "") -> None:
    url = os.environ.get("BACKUP_HEARTBEAT_URL", "")
    host = urlsplit(url).hostname or ""
    require(host == "hc-ping.com" or host.endswith(".hc-ping.com"), "invalid_heartbeat")
    with safe_request(url.rstrip("/") + suffix, method="POST") as response:
        require(response.status == 200, "heartbeat_failed")


def check_environment() -> None:
    required = ("PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD",
                "BACKUP_SOURCE_ID", "B2_ENDPOINT", "B2_REGION", "B2_BUCKET",
                "B2_KEY_ID", "B2_APPLICATION_KEY", "BACKUP_AGE_RECIPIENT",
                "SUPABASE_URL", "BACKUP_STORAGE_READ_TOKEN", "BACKUP_HEARTBEAT_URL", "BACKUP_PG_CA_CERT")
    require(all(os.environ.get(name) for name in required), "missing_configuration")
    require(os.environ.get("GITHUB_REF", "refs/heads/master") == "refs/heads/master", "untrusted_branch")
    require(os.environ["PGPORT"] == "5432", "session_connection_required")
    require(os.environ.get("PGSSLMODE") == "verify-full" and
            os.environ.get("PGSSLROOTCERT") == "system", "verified_database_tls_required")
    pg_host = os.environ["PGHOST"]
    require(pg_host.endswith((".supabase.co", ".pooler.supabase.com")), "invalid_database_host")
    require(re.fullmatch(r"[a-z0-9-]{3,40}", os.environ["BACKUP_SOURCE_ID"]) is not None, "invalid_source_id")
    endpoint = urlsplit(os.environ["B2_ENDPOINT"])
    require(endpoint.scheme == "https" and endpoint.hostname is not None and
            endpoint.hostname.endswith(".backblazeb2.com") and
            not endpoint.username and not endpoint.password and
            endpoint.path in ("", "/") and not endpoint.query, "invalid_b2_endpoint")
    supabase = urlsplit(os.environ["SUPABASE_URL"])
    require(supabase.scheme == "https" and supabase.hostname is not None and
            supabase.hostname.endswith(".supabase.co") and not supabase.username and
            not supabase.password and supabase.path in ("", "/") and not supabase.query, "invalid_storage_endpoint")
    project = supabase.hostname.split(".")[0]
    require(supabase.hostname == project + ".supabase.co" and
            (pg_host == "db." + project + ".supabase.co" or
             (pg_host.endswith(".pooler.supabase.com") and os.environ["PGUSER"].endswith("." + project))),
            "database_storage_project_mismatch")
    require(os.environ["BACKUP_AGE_RECIPIENT"].startswith("age1"), "public_age_recipient_required")


@contextmanager
def database_tls():
    # Supabase's CA is not necessarily in the system trust store. This is a
    # public certificate, never a private key; verify both CA and hostname.
    certificate = os.environ["BACKUP_PG_CA_CERT"].strip()
    require(re.fullmatch(r"-----BEGIN CERTIFICATE-----\s+[A-Za-z0-9+/=\s]+-----END CERTIFICATE-----",
                         certificate) is not None, "invalid_database_ca")
    ssl.PEM_cert_to_DER_cert(certificate)
    previous = os.environ.get("PGSSLROOTCERT")
    with tempfile.TemporaryDirectory(prefix="pronto-ca-") as temp:
        path = Path(temp) / "supabase-ca.crt"
        path.write_text(certificate + "\n", encoding="ascii")
        os.environ["PGSSLROOTCERT"] = str(path)
        try:
            yield
        finally:
            if previous is None:
                os.environ.pop("PGSSLROOTCERT", None)
            else:
                os.environ["PGSSLROOTCERT"] = previous


def operator_tool_reference(bucket, name, metadata):
    """Reviewed installer asset, recovered from its separately held offline copy."""
    match = OPERATOR_TOOL_PATH.fullmatch(name) if isinstance(name, str) else None
    size = metadata.get("size") if isinstance(metadata, dict) else None
    require(bucket == "backup-tools" and match is not None
            and isinstance(size, int) and not isinstance(size, bool) and 0 < size <= MAX_OPERATOR_TOOL_BYTES
            and metadata.get("mimetype") == "application/zip", "unreviewed_operator_toolkit")
    return {"bucket": bucket, "name": name, "bytes": size, "sha256": match.group(1)}


class DatabaseSnapshot:
    def __init__(self, connection, folder: Path):
        self.connection = connection
        self.folder = folder
        self.snapshot = ""
        self.independent_operator_tools = []

    def query(self, statement, params=None):
        return self.connection.execute(statement, params).fetchall()

    def command(self, tool: str, *args: str) -> list[str]:
        return [tool, *args, "--no-password"]

    def start(self):
        # Never accept RLS-filtered partial data as a successful backup.
        self.connection.execute("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")
        self.connection.execute("SET LOCAL row_security = off")
        self.connection.execute("SET LOCAL timezone = 'UTC'")
        self.connection.execute("SET LOCAL statement_timeout = '5min'")
        self.connection.execute("SET LOCAL lock_timeout = '15s'")
        unknown = self.query("""SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%%'
            AND NOT (nspname = ANY(%s))""", (list(SCHEMAS + PLATFORM_SCHEMAS),))
        require(not unknown, "unreviewed_database_schema")
        tables = self.query("""SELECT n.nspname, c.relname, c.relkind
            FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname = ANY(%s) AND c.relkind IN ('r','p','m','f')
            ORDER BY n.nspname, c.relname""", (list(SCHEMAS),))
        require(any(schema == "auth" and name == "users" for schema, name, _ in tables), "auth_not_covered")
        require(any(schema == "storage" and name == "objects" for schema, name, _ in tables), "storage_not_covered")
        require(not any(kind == "f" for _, _, kind in tables), "foreign_table_not_supported")
        from psycopg import sql
        for schema, name, kind in tables:
            if kind in ("r", "p"):
                self.connection.execute(sql.SQL("LOCK TABLE {} IN ACCESS SHARE MODE").format(sql.Identifier(schema, name)))
        self.tables = [(schema, name) for schema, name, kind in tables if kind != "p"]
        self.snapshot = self.query("SELECT pg_export_snapshot()")[0][0]
        self.server_version = self.query("SELECT current_setting('server_version')")[0][0]
        schema_args = [f"--schema={name}" for name in SCHEMAS]
        report_progress("export_schema")
        run_tool(self.command("pg_dump", "--schema-only", f"--snapshot={self.snapshot}",
                              *schema_args, f"--file={self.folder / 'schema.sql'}"))
        self.roles()

    def roles(self):
        report_progress("export_roles")
        run_tool(self.command("pg_dumpall", "--roles-only", "--no-role-passwords",
                              f"--file={self.folder / 'roles.sql'}"))

    def sequences(self):
        from psycopg import sql
        result = []
        for schema, name in self.query("""SELECT schemaname, sequencename FROM pg_sequences
                WHERE schemaname = ANY(%s) ORDER BY schemaname, sequencename""", (list(SCHEMAS),)):
            row = self.query(sql.SQL("SELECT last_value, is_called FROM {}").format(sql.Identifier(schema, name)))[0]
            result.append((schema, name, *row))
        return result

    def fingerprint(self) -> str:
        from psycopg import sql
        table_hashes = []
        for schema, name in self.tables:
            # Hash rows inside Postgres, transferring only counts/digests. Buckets
            # bound aggregate memory; ordering is independent of physical row order.
            result = self.query(sql.SQL("""
                WITH rows AS MATERIALIZED (
                    SELECT encode(sha256(convert_to(to_jsonb(t)::text, 'UTF8')), 'hex') AS h FROM {} t
                ), buckets AS (
                    SELECT left(h,2) AS b, count(*) AS n,
                        encode(sha256(convert_to(string_agg(h,'' ORDER BY h COLLATE "C"),'UTF8')),'hex') AS h
                    FROM rows GROUP BY left(h,2)
                ) SELECT coalesce(sum(n),0)::bigint,
                    encode(sha256(convert_to(coalesce(string_agg(b || ':' || n || ':' || h,'|'
                        ORDER BY b COLLATE "C"),''),'UTF8')),'hex') FROM buckets
                """).format(sql.Identifier(schema, name)))[0]
            table_hashes.append((schema, name, *result))
        self.sequence_state = self.sequences()
        self.table_hashes = table_hashes
        self.roles_hash = hashlib.sha256(canonical_sql((self.folder / "roles.sql").read_bytes())).hexdigest()
        return digest_json({"format": FORMAT, "schemas": SCHEMAS, "tables": table_hashes,
                            "sequences": self.sequence_state, "roles": self.roles_hash,
                            "extensions": self.query("SELECT extname, extversion FROM pg_extension ORDER BY extname"),
                            "ddl": hashlib.sha256(canonical_sql((self.folder / "schema.sql").read_bytes())).hexdigest()})

    def inventory(self):
        rows = self.query("""SELECT bucket_id, name, metadata, updated_at::text
            FROM storage.objects ORDER BY bucket_id, name""")
        documents = []
        self.independent_operator_tools = []
        for bucket, name, metadata, updated in rows:
            if bucket == "backup-tools":
                self.independent_operator_tools.append(operator_tool_reference(bucket, name, metadata))
                continue
            require(bucket == "nada-consta", "unreviewed_storage_bucket")
            documents.append({"bucket": bucket, "name": name, "metadata": metadata or {}, "updated_at": updated})
        return documents

    def dump(self):
        report_progress("export_database")
        run_tool(self.command("pg_dump", "--format=custom", "--compress=6",
                              f"--snapshot={self.snapshot}", *[f"--schema={n}" for n in SCHEMAS],
                              f"--file={self.folder / 'database.dump'}"))
        run_tool(["pg_restore", "--list", str(self.folder / "database.dump")])
        self.roles()
        require(self.roles_hash == hashlib.sha256(canonical_sql((self.folder / "roles.sql").read_bytes())).hexdigest(),
                "roles_changed_during_backup")
        report_progress("verify_sequences")
        require(self.sequence_state == self.sequences(), "sequences_changed_during_backup")


def download_storage(inventory: list[dict], folder: Path) -> list[dict]:
    result = []
    for index, entry in enumerate(inventory):
        size = int(entry["metadata"].get("size", -1))
        require(0 <= size <= MAX_OBJECT_BYTES, "unexpected_storage_size")
        relative = f"objects/{index:08d}.pdf"  # Never use untrusted object names as local paths.
        path = folder / relative
        path.parent.mkdir(exist_ok=True)
        url = (os.environ["SUPABASE_URL"].rstrip("/") + "/storage/v1/object/authenticated/" +
               quote(entry["bucket"], safe="") + "/" + quote(entry["name"], safe="/"))
        token = os.environ["BACKUP_STORAGE_READ_TOKEN"]
        # Current opaque secret keys belong only in apikey, not Bearer JWT.
        # Keep compatibility with an existing legacy service-role JWT.
        headers = {"apikey": token}
        if not token.startswith("sb_secret_"):
            headers["Authorization"] = "Bearer " + token
        with safe_request(url, headers=headers) as response, path.open("wb") as output:
            total = 0
            while block := response.read(64 * 1024):
                total += len(block)
                require(total <= size, "storage_content_changed")
                output.write(block)
        require(total == size, "storage_content_changed")
        require(path.read_bytes()[:5] == b"%PDF-", "unexpected_storage_content")
        result.append({**entry, "file": relative, "sha256": digest_file(path), "size": size})
    return result


def validate_lifecycle_rules(rules):
    # B2 maps one native rule into separate S3 expiration, noncurrent-version
    # expiration and orphan-marker rules. Validate effective actions, not count.
    code = "bucket_lifecycle_not_confirmed"
    require(isinstance(rules, list) and 1 <= len(rules) <= 3, code)
    actions = {"hide": 0, "delete": 0, "markers": 0}
    allowed = {"ID", "Status", "Filter", "Prefix", "Expiration", "NoncurrentVersionExpiration"}
    for rule in rules:
        require(isinstance(rule, dict) and set(rule) <= allowed and rule.get("Status") == "Enabled", code)
        require(rule.get("Filter", {"Prefix": rule.get("Prefix", "")}) == {"Prefix": ""}, code)
        require("Prefix" not in rule or rule["Prefix"] == "", code)
        require("Filter" in rule or "Prefix" in rule, code)
        before = sum(actions.values())
        if "Expiration" in rule:
            if rule["Expiration"] == {"Days": 89}:
                actions["hide"] += 1
            else:
                require(rule["Expiration"] == {"ExpiredObjectDeleteMarker": True}, code)
                actions["markers"] += 1
        if "NoncurrentVersionExpiration" in rule:
            require(rule["NoncurrentVersionExpiration"] == {"NoncurrentDays": 1}, code)
            actions["delete"] += 1
        require(sum(actions.values()) > before, code)
    require(actions["hide"] == 1 and actions["delete"] == 1 and actions["markers"] <= 1, code)


class BackupStore:
    def __init__(self, client, bucket: str, source: str):
        self.client, self.bucket = client, bucket
        self.prefix = source + "/"

    def validate(self):
        acl = self.client.get_bucket_acl(Bucket=self.bucket)
        require(all(g["Grantee"].get("Type") != "Group" for g in acl["Grants"]), "bucket_must_be_private")
        lock = self.client.get_object_lock_configuration(Bucket=self.bucket)["ObjectLockConfiguration"]
        require(lock.get("ObjectLockEnabled") == "Enabled" and
                lock.get("Rule", {}).get("DefaultRetention") == {"Mode": "COMPLIANCE", "Days": 90},
                "bucket_retention_must_be_90_days")
        rules = self.client.get_bucket_lifecycle_configuration(Bucket=self.bucket).get("Rules", [])
        validate_lifecycle_rules(rules)

    def stored_bytes(self) -> int:
        # Include hidden/noncurrent versions, not only the visible object list.
        return sum(item["Size"] for page in self.client.get_paginator("list_object_versions").paginate(Bucket=self.bucket)
                   for item in page.get("Versions", []))

    def latest(self) -> dict | None:
        entries = [item for page in self.client.get_paginator("list_objects_v2").paginate(
            Bucket=self.bucket, Prefix=self.prefix + "commits/") for item in page.get("Contents", [])]
        if not entries:
            return None
        newest = max(entries, key=lambda item: item["Key"])
        response = self.client.get_object(Bucket=self.bucket, Key=newest["Key"])
        with response["Body"] as stream:
            require(response["ContentLength"] < 8192, "invalid_backup_commit")
            committed = json.loads(stream.read(8192))
        require(committed.get("key", "").startswith(self.prefix + "archives/"), "invalid_backup_commit")
        head = self.client.head_object(Bucket=self.bucket, Key=committed["key"])
        meta = head.get("Metadata", {})
        require(meta.get("format") == FORMAT and head["ContentLength"] == committed.get("size") and
                all(meta.get(k) for k in ("fingerprint", "created_at", "sha256")), "invalid_previous_backup")
        require(all(meta[k] == committed.get(k) for k in meta), "invalid_backup_commit")
        return {**meta, "key": committed["key"], "size": head["ContentLength"]}

    def upload(self, path: Path, fingerprint: str, now: datetime, used: int) -> dict:
        size = path.stat().st_size
        require(0 < size <= MAX_ARCHIVE_BYTES and used + size + 1_000_000 < MAX_STORED_BYTES, "free_storage_budget_exceeded")
        checksum = digest_file(path)
        key = self.prefix + "archives/" + now.strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex + ".tar.gz.age"
        metadata = {"format": FORMAT, "fingerprint": fingerprint, "created_at": now.isoformat(), "sha256": checksum}
        report_progress("upload_archive")
        with path.open("rb") as stream:
            self.client.put_object(Bucket=self.bucket, Key=key, Body=stream, ContentLength=size,
                                   Metadata=metadata, ContentType="application/octet-stream", ContentMD5=content_md5(stream))
        # Verify uploaded bytes; metadata alone does not prove a complete copy.
        report_progress("verify_upload")
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        with response["Body"] as stream:
            downloaded_hash = hashlib.file_digest(stream, "sha256").hexdigest()
        require(downloaded_hash == checksum, "uploaded_checksum_mismatch")
        # An interrupted or corrupt upload never becomes the last valid backup.
        committed = {**metadata, "key": key, "size": size}
        commit_key = key.replace("/archives/", "/commits/") + ".json"
        report_progress("commit_archive")
        body = json.dumps(committed).encode()
        self.client.put_object(Bucket=self.bucket, Key=commit_key, Body=body,
                               ContentType="application/json", ContentMD5=content_md5(body))
        return {**metadata, "key": key, "size": size}

    def report(self, outcome: str, previous: dict, now: datetime):
        key = self.prefix + "checks/" + now.strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex + ".json"
        body = json.dumps({"checked_at": now.isoformat(), "result": outcome,
                           "completed_at": datetime.now(timezone.utc).isoformat(),
                           "backup_created_at": previous["created_at"], "archive": previous["key"],
                           "bytes": previous["size"], "format": FORMAT}).encode()
        self.client.put_object(Bucket=self.bucket, Key=key, Body=body, ContentType="application/json", ContentMD5=content_md5(body))


def encrypted_snapshot(db, connect, folder: Path, root: Path, fingerprint: str, now: datetime) -> Path:
    report_progress("inventory_documents")
    before = db.inventory()
    db.dump()
    report_progress("export_documents")
    objects = download_storage(before, folder)
    # Fresh transaction checks concurrent deletion/replacement during download.
    report_progress("verify_documents")
    with connect() as current:
        current.execute("BEGIN READ ONLY")
        after = DatabaseSnapshot(current, folder).inventory()
    require(digest_json(before) == digest_json(after), "storage_changed_during_backup")
    manifest = {"format": FORMAT, "created_at": now.isoformat(), "fingerprint": fingerprint,
                "source_id": os.environ["BACKUP_SOURCE_ID"], "server_version": db.server_version,
                "code_revision": os.environ.get("GITHUB_SHA", "local"), "tables": db.table_hashes,
                "schemas": SCHEMAS, "objects": objects,
                "independent_operator_tools": db.independent_operator_tools,
                "files": {p.name: digest_file(p) for p in folder.iterdir() if p.is_file()}}
    (folder / "manifest.json").write_text(json.dumps(manifest, default=str), encoding="utf-8")
    report_progress("package_encrypt")
    archive = root / "backup.tar.gz"
    with tarfile.open(archive, "w:gz") as tar:
        tar.add(folder, arcname="backup")
    encrypted = root / "backup.tar.gz.age"
    run_tool(["age", "--recipient", os.environ["BACKUP_AGE_RECIPIENT"], "--output", str(encrypted), str(archive)])
    return encrypted


def execute_backup(store: BackupStore, connect, now: datetime) -> str:
    report_progress("validate_destination")
    store.validate()
    report_progress("inspect_destination")
    used = store.stored_bytes()
    require(used < MAX_STORED_BYTES, "free_storage_budget_exceeded")
    previous = store.latest()
    with tempfile.TemporaryDirectory(prefix="pronto-backup-") as temp:
        root = Path(temp)
        folder = root / "payload"
        folder.mkdir(mode=0o700)
        with connect() as connection:
            db = DatabaseSnapshot(connection, folder)
            report_progress("open_snapshot")
            db.start()
            report_progress("fingerprint")
            fingerprint = db.fingerprint()
            if not needs_backup(previous, fingerprint, now):
                outcome = "unchanged"
            else:
                encrypted = encrypted_snapshot(db, connect, folder, root, fingerprint, now)
                previous = store.upload(encrypted, fingerprint, now, used)
                outcome = "created"
        # Report success only after integrity verification or verified no-change check.
        report_progress("report_completion")
        store.report(outcome, previous, now)
    return outcome


def main() -> int:
    os.umask(0o077)
    try:
        check_environment()
        report_progress("monitor_start")
        heartbeat("/start")
        import boto3
        from botocore.config import Config
        import psycopg
        client = boto3.client("s3", endpoint_url=os.environ["B2_ENDPOINT"], region_name=os.environ["B2_REGION"],
                              aws_access_key_id=os.environ["B2_KEY_ID"], aws_secret_access_key=os.environ["B2_APPLICATION_KEY"],
                              config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"},
                                            request_checksum_calculation="when_required", response_checksum_validation="when_required"))
        def connect():
            return psycopg.connect(autocommit=True, connect_timeout=20, application_name="pronto-backup")
        with database_tls():
            outcome = execute_backup(BackupStore(client, os.environ["B2_BUCKET"], os.environ["BACKUP_SOURCE_ID"]),
                                     connect, datetime.now(timezone.utc))
        report_progress("monitor_success")
        heartbeat()
        print("Verificação concluída: " + ("nova cópia conferida." if outcome == "created" else "sem mudanças; cópia válida mantida."))
        return 0
    except Exception as error:
        # Provider exceptions may embed credentials, SQL, object paths or personal data.
        code = execution_error_code(error)
        print("Backup não concluído: " + code + ".", file=sys.stderr)
        try:
            heartbeat("/fail")
        except Exception:
            pass
        return 1


if __name__ == "__main__":
    sys.exit(main())
