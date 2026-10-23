"""Synthetic tests only. Production credentials are never used here."""

import contextlib
from datetime import datetime, timedelta, timezone
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import run_backup as backup


NOW = datetime(2026, 10, 23, 12, tzinfo=timezone.utc)


class MemoryStore:
    def __init__(self):
        self.objects = {}
        self.corrupt = False

    def get_bucket_acl(self, **_):
        return {"Grants": [{"Grantee": {"Type": "CanonicalUser"}}]}

    def get_object_lock_configuration(self, **_):
        return {"ObjectLockConfiguration": {"ObjectLockEnabled": "Enabled", "Rule": {
            "DefaultRetention": {"Mode": "COMPLIANCE", "Days": 90}}}}

    def get_bucket_lifecycle_configuration(self, **_):
        return {"Rules": [{"Status": "Enabled", "Filter": {"Prefix": ""},
                           "Expiration": {"Days": 89}, "NoncurrentVersionExpiration": {"NoncurrentDays": 1}}]}

    def get_paginator(self, operation):
        def paginate(**kwargs):
            entries = [{"Key": key, "Size": len(value[0])} for key, value in self.objects.items()
                       if key.startswith(kwargs.get("Prefix", ""))]
            return [{"Versions" if operation == "list_object_versions" else "Contents": entries}]
        return Mock(paginate=paginate)

    def head_object(self, *, Key, **_):
        body, metadata = self.objects[Key]
        return {"ContentLength": len(body), "Metadata": metadata}

    def put_object(self, *, Key, Body, Metadata=None, **_):
        self.objects[Key] = (Body.read() if hasattr(Body, "read") else Body, Metadata or {})

    def get_object(self, *, Key, **_):
        body = self.objects[Key][0]
        if self.corrupt and "/archives/" in Key:
            body = b"corrupted"
        return {"Body": io.BytesIO(body), "ContentLength": len(body)}


class DecisionsTest(unittest.TestCase):
    def test_missing_changed_and_unchanged(self):
        self.assertTrue(backup.needs_backup(None, "a", NOW))
        previous = {"fingerprint": "a", "created_at": (NOW - timedelta(days=1)).isoformat()}
        self.assertFalse(backup.needs_backup(previous, "a", NOW))
        self.assertTrue(backup.needs_backup(previous, "b", NOW))

    def test_renew_before_expiry_even_without_changes(self):
        previous = {"fingerprint": "a", "created_at": (NOW - timedelta(days=80)).isoformat()}
        self.assertTrue(backup.needs_backup(previous, "a", NOW))

    def test_untrusted_timestamp_is_not_no_change(self):
        for date in ("2026-10-23T00:00:00", (NOW + timedelta(days=1)).isoformat()):
            with self.assertRaises(backup.BackupError):
                backup.needs_backup({"fingerprint": "a", "created_at": date}, "a", NOW)

    def test_normalize_only_dump_headers_and_random_tokens(self):
        self.assertEqual(backup.canonical_sql(b"-- time\n\\restrict random\nCREATE TABLE x();\n\\unrestrict random"),
                         b"CREATE TABLE x();")
        self.assertNotEqual(backup.canonical_sql(b"GRANT SELECT ON x TO a;"),
                            backup.canonical_sql(b"REVOKE SELECT ON x FROM a;"))

    def test_source_and_privilege_checks_fail_closed(self):
        with patch.dict(os.environ, {}, clear=True), self.assertRaises(backup.BackupError):
            backup.check_environment()

    def test_database_certificate_requires_public_certificate_not_key(self):
        with patch.dict(os.environ, {"BACKUP_PG_CA_CERT": "synthetic private data"}), \
             self.assertRaisesRegex(backup.BackupError, "invalid_database_ca"):
            with backup.database_tls():
                self.fail("invalid certificate was accepted")


