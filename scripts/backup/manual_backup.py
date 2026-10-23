"""Local encrypted contingency backup; no GitHub, B2 or monitoring dependency."""
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit
import uuid

from run_backup import (BackupError, DatabaseSnapshot, MAX_ARCHIVE_BYTES, database_tls,
                        digest_file, encrypted_snapshot, require)

PROJECT = "vsdkxmpzqwauzotnbdxo"


def connection_fields(uri, password, storage_token, configuration):
    try:
        scheme, separator, remainder = uri.strip().partition("://")
        credentials, at, address = remainder.rpartition("@")
        require(bool(separator and at), "invalid_session_connection")
        parsed = urlsplit(scheme + "://" + credentials.split(":", 1)[0] + "@" + address)
        host, user, port = parsed.hostname or "", unquote(parsed.username or ""), parsed.port
    except ValueError:
        raise BackupError("invalid_session_connection") from None
    require(parsed.scheme in {"postgres", "postgresql"} and
            re.fullmatch(r"[a-z0-9-]+\.pooler\.supabase\.com", host) is not None and
            user == "postgres." + PROJECT and port == 5432 and parsed.path == "/postgres" and
            not parsed.query and not parsed.fragment, "use_production_session_pooler")
    require(bool(password.strip()) and len(password) <= 1024 and "\x00" not in password, "invalid_database_password")
    require(re.fullmatch(r"sb_secret_[A-Za-z0-9_-]{20,512}", storage_token) is not None, "use_server_secret_key")
    require(configuration.get("project_url") == "https://" + PROJECT + ".supabase.co", "unexpected_project")
    require(re.fullmatch(r"age1[0-9a-z]{58}", configuration.get("recipient", "")) is not None,
            "invalid_public_recipient")
    return {"PGHOST": host, "PGUSER": user, "PGPASSWORD": password, "PGPORT": "5432", "PGDATABASE": "postgres",
            "PGSSLMODE": "verify-full", "PGSSLROOTCERT": "system", "BACKUP_SOURCE_ID": "pronto-production",
            "BACKUP_PG_CA_CERT": configuration["ca_certificate"], "BACKUP_AGE_RECIPIENT": configuration["recipient"],
            "SUPABASE_URL": configuration["project_url"], "BACKUP_STORAGE_READ_TOKEN": storage_token,
            "PGOPTIONS": "-c default_transaction_read_only=on -c statement_timeout=300000 -c timezone=UTC"}


@contextmanager
def temporary_environment(fields):
    previous = {name: os.environ.get(name) for name in fields}
    os.environ.update(fields)
    try:
        yield
    finally:
        for name, value in previous.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value


def destination_folder(value):
    path = Path(value).expanduser()
    require(path.is_absolute(), "choose_absolute_destination")
    path = path.resolve()
    require(not any((parent / ".git").exists() for parent in (path, *path.parents)), "destination_must_be_outside_git")
    require(not any(part.lower() in {"public", "wwwroot", "htdocs"} for part in path.parts), "choose_private_destination")
    path.mkdir(parents=True, exist_ok=True)
    require(shutil.disk_usage(path).free >= 256 * 1024 * 1024, "destination_space_insufficient")
    return path


def publish_archive(archive, destination, now, fingerprint):
    require(0 < archive.stat().st_size <= MAX_ARCHIVE_BYTES, "archive_size_not_supported")
    name = "pronto-manual-" + now.strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex + ".tar.gz.age"
    final, partial = destination / name, destination / (name + ".partial")
    checksum = digest_file(archive)
    created = False
    try:
        with archive.open("rb") as source, partial.open("xb") as output:
            created = True
            shutil.copyfileobj(source, output, length=1024 * 1024)
            output.flush()
            os.fsync(output.fileno())
        require(digest_file(partial) == checksum, "local_copy_checksum_mismatch")
        require(not final.exists(), "local_copy_already_exists")
        partial.rename(final)
    finally:
        if created:
            partial.unlink(missing_ok=True)  # Never delete a pre-existing file after an exclusive-open failure.
    receipt = {"format": "pronto-manual-receipt-v1", "archive": name, "sha256": checksum,
               "bytes": final.stat().st_size, "created_at": now.isoformat(),
               "expires_at": (now + timedelta(days=90)).isoformat(), "fingerprint": fingerprint,
               "source_id": "pronto-production", "restoration_tested": False}
    receipt_path = destination / (name + ".json")
    receipt_partial = destination / (name + ".json.partial")
    receipt_created = False
    try:
        with receipt_partial.open("x", encoding="utf-8") as output:
            receipt_created = True
            json.dump(receipt, output)
            output.flush()
            os.fsync(output.fileno())
        require(not receipt_path.exists(), "local_receipt_already_exists")
        receipt_partial.rename(receipt_path)
    finally:
        if receipt_created:
            receipt_partial.unlink(missing_ok=True)
    return receipt


@contextmanager
def private_temporary_directory():
    parent = None
    if os.name == "nt":
        parent = Path.home() / "AppData" / "Local" / "ProntoBackupManual" / "temporarios"
        parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="pronto-manual-", dir=parent) as directory:
        root = Path(directory)
        if os.name == "nt":
            identity = subprocess.run(["whoami", "/user", "/fo", "csv", "/nh"],
                                      stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=15)
            match = re.search(rb"S-1-5-[0-9-]+", identity.stdout)
            require(identity.returncode == 0 and match is not None, "temporary_owner_not_confirmed")
            sid = match.group().decode("ascii")
            permissions = subprocess.run(["icacls", str(root), "/inheritance:r", "/grant:r",
                                           "*" + sid + ":(OI)(CI)F", "*S-1-5-18:(OI)(CI)F",
                                           "*S-1-5-32-544:(OI)(CI)F"],
                                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
            require(permissions.returncode == 0, "temporary_directory_not_private")
        else:
            root.chmod(0o700)
        yield root


def execute_manual(fields, destination, *, connect=None, now=None):
    import psycopg
    now = now or datetime.now(timezone.utc)
    require(now.tzinfo is not None, "timezone_required")
    if connect is None:
        connect = lambda: psycopg.connect(autocommit=True, connect_timeout=20, application_name="pronto-backup-manual")
    with temporary_environment(fields), database_tls(), private_temporary_directory() as root:
        folder = root / "payload"
        folder.mkdir(mode=0o700)
        with connect() as connection:
            db = DatabaseSnapshot(connection, folder)
            db.start()
            estimate = int(db.query("SELECT pg_database_size(current_database())")[0][0])
            require(shutil.disk_usage(root).free > estimate * 4 + 256 * 1024 * 1024, "temporary_space_insufficient")
            fingerprint = db.fingerprint()
            archive = encrypted_snapshot(db, connect, folder, root, fingerprint, now)
            return publish_archive(archive, destination, now, fingerprint)


def verify_tools():
    for tool in ("pg_dump", "pg_dumpall", "pg_restore"):
        result = subprocess.run([tool, "--version"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=15)
        require(result.returncode == 0 and re.search(rb"PostgreSQL\) 17\.", result.stdout) is not None,
                "postgresql_17_tools_required")
    require(shutil.which("age") is not None, "age_tool_missing")
