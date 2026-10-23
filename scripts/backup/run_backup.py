"""Independent, read-only Supabase backup. Never print provider exception details.

Requires PostgreSQL 17 tools, age and requirements.txt. Secrets come only from the
execution environment; this program never loads dotenv files or writes credentials.
"""

from __future__ import annotations

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


class BackupError(Exception):
    """Message must be a static, non-sensitive diagnostic code."""


def require(condition: bool, code: str) -> None:
    if not condition:
        raise BackupError(code)


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
    # Passwords are inherited through PG* environment fields, never command args.
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL,
                   stderr=subprocess.DEVNULL, timeout=900)


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


class DatabaseSnapshot:
    def __init__(self, connection, folder: Path):
        self.connection = connection
        self.folder = folder
        self.snapshot = ""

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
        run_tool(self.command("pg_dump", "--schema-only", f"--snapshot={self.snapshot}",
                              *schema_args, f"--file={self.folder / 'schema.sql'}"))
        self.roles()

    def roles(self):
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
        require(all(bucket == "nada-consta" for bucket, _, _, _ in rows), "unreviewed_storage_bucket")
        return [{"bucket": bucket, "name": name, "metadata": metadata or {}, "updated_at": updated}
                for bucket, name, metadata, updated in rows]

    def dump(self):
        run_tool(self.command("pg_dump", "--format=custom", "--compress=6",
                              f"--snapshot={self.snapshot}", *[f"--schema={n}" for n in SCHEMAS],
                              f"--file={self.folder / 'database.dump'}"))
        run_tool(["pg_restore", "--list", str(self.folder / "database.dump")])
        self.roles()
        require(self.roles_hash == hashlib.sha256(canonical_sql((self.folder / "roles.sql").read_bytes())).hexdigest(),
                "roles_changed_during_backup")
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
        # One dedicated bucket: hide at 89 days, delete old versions after one day.
        require(len(rules) == 1 and rules[0].get("Status") == "Enabled" and
                rules[0].get("Filter", {"Prefix": rules[0].get("Prefix", "")}) == {"Prefix": ""} and
                rules[0].get("Expiration") == {"Days": 89} and
                rules[0].get("NoncurrentVersionExpiration") == {"NoncurrentDays": 1}, "bucket_lifecycle_not_confirmed")

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
        with path.open("rb") as stream:
            self.client.put_object(Bucket=self.bucket, Key=key, Body=stream, ContentLength=size,
                                   Metadata=metadata, ContentType="application/octet-stream")
        # Verify uploaded bytes; metadata alone does not prove a complete copy.
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        with response["Body"] as stream:
            downloaded_hash = hashlib.file_digest(stream, "sha256").hexdigest()
        require(downloaded_hash == checksum, "uploaded_checksum_mismatch")
        # An interrupted or corrupt upload never becomes the last valid backup.
        committed = {**metadata, "key": key, "size": size}
        commit_key = key.replace("/archives/", "/commits/") + ".json"
        self.client.put_object(Bucket=self.bucket, Key=commit_key, Body=json.dumps(committed).encode(),
                               ContentType="application/json")
        return {**metadata, "key": key, "size": size}

    def report(self, outcome: str, previous: dict, now: datetime):
        key = self.prefix + "checks/" + now.strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex + ".json"
        body = json.dumps({"checked_at": now.isoformat(), "result": outcome,
                           "completed_at": datetime.now(timezone.utc).isoformat(),
                           "backup_created_at": previous["created_at"], "archive": previous["key"],
                           "bytes": previous["size"], "format": FORMAT}).encode()
        self.client.put_object(Bucket=self.bucket, Key=key, Body=body, ContentType="application/json")


def execute_backup(store: BackupStore, connect, now: datetime) -> str:
    store.validate()
    used = store.stored_bytes()
    require(used < MAX_STORED_BYTES, "free_storage_budget_exceeded")
    previous = store.latest()
    with tempfile.TemporaryDirectory(prefix="pronto-backup-") as temp:
        root = Path(temp)
        folder = root / "payload"
        folder.mkdir(mode=0o700)
        with connect() as connection:
            db = DatabaseSnapshot(connection, folder)
            db.start()
            fingerprint = db.fingerprint()
            if not needs_backup(previous, fingerprint, now):
                outcome = "unchanged"
            else:
                before = db.inventory()
                db.dump()
                objects = download_storage(before, folder)
                # Fresh transaction checks concurrent deletion/replacement during download.
                with connect() as current:
                    current.execute("BEGIN READ ONLY")
                    after = DatabaseSnapshot(current, folder).inventory()
                require(digest_json(before) == digest_json(after), "storage_changed_during_backup")
                manifest = {"format": FORMAT, "created_at": now.isoformat(), "fingerprint": fingerprint,
                            "source_id": os.environ["BACKUP_SOURCE_ID"], "server_version": db.server_version,
                            "code_revision": os.environ.get("GITHUB_SHA", "local"), "tables": db.table_hashes,
                            "schemas": SCHEMAS, "objects": objects,
                            "files": {p.name: digest_file(p) for p in folder.iterdir() if p.is_file()}}
                (folder / "manifest.json").write_text(json.dumps(manifest, default=str), encoding="utf-8")
                archive = root / "backup.tar.gz"
                with tarfile.open(archive, "w:gz") as tar:
                    tar.add(folder, arcname="backup")
                encrypted = root / "backup.tar.gz.age"
                run_tool(["age", "--recipient", os.environ["BACKUP_AGE_RECIPIENT"], "--output", str(encrypted), str(archive)])
                previous = store.upload(encrypted, fingerprint, now, used)
                outcome = "created"
        # Report success only after integrity verification or verified no-change check.
        store.report(outcome, previous, now)
    return outcome


def main() -> int:
    os.umask(0o077)
    try:
        check_environment()
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
        heartbeat()
        print("Verificação concluída: " + ("nova cópia conferida." if outcome == "created" else "sem mudanças; cópia válida mantida."))
        return 0
    except Exception as error:
        # Provider exceptions may embed credentials, SQL, object paths or personal data.
        code = str(error) if isinstance(error, BackupError) else "execution_failed"
        print("Backup não concluído: " + code + ".", file=sys.stderr)
        try:
            heartbeat("/fail")
        except Exception:
            pass
        return 1


if __name__ == "__main__":
    sys.exit(main())