class StoreTest(unittest.TestCase):
    def setUp(self):
        self.client = MemoryStore()
        self.store = backup.BackupStore(self.client, "synthetic", "synthetic-prod")

    def upload(self, content=b"synthetic ciphertext", **kwargs):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "ciphertext.age"
            path.write_bytes(content)
            return self.store.upload(path, "fingerprint", NOW, **{"used": 0, **kwargs})

    def test_upload_commits_only_verified_bytes(self):
        self.assertIsNone(self.store.latest())
        uploaded = self.upload()
        self.assertEqual(self.store.latest(), uploaded)
        self.assertEqual(len(self.client.objects), 2)

    def test_corrupt_upload_does_not_replace_last_valid_copy(self):
        valid = self.upload()
        self.client.corrupt = True
        with self.assertRaisesRegex(backup.BackupError, "uploaded_checksum_mismatch"):
            self.upload(b"second ciphertext")
        self.assertEqual(self.store.latest(), valid)

    def test_orphan_upload_is_not_a_valid_copy(self):
        self.client.put_object(Key="synthetic-prod/archives/orphan.age", Body=b"incomplete")
        self.assertIsNone(self.store.latest())

    def test_capacity_limit_never_deletes_old_copies(self):
        with self.assertRaisesRegex(backup.BackupError, "free_storage_budget_exceeded"):
            self.upload(used=backup.MAX_STORED_BYTES)
        self.assertEqual(self.client.objects, {})

    def test_public_bucket_or_wrong_retention_is_rejected(self):
        self.store.validate()
        self.client.get_bucket_acl = lambda **_: {"Grants": [{"Grantee": {"Type": "Group"}}]}
        with self.assertRaisesRegex(backup.BackupError, "bucket_must_be_private"):
            self.store.validate()

    def test_retention_and_expiration_cannot_be_silently_relaxed(self):
        for days in (1, 89, 91):
            self.client.get_object_lock_configuration = lambda **_: {"ObjectLockConfiguration": {
                "ObjectLockEnabled": "Enabled", "Rule": {"DefaultRetention": {"Mode": "COMPLIANCE", "Days": days}}}}
            with self.assertRaisesRegex(backup.BackupError, "bucket_retention_must_be_90_days"):
                self.store.validate()

    def test_mutated_commit_is_rejected(self):
        self.upload()
        key = next(key for key in self.client.objects if "/commits/" in key)
        value = json.loads(self.client.objects[key][0])
        value["sha256"] = "invalid"
        self.client.objects[key] = (json.dumps(value).encode(), {})
        with self.assertRaisesRegex(backup.BackupError, "invalid_backup_commit"):
            self.store.latest()


