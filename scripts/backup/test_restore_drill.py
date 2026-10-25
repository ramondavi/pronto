"""Recovery drill tests; no real credentials or production records."""
from datetime import datetime, timezone
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

import restore_drill as drill
import run_backup as backup

NOW = datetime(2026, 10, 24, tzinfo=timezone.utc)


def package(folder, extra=None):
    receipt = {"format": backup.FORMAT, "created_at": NOW.isoformat(), "fingerprint": "synthetic"}
    files = {"database.dump": b"synthetic-dump", "roles.sql": b"synthetic-roles", "schema.sql": b"synthetic-schema"}
    manifest = {**receipt, "source_id": "pronto-production", "schemas": list(backup.SCHEMAS), "objects": [],
                "tables": [], "files": {name: drill.hashlib.sha256(body).hexdigest() for name, body in files.items()}}
    files["manifest.json"] = json.dumps(manifest).encode()
    archive = folder / "synthetic.tar.gz"
    with tarfile.open(archive, "w:gz") as output:
        for name, body in files.items():
            member = tarfile.TarInfo("backup/" + name)
            member.size = len(body)
            output.addfile(member, io.BytesIO(body))
        if extra is not None:
            output.addfile(extra, io.BytesIO(b""))
    return archive, receipt


class ArchiveTest(unittest.TestCase):
    def test_valid_package_checks_complete_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            archive, receipt = package(folder)
            root, manifest = drill.unpack_verified(archive, folder / "out", receipt)
            self.assertEqual((root / "database.dump").read_bytes(), b"synthetic-dump")
            self.assertEqual(manifest["source_id"], "pronto-production")

    def test_untrusted_paths_links_and_duplicates_are_rejected(self):
        for name, kind in [("../escape", tarfile.REGTYPE), ("/backup/escape", tarfile.REGTYPE),
                           ("backup/../../escape", tarfile.REGTYPE), ("backup\\escape", tarfile.REGTYPE),
                           ("backup/C:escape", tarfile.REGTYPE), ("backup/link", tarfile.SYMTYPE),
                           ("backup/DATABASE.DUMP", tarfile.REGTYPE)]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)
                extra = tarfile.TarInfo(name)
                extra.type = kind
                extra.linkname = "/outside"
                archive, receipt = package(folder, extra)
                with self.assertRaises(backup.BackupError):
                    drill.unpack_verified(archive, folder / "out", receipt)
                self.assertFalse((folder / "escape").exists())

    def test_manifest_must_match_the_completed_backup(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            archive, receipt = package(folder)
            receipt["fingerprint"] = "other-synthetic"
            with self.assertRaisesRegex(backup.BackupError, "manifest_not_valid"):
                drill.unpack_verified(archive, folder / "out", receipt)

    def test_unpacked_size_limit_is_enforced_before_writing_payload(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            archive, receipt = package(folder)
            with patch.object(drill, "MAX_UNPACKED", 1), self.assertRaisesRegex(backup.BackupError, "too_large"):
                drill.unpack_verified(archive, folder / "out", receipt)
            self.assertEqual(list((folder / "out").iterdir()), [])

    def test_provider_download_origin_must_be_vendor_https(self):
        for origin in ("http://f005.backblazeb2.com", "https://example.org", "https://f005.backblazeb2.com:444"):
            with self.subTest(origin=origin), self.assertRaises(backup.BackupError):
                drill.download_url({"downloadUrl": origin}, "pronto-production/archives/synthetic")




class SchemaDiagnosticTest(unittest.TestCase):
    def test_diagnostic_contains_only_fixed_categories_and_counts(self):
        source = b"CREATE FUNCTION private_name() RETURNS text;\nGRANT SELECT ON private_table TO private_role;\n"
        restored = b"CREATE FUNCTION other_private_name() RETURNS text;\n"
        error = drill.SchemaComparisonError(source, restored)
        report = json.dumps(error.diagnostics)
        for value in ("private_name", "private_table", "private_role", "CREATE", "GRANT"):
            self.assertNotIn(value, report)
        self.assertEqual(error.diagnostics["categories"]["permissions"]["source_only"], 1)
        self.assertEqual(str(error), "restored_schema_not_identical")

    def test_order_difference_does_not_hide_mismatch(self):
        report = drill.schema_diagnostics(b"SET x=1;\nSET y=2;", b"SET y=2;\nSET x=1;")
        self.assertTrue(report["same_lines_different_order"])


class DownloadTest(unittest.TestCase):
    def test_completed_copy_download_and_checksum_reject_corruption(self):
        key = drill.PREFIX + "archives/20261024T000000-" + "a" * 32 + ".tar.gz.age"
        name = key.replace("/archives/", "/commits/") + ".json"
        payload = b"synthetic encrypted bytes"
        receipt = {"format": backup.FORMAT, "key": key, "size": len(payload),
                   "sha256": drill.hashlib.sha256(payload).hexdigest()}
        reader = {"apiUrl": "https://api005.backblazeb2.com", "downloadUrl": "https://f005.backblazeb2.com",
                  "authorizationToken": "synthetic-reader"}
        for body in (payload, b"X" * len(payload)):
            with self.subTest(corrupt=body != payload), tempfile.TemporaryDirectory() as directory:
                with patch.object(drill, "b2_call", return_value={"files": [{"fileName": name}]}), \
                     patch.object(drill, "safe_request", side_effect=[io.BytesIO(json.dumps(receipt).encode()), io.BytesIO(body)]):
                    if body != payload:
                        with self.assertRaisesRegex(backup.BackupError, "download_checksum_mismatch"):
                            drill.download_latest(reader, "synthetic-bucket", Path(directory))
                    else:
                        archive, actual = drill.download_latest(reader, "synthetic-bucket", Path(directory))
                        self.assertEqual(archive.read_bytes(), payload)
                        self.assertEqual(actual, receipt)


class TemporaryReaderTest(unittest.TestCase):
    @patch("restore_drill.b2_call")
    def test_only_new_readonly_scoped_child_is_revoked_even_after_failure(self, call):
        call.side_effect = [
            {"apiUrl": "https://api005.backblazeb2.com", "accountId": "synthetic-account", "authorizationToken": "synthetic-master"},
            {"buckets": [{"bucketId": "synthetic-bucket", "bucketName": "pronto-backups", "bucketType": "allPrivate"}]},
            {"bucketId": "synthetic-bucket", "namePrefix": drill.PREFIX, "capabilities": ["listFiles", "readFiles"],
             "applicationKeyId": "synthetic-created-reader", "applicationKey": "synthetic-reader-key"},
            {"authorizationToken": "synthetic-reader"}, {},
        ]
        with self.assertRaisesRegex(RuntimeError, "synthetic failure"):
            with drill.temporary_reader("synthetic-id", "synthetic-key"):
                raise RuntimeError("synthetic failure")
        creation = call.call_args_list[2].kwargs["data"]
        self.assertEqual(creation["capabilities"], ["listFiles", "readFiles"])
        self.assertEqual(creation["namePrefix"], drill.PREFIX)
        self.assertEqual(creation["validDurationInSeconds"], 3600)
        self.assertEqual(call.call_args_list[-1].kwargs["data"], {"applicationKeyId": "synthetic-created-reader"})

    def test_role_identifiers_are_quoted_without_executing_role_dump(self):
        self.assertEqual(drill.identifier('synthetic"name'), '"synthetic""name"')
        with self.assertRaises(backup.BackupError):
            drill.identifier("synthetic\x00name")


@unittest.skipUnless(os.environ.get("BACKUP_DOCKER_INTEGRATION") == "1", "explicit offline Docker fixture required")
class OfflineIntegrationTest(unittest.TestCase):
    def test_real_synthetic_archive_is_restored_verified_and_removed(self):
        self.exercise()

    def test_source_public_usage_revocation_is_preserved(self):
        self.exercise(revoke_public=True)

    def test_equivalent_source_format_is_compared_in_an_empty_reference_database(self):
        self.exercise(reformat_source=True)

    def test_reference_comparison_preserves_explicit_usage_revocation(self):
        self.exercise(revoke_public=True, reformat_source=True)

    def test_actual_policy_difference_is_rejected_and_environment_removed(self):
        self.exercise(change_policy=True)

    def exercise(self, revoke_public=False, reformat_source=False, change_policy=False):
        import psycopg
        connect_root = lambda: psycopg.connect(host="127.0.0.1", port=55432, user="postgres", password="synthetic",
                                               dbname="postgres", sslmode="disable", autocommit=True)
        with connect_root() as root:
            root.execute("DROP DATABASE IF EXISTS drill_source")
            root.execute("CREATE DATABASE drill_source")
        connect = lambda: psycopg.connect(host="127.0.0.1", port=55432, user="postgres", password="synthetic",
                                          dbname="drill_source", sslmode="disable", autocommit=True)
        try:
            with connect() as source:
                source.execute("CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA supabase_migrations")
                source.execute("CREATE TABLE auth.users(id int primary key,status text)")
                source.execute("CREATE TABLE storage.objects(bucket_id text,name text,metadata jsonb,updated_at timestamptz)")
                source.execute("CREATE TABLE public.records(id serial primary key,value text)")
                source.execute("INSERT INTO auth.users VALUES(1,'blocked'); INSERT INTO public.records(value) VALUES('synthetic')")
                source.execute("ALTER TABLE public.records ENABLE ROW LEVEL SECURITY")
                source.execute("CREATE POLICY synthetic ON public.records USING(true)")
                if revoke_public:
                    source.execute("REVOKE USAGE ON SCHEMA public FROM PUBLIC")
            with tempfile.TemporaryDirectory() as directory:
                folder = Path(directory)
                identity = drill.local_command(["age-keygen"])
                public = drill.local_command(["age-keygen", "-y"], data=identity).decode().strip()
                payload = folder / "payload"
                payload.mkdir()
                fields = {"BACKUP_SOURCE_ID": "pronto-production", "BACKUP_AGE_RECIPIENT": public,
                          "PGDATABASE": "drill_source"}
                with patch.dict(os.environ, fields), connect() as connection:
                    snapshot = backup.DatabaseSnapshot(connection, payload)
                    snapshot.start()
                    fingerprint = snapshot.fingerprint()
                    archive = backup.encrypted_snapshot(snapshot, connect, payload, folder, fingerprint, NOW)
                plain = folder / "plain.tar.gz"
                drill.local_command(["age", "-d", "-i", "-", "-o", plain, archive], data=identity)
                restored, manifest = drill.unpack_verified(plain, folder / "out", {
                    "created_at": NOW.isoformat(), "fingerprint": fingerprint})
                if reformat_source or change_policy:
                    schema_path = restored / "schema.sql"
                    schema = schema_path.read_bytes()
                    if reformat_source:
                        schema = schema.replace(b"CREATE TABLE public.records (", b"CREATE TABLE public.records   (", 1)
                    if change_policy:
                        schema = schema.replace(b"USING (true)", b"USING (false)", 1)
                    self.assertNotEqual(schema, schema_path.read_bytes())
                    # Mutate only the explicitly synthetic fixture AFTER unpack
                    # to prove the database comparison does not accept drift.
                    schema_path.write_bytes(schema)
                database = drill.OfflineDatabase()
                if change_policy:
                    with self.assertRaises(drill.SchemaComparisonError), database:
                        database.restore(restored, manifest)
                    self.assertTrue(database.cleaned)
                    return
                with database:
                    self.assertEqual(database.restore(restored, manifest), 3)
                    self.assertEqual(database.schema_comparison, "isolated_reference" if reformat_source else "direct_dump")
                    self.assertEqual(database.sql("SELECT relrowsecurity FROM pg_class WHERE oid='public.records'::regclass").strip(), b"t")
                    if revoke_public:
                        self.assertEqual(database.sql("SELECT NOT EXISTS(SELECT FROM pg_namespace n, aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='public' AND a.grantee=0 AND a.privilege_type='USAGE')").strip(), b"t")
                    self.assertEqual(database.sql("SELECT nextval('public.records_id_seq')").strip(), b"2")
                self.assertTrue(database.cleaned)
                self.assertIsNone(database.container)
        finally:
            with connect_root() as root:
                root.execute("DROP DATABASE IF EXISTS drill_source")


if __name__ == "__main__":
    unittest.main()
