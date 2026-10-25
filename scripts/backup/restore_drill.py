"""Read-only B2 retrieval and a disposable offline PostgreSQL recovery drill.
Never log credentials, decrypted SQL, object names, table names or row values.
"""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import tarfile
import time
from urllib.parse import quote, urlsplit
import uuid

from manual_backup import private_temporary_directory
from provision_b2 import BUCKET, b2_call
from run_backup import BackupError, FORMAT, MAX_ARCHIVE_BYTES, SCHEMAS, canonical_sql, digest_file, require, safe_request

IMAGE = "supabase/postgres@sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00"
PREFIX = "pronto-production/"
READER_CAPABILITIES = ["listFiles", "readFiles"]
MAX_UNPACKED = 2_000_000_000
IDENTITY = re.compile(r"AGE-SECRET-KEY-1[0-9A-Z]{58}")


def local_command(arguments, *, data=None, timeout=180, code="local_drill_command_failed"):
    result = subprocess.run([str(value) for value in arguments], input=data, stdout=subprocess.PIPE,
                            stderr=subprocess.DEVNULL, timeout=timeout,
                            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    require(result.returncode == 0, code)
    return result.stdout


def authorize(identifier, credential):
    return b2_call("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", basic=identifier + ":" + credential)


@contextmanager
def temporary_reader(identifier, credential):
    master = authorize(identifier, credential)
    api, token, account = master["apiUrl"], master["authorizationToken"], master["accountId"]
    buckets = b2_call(api + "/b2api/v2/b2_list_buckets", token=token,
                      data={"accountId": account, "bucketName": BUCKET})["buckets"]
    require(len(buckets) == 1 and buckets[0].get("bucketName") == BUCKET and
            buckets[0].get("bucketType") == "allPrivate", "private_backup_bucket_required")
    child = b2_call(api + "/b2api/v2/b2_create_key", token=token, data={
        "accountId": account, "bucketId": buckets[0]["bucketId"], "namePrefix": PREFIX,
        "keyName": "pronto-ensaio-" + uuid.uuid4().hex, "capabilities": READER_CAPABILITIES,
        "validDurationInSeconds": 3600})
    try:
        require(set(child.get("capabilities", [])) == set(READER_CAPABILITIES) and
                child.get("bucketId") == buckets[0]["bucketId"] and child.get("namePrefix") == PREFIX,
                "temporary_reader_scope_not_confirmed")
        reader = authorize(child["applicationKeyId"], child["applicationKey"])
        yield reader, buckets[0]["bucketId"]
    finally:
        # Revoke only the child credential returned by this exact operation.
        try:
            b2_call(api + "/b2api/v2/b2_delete_key", token=token,
                    data={"applicationKeyId": child["applicationKeyId"]})
        except Exception:
            raise BackupError("temporary_reader_revocation_not_confirmed") from None
        child.clear()
        master.clear()


def download_url(reader, name):
    base = reader["downloadUrl"].rstrip("/")
    parsed = urlsplit(base)
    require(parsed.scheme == "https" and parsed.hostname and parsed.hostname.endswith(".backblazeb2.com") and
            not parsed.username and not parsed.password and parsed.port in (None, 443) and not parsed.query,
            "unexpected_b2_download_origin")
    require(name.startswith(PREFIX), "unexpected_backup_prefix")
    return base + "/file/" + BUCKET + "/" + quote(name, safe="/")


def download_latest(reader, bucket_id, folder):
    entries, start = [], None
    while True:
        parameters = {"bucketId": bucket_id, "prefix": PREFIX + "commits/", "maxFileCount": 1000}
        if start:
            parameters["startFileName"] = start
        page = b2_call(reader["apiUrl"] + "/b2api/v2/b2_list_file_names", token=reader["authorizationToken"], data=parameters)
        entries.extend(item["fileName"] for item in page.get("files", []))
        require(len(entries) <= 10000, "backup_inventory_limit_reached")
        following = page.get("nextFileName")
        if not following:
            break
        require(following != start, "backup_inventory_not_advancing")
        start = following
    require(entries, "completed_backup_not_found")
    name = max(entries)
    require(re.fullmatch(re.escape(PREFIX) + r"commits/\d{8}T\d{6}-[0-9a-f]{32}\.tar\.gz\.age\.json", name),
            "unexpected_completion_marker")
    headers = {"Authorization": reader["authorizationToken"]}
    with safe_request(download_url(reader, name), headers=headers) as response:
        raw = response.read(8193)
    require(len(raw) <= 8192, "completion_marker_too_large")
    receipt = json.loads(raw)
    require(receipt.get("format") == FORMAT and receipt.get("key") == name.replace("/commits/", "/archives/")[:-5],
            "completion_marker_not_valid")
    require(isinstance(receipt.get("size"), int) and 0 < receipt["size"] <= MAX_ARCHIVE_BYTES and
            re.fullmatch(r"[0-9a-f]{64}", receipt.get("sha256", "")), "completion_marker_not_valid")
    output = folder / "download.age"
    size, checksum = 0, hashlib.sha256()
    with safe_request(download_url(reader, receipt["key"]), headers=headers) as response, output.open("xb") as stream:
        while block := response.read(1024 * 1024):
            size += len(block)
            require(size <= receipt["size"], "download_size_mismatch")
            checksum.update(block)
            stream.write(block)
    require(size == receipt["size"] and checksum.hexdigest() == receipt["sha256"], "download_checksum_mismatch")
    return output, receipt


def unpack_verified(archive, destination, receipt):
    destination.mkdir(mode=0o700)
    with tarfile.open(archive, "r:gz") as package:
        members, names, total = [], set(), 0
        for member in package:
            path = PurePosixPath(member.name)
            require(len(members) < 20000 and not path.is_absolute() and path.parts and path.parts[0] == "backup" and
                    ".." not in path.parts and "\\" not in member.name and ":" not in member.name and
                    (member.isdir() or member.isfile()), "unsafe_backup_archive")
            normalized = str(path).casefold()
            require(normalized not in names, "duplicate_backup_archive_path")
            names.add(normalized)
            total += member.size
            require(0 <= total <= MAX_UNPACKED, "backup_archive_too_large")
            members.append((member, path))
        for member, path in members:
            target = destination.joinpath(*path.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with package.extractfile(member) as source, target.open("xb") as output:
                    import shutil
                    shutil.copyfileobj(source, output, length=1024 * 1024)
    root = destination / "backup"
    manifest_path = root / "manifest.json"
    require(manifest_path.stat().st_size <= 8 * 1024 * 1024, "backup_manifest_too_large")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    require(manifest.get("format") == FORMAT and manifest.get("source_id") == "pronto-production" and
            manifest.get("fingerprint") == receipt.get("fingerprint") and manifest.get("created_at") == receipt.get("created_at") and
            manifest.get("schemas") == list(SCHEMAS), "backup_manifest_not_valid")
    files = manifest.get("files", {})
    require(set(files) == {"database.dump", "roles.sql", "schema.sql"}, "backup_coverage_not_confirmed")
    expected = {"manifest.json", *files}
    for name, checksum in files.items():
        require(digest_file(root / name) == checksum, "backup_file_checksum_mismatch")
    for item in manifest.get("objects", []):
        name = item.get("file", "")
        require(re.fullmatch(r"objects/\d{8}\.pdf", name) and name not in expected, "unsafe_document_path")
        require((root / name).stat().st_size == item.get("size") and digest_file(root / name) == item.get("sha256"),
                "document_checksum_mismatch")
        expected.add(name)
    require({str(p.relative_to(root)).replace("\\", "/") for p in root.rglob("*") if p.is_file()} == expected,
            "unexpected_backup_files")
    return root, manifest


def identifier(value):
    require(isinstance(value, str) and "\x00" not in value and 0 < len(value) <= 63, "invalid_database_identifier")
    return '"' + value.replace('"', '""') + '"'


class OfflineDatabase:
    def __init__(self):
        self.session = uuid.uuid4().hex
        self.container = None
        self.cleaned = False

    def command(self, *arguments, data=None, timeout=180, code="offline_database_command_failed"):
        require(self.container and re.fullmatch(r"[0-9a-f]{64}", self.container), "owned_container_required")
        return local_command(["docker", "exec", "-i", "--user", "100:101", self.container, *arguments],
                             data=data, timeout=timeout, code=code)

    def sql(self, statement):
        return self.command("psql", "-XAtq", "-h", "/restore/socket", "-U", "pronto_drill_owner", "-d", "postgres",
                            "--set", "ON_ERROR_STOP=1", "--command", statement)

    def __enter__(self):
        # --pull never ensures no network is used after private material is opened.
        output = local_command(["docker", "run", "-d", "--pull", "never", "--network", "none", "--read-only",
            "--user", "100:101", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--log-driver", "none",
            "--pids-limit", "128", "--memory", "3g", "--cpus", "2", "--label", "pronto.restore.session=" + self.session,
            "--tmpfs", "/restore:rw,size=2147483648,uid=100,gid=101,mode=0700",
            "--tmpfs", "/tmp:rw,size=67108864,uid=100,gid=101,mode=0700", "--entrypoint", "/bin/sh", IMAGE,
            "-c", "mkdir /restore/socket && initdb -D /restore/data -U pronto_drill_owner --auth-local=trust --auth-host=reject >/dev/null 2>&1 && "
            "exec postgres -D /restore/data -k /restore/socket -c listen_addresses='' -c shared_preload_libraries='' "
            "-c max_worker_processes=0 -c autovacuum=off -c max_connections=10 -c shared_buffers=64MB "
            "-c logging_collector=off -c log_statement=none -c log_min_error_statement=panic -c timezone=UTC"],
            code="offline_database_not_started")
        self.container = output.decode("ascii").strip()
        try:
            self.check_isolation()
            deadline = time.monotonic() + 90
            while time.monotonic() < deadline:
                try:
                    self.sql("SELECT 1")
                    break
                except BackupError:
                    time.sleep(1)
            else:
                raise BackupError("offline_database_not_ready")
            return self
        except Exception:
            self.cleanup()
            raise

    def check_isolation(self):
        details = json.loads(local_command(["docker", "inspect", "--format", "{{json .HostConfig}}", self.container]))
        require(details.get("NetworkMode") == "none" and not details.get("PortBindings") and not details.get("Binds") and
                details.get("ReadonlyRootfs") is True and details.get("LogConfig", {}).get("Type") == "none" and
                "ALL" in details.get("CapDrop", []) and "no-new-privileges" in details.get("SecurityOpt", []),
                "container_isolation_not_confirmed")
        labels = json.loads(local_command(["docker", "inspect", "--format", "{{json .Config.Labels}}", self.container]))
        require(labels.get("pronto.restore.session") == self.session, "container_ownership_not_confirmed")

    def cleanup(self):
        if self.container:
            self.check_isolation()
            local_command(["docker", "rm", "-f", self.container], code="offline_database_cleanup_failed")
            self.cleaned = True
            self.container = None

    def __exit__(self, *_):
        self.cleanup()

    def restore(self, root, manifest):
        # Never execute the privileged global role dump. Recreate names with no
        # login or elevated attributes; the isolated verifier uses its own owner.
        roles = re.findall(r'^CREATE ROLE ("(?:[^"]|"")+"|[a-zA-Z_][a-zA-Z0-9_$]*);$',
                           (root / "roles.sql").read_text(encoding="utf-8"), re.MULTILINE)
        require(len(roles) <= 1000, "role_inventory_too_large")
        for role in roles:
            name = role[1:-1].replace('""', '"') if role.startswith('"') else role
            require(name != "pronto_drill_owner", "restore_role_collision")
            literal = "'" + name.replace("'", "''") + "'"
            exists = self.sql("SELECT EXISTS (SELECT FROM pg_roles WHERE rolname=" + literal + ")").strip()
            require(exists in {b"t", b"f"}, "role_inventory_not_valid")
            if exists == b"f":
                self.sql("CREATE ROLE " + identifier(name) + " NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS")
        self.sql('CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; '
                 'CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions;')
        with (root / "database.dump").open("rb") as source:
            transfer = subprocess.run(["docker", "exec", "-i", "--user", "100:101", self.container,
                "/bin/sh", "-c", "cat > /restore/database.dump"], stdin=source, stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL, timeout=180, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        require(transfer.returncode == 0, "offline_archive_transfer_failed")
        for section in ("pre-data", "data", "post-data"):
            arguments = ["pg_restore", "--exit-on-error", "--section=" + section, "-h", "/restore/socket",
                         "-U", "pronto_drill_owner", "-d", "postgres"]
            if section == "pre-data":
                arguments += ["--clean", "--if-exists"]
            if section == "data":
                arguments += ["--disable-triggers"]
            self.command(*arguments, "/restore/database.dump", timeout=600, code="restore_" + section.replace("-", "_") + "_failed")
            if section == "pre-data":
                # A clean partial restore recreates public without initdb's
                # default USAGE. Reestablish that baseline before post-data
                # applies the source ACLs, including any explicit revocations.
                self.sql('GRANT USAGE ON SCHEMA public TO PUBLIC')
        # pg_restore classifies schema ACLs with pre-data. Reapply the public
        # ACL from the archive after the baseline correction, preserving source
        # revocations rather than weakening them in the disposable database.
        toc = self.command("pg_restore", "--list", "/restore/database.dump").decode("utf-8")
        public_acl = [line for line in toc.splitlines()
                      if re.match(r"^\d+; \d+ \d+ ACL - SCHEMA public ", line)]
        require(len(public_acl) <= 1, "public_schema_acl_not_valid")
        if public_acl:
            self.command("/bin/sh", "-c", "cat > /restore/public-acl.list",
                         data=(public_acl[0] + "\n").encode("utf-8"))
            self.command("pg_restore", "--exit-on-error", "--use-list=/restore/public-acl.list",
                         "-h", "/restore/socket", "-U", "pronto_drill_owner", "-d", "postgres",
                         "/restore/database.dump", code="restore_public_acl_failed")
        checks = 0
        for schema, table, count, checksum in manifest["tables"]:
            require(schema in SCHEMAS and isinstance(count, int) and re.fullmatch(r"[0-9a-f]{64}", checksum),
                    "invalid_table_manifest")
            relation = identifier(schema) + "." + identifier(table)
            statement = """WITH rows AS MATERIALIZED (
                SELECT encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex') AS h FROM RELATION t
            ), buckets AS (SELECT left(h,2) AS b,count(*) AS n,
                encode(sha256(convert_to(string_agg(h,'' ORDER BY h COLLATE "C"),'UTF8')),'hex') AS h
                FROM rows GROUP BY left(h,2))
            SELECT json_build_array(coalesce(sum(n),0)::bigint,
                encode(sha256(convert_to(coalesce(string_agg(b || ':' || n || ':' || h,'|' ORDER BY b COLLATE "C"),''),'UTF8')),'hex'))
                FROM buckets""".replace("RELATION", relation)
            actual = json.loads(self.sql(statement))
            require(actual == [count, checksum], "restored_table_checksum_mismatch")
            checks += 1
        require(checks > 0, "restored_tables_not_confirmed")
        self.command("pg_dump", "--schema-only", *["--schema=" + schema for schema in SCHEMAS],
                     "-h", "/restore/socket", "-U", "pronto_drill_owner", "-d", "postgres", "--file=/restore/schema.sql")
        restored_schema = self.command("cat", "/restore/schema.sql")
        require(canonical_sql(restored_schema) == canonical_sql((root / "schema.sql").read_bytes()), "restored_schema_not_identical")
        return checks


def execute_drill(master_id, master_key, identity, progress=lambda _: None):
    require(IDENTITY.fullmatch(identity.strip()), "native_recovery_identity_required")
    start = time.monotonic()
    with private_temporary_directory() as folder:
        progress("download")
        with temporary_reader(master_id.strip(), master_key.strip()) as (reader, bucket_id):
            archive, receipt = download_latest(reader, bucket_id, folder)
        progress("decrypt")
        plain = folder / "backup.tar.gz"
        local_command(["age", "--decrypt", "--identity", "-", "--output", plain, archive],
                      data=(identity.strip() + "\n").encode("ascii"), code="backup_decryption_failed")
        progress("verify_package")
        root, manifest = unpack_verified(plain, folder / "unpacked", receipt)
        progress("restore")
        with OfflineDatabase() as database:
            tables = database.restore(root, manifest)
        require(database.cleaned, "offline_database_cleanup_not_confirmed")
        progress("cleanup")
        created = datetime.fromisoformat(receipt["created_at"])
        require(created.tzinfo is not None, "backup_time_not_valid")
        result = {"format": "pronto-restore-drill-v1", "completed_at": datetime.now(timezone.utc).isoformat(),
                  "archive_sha256": receipt["sha256"], "backup_created_at": created.isoformat(),
                  "duration_seconds": round(time.monotonic() - start, 1), "tables_verified": tables,
                  "documents_verified": len(manifest.get("objects", [])), "schema_identical": True,
                  "container_removed": True, "temporary_reader_revoked": True,
                  "production_modified": False, "daily_schedule_enabled": False,
                  "role_login_and_elevated_attributes_restored": False,
                  "auth_service_login_tested": False, "alert_delivery_tested": False}
    return result