class ExecutionTest(unittest.TestCase):
    @patch.object(backup, "DatabaseSnapshot")
    def test_new_copy_records_success_only_after_verified_encrypted_upload(self, db_class):
        def snapshot(connection, folder):
            db = Mock(server_version="17", table_hashes=[])
            db.fingerprint.return_value = "synthetic-fingerprint"
            db.inventory.return_value = []
            db.dump.side_effect = lambda: (folder / "database.dump").write_bytes(b"private synthetic record")
            return db
        db_class.side_effect = snapshot
        def encrypt(command):
            self.assertEqual(command[0], "age")
            Path(command[4]).write_bytes(b"synthetic encrypted archive")
        client = MemoryStore()
        store = backup.BackupStore(client, "synthetic", "synthetic-prod")
        with patch.object(backup, "run_tool", side_effect=encrypt), patch.dict(os.environ, {
                "BACKUP_AGE_RECIPIENT": "synthetic-public-recipient", "BACKUP_SOURCE_ID": "synthetic-prod"}):
            self.assertEqual(backup.execute_backup(store, lambda: contextlib.nullcontext(Mock()), NOW), "created")
        self.assertIsNotNone(store.latest())
        self.assertTrue(any("/checks/" in key for key in client.objects))
        self.assertTrue(all(b"private synthetic record" not in body for body, _ in client.objects.values()))

    @patch.object(backup, "DatabaseSnapshot")
    def test_unchanged_records_check_without_exporting_data(self, db_class):
        db_class.return_value.fingerprint.return_value = "same"
        store = Mock()
        store.stored_bytes.return_value = 0
        store.latest.return_value = {"fingerprint": "same", "created_at": NOW.isoformat(), "key": "archive"}
        connect = lambda: contextlib.nullcontext(Mock())
        result = backup.execute_backup(store, connect, NOW)
        self.assertEqual(result, "unchanged")
        db_class.return_value.dump.assert_not_called()
        store.upload.assert_not_called()
        store.report.assert_called_once()

    @patch.object(backup, "DatabaseSnapshot")
    def test_failed_fingerprint_does_not_mark_success(self, db_class):
        db_class.return_value.fingerprint.side_effect = RuntimeError("synthetic private value")
        store = Mock()
        store.stored_bytes.return_value = 0
        connect = lambda: contextlib.nullcontext(Mock())
        with self.assertRaises(RuntimeError):
            backup.execute_backup(store, connect, NOW)
        store.report.assert_not_called()

    def test_provider_error_is_not_written_to_logs(self):
        with patch.object(backup, "check_environment", side_effect=RuntimeError("synthetic private value")), \
             patch.object(backup, "heartbeat"), patch("sys.stderr", new_callable=io.StringIO) as output:
            self.assertEqual(backup.main(), 1)
            self.assertNotIn("synthetic private value", output.getvalue())
            self.assertIn("execution_failed", output.getvalue())

    def test_paths_from_storage_cannot_escape_temporary_folder(self):
        response = io.BytesIO(b"%PDF-synthetic")
        response.status = 200
        inventory = [{"bucket": "nada-consta", "name": "../../escape.pdf", "metadata": {"size": 14}}]
        with tempfile.TemporaryDirectory() as temp, patch.object(backup, "safe_request", return_value=response), \
             patch.dict(os.environ, {"SUPABASE_URL": "https://synthetic.supabase.co", "BACKUP_STORAGE_READ_TOKEN": "synthetic"}):
            result = backup.download_storage(inventory, Path(temp))
            self.assertEqual(result[0]["file"], "objects/00000000.pdf")
            self.assertTrue((Path(temp) / result[0]["file"]).is_file())

    def test_current_storage_secret_is_api_key_not_bearer_jwt(self):
        inventory = [{"bucket": "nada-consta", "name": "synthetic.pdf", "metadata": {"size": 14}}]
        for token in ("sb_secret_synthetic", "synthetic-legacy-jwt"):
            with self.subTest(current_key=token.startswith("sb_secret_")), tempfile.TemporaryDirectory() as temp, \
                 patch.object(backup, "safe_request", return_value=io.BytesIO(b"%PDF-synthetic")) as request, \
                 patch.dict(os.environ, {"SUPABASE_URL": "https://synthetic.supabase.co", "BACKUP_STORAGE_READ_TOKEN": token}):
                backup.download_storage(inventory, Path(temp))
                headers = request.call_args.kwargs["headers"]
                self.assertEqual(headers["apikey"], token)
                if token.startswith("sb_secret_"):
                    self.assertNotIn("Authorization", headers)
                else:
                    self.assertEqual(headers["Authorization"], "Bearer " + token)

    def test_storage_size_mismatch_fails_before_success(self):
        inventory = [{"bucket": "nada-consta", "name": "synthetic.pdf", "metadata": {"size": 14}}]
        with tempfile.TemporaryDirectory() as temp, patch.object(backup, "safe_request", return_value=io.BytesIO(b"short")), \
             patch.dict(os.environ, {"SUPABASE_URL": "https://synthetic.supabase.co", "BACKUP_STORAGE_READ_TOKEN": "synthetic"}):
            with self.assertRaisesRegex(backup.BackupError, "storage_content_changed"):
                backup.download_storage(inventory, Path(temp))


@unittest.skipUnless(os.environ.get("BACKUP_INTEGRATION") == "1", "requires synthetic local PostgreSQL and age")
class DatabaseIntegrationTest(unittest.TestCase):
    def test_fingerprint_and_archive_cover_mutations_and_snapshot(self):
        import psycopg
        # Explicit loopback only: never inherit production PGHOST/password.
        connect = lambda: psycopg.connect(host="127.0.0.1", port=55432, user="postgres", password="synthetic",
                                          dbname="postgres", sslmode="disable", autocommit=True)
        with connect() as setup:
            setup.execute("CREATE SCHEMA IF NOT EXISTS auth; CREATE SCHEMA IF NOT EXISTS storage;")
            setup.execute("CREATE SCHEMA IF NOT EXISTS supabase_migrations;")
            setup.execute("CREATE TABLE auth.users (id int PRIMARY KEY, status text);")
            setup.execute("CREATE TABLE storage.objects (bucket_id text, name text, metadata jsonb, updated_at timestamptz);")
            setup.execute("CREATE TABLE public.records (id serial PRIMARY KEY, value text);")
            setup.execute("INSERT INTO auth.users VALUES (1,'active'); INSERT INTO public.records(value) VALUES ('initial');")
        def fingerprint():
            with tempfile.TemporaryDirectory() as temp, connect() as conn:
                snapshot = backup.DatabaseSnapshot(conn, Path(temp))
                snapshot.start()
                return snapshot.fingerprint()
        original = fingerprint()
        self.assertEqual(original, fingerprint())
        for statement in ("INSERT INTO public.records(value) VALUES ('new')",
                          "UPDATE public.records SET value='edited' WHERE id=1",
                          "DELETE FROM public.records WHERE id=2",
                          "UPDATE auth.users SET status='blocked' WHERE id=1",
                          "ALTER TABLE public.records ENABLE ROW LEVEL SECURITY",
                          "CREATE POLICY sample ON public.records USING (true)",
                          "GRANT SELECT ON public.records TO PUBLIC",
                          "SELECT nextval('public.records_id_seq')"):
            with connect() as conn:
                conn.execute(statement)
            changed = fingerprint()
            self.assertNotEqual(original, changed)
            original = changed
        with tempfile.TemporaryDirectory() as temp, connect() as conn:
            folder = Path(temp)
            db = backup.DatabaseSnapshot(conn, folder)
            db.start()
            db.fingerprint()
            with connect() as concurrent:
                concurrent.execute("UPDATE public.records SET value='after snapshot' WHERE id=1")
            db.dump()
            backup.run_tool(["pg_restore", "--file=" + str(folder / "restored.sql"), str(folder / "database.dump")])
            restored = (folder / "restored.sql").read_text()
            self.assertIn("edited", restored)
            self.assertNotIn("after snapshot", restored)
            with connect() as setup:
                setup.execute("CREATE DATABASE backup_restored")
            backup.run_tool(["pg_restore", "--exit-on-error", "--clean", "--if-exists", "--dbname=backup_restored", str(folder / "database.dump")])
            with psycopg.connect(host="127.0.0.1", port=55432, user="postgres", password="synthetic",
                                  dbname="backup_restored", sslmode="disable", autocommit=True) as restored_db:
                self.assertEqual(restored_db.execute("SELECT value FROM public.records WHERE id=1").fetchone()[0], "edited")
                self.assertEqual(restored_db.execute("SELECT status FROM auth.users WHERE id=1").fetchone()[0], "blocked")
                self.assertTrue(restored_db.execute("SELECT relrowsecurity FROM pg_class WHERE oid='public.records'::regclass").fetchone()[0])
            # Test actual encryption/decryption with disposable synthetic identity.
            backup.run_tool(["age-keygen", "-o", str(folder / "identity")])
            public = subprocess_public_recipient(folder / "identity")
            backup.run_tool(["age", "-r", public, "-o", str(folder / "dump.age"), str(folder / "database.dump")])
            backup.run_tool(["age", "-d", "-i", str(folder / "identity"), "-o", str(folder / "decoded.dump"), str(folder / "dump.age")])
            self.assertEqual(backup.digest_file(folder / "decoded.dump"), backup.digest_file(folder / "database.dump"))


def subprocess_public_recipient(identity):
    import subprocess
    return subprocess.check_output(["age-keygen", "-y", str(identity)], stderr=subprocess.DEVNULL).decode().strip()


if __name__ == "__main__":
    unittest.main()
