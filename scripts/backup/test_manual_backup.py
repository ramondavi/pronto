"""Manual contingency tests: all credentials and archives are synthetic."""
from datetime import datetime, timezone
from http.server import HTTPServer
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import manual_backup as manual
import manual_server as server_ui
from run_backup import BackupError, digest_file

NOW = datetime(2026, 10, 23, tzinfo=timezone.utc)
URI = "postgresql://postgres." + manual.PROJECT + ":[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
PUBLIC = {"project_url": "https://" + manual.PROJECT + ".supabase.co", "recipient": "age1" + "q" * 58,
          "ca_certificate": "synthetic-public-certificate"}
TOKEN = "sb_secret_" + "synthetic" * 4


class ManualTest(unittest.TestCase):
    def test_credentials_only_in_memory_and_environment_restored_after_failure(self):
        fields = manual.connection_fields(URI, " synthetic-password ", TOKEN, PUBLIC)
        self.assertEqual(fields["PGPASSWORD"], " synthetic-password ")
        self.assertFalse(any(name.startswith(("B2_", "GITHUB_")) or "HEARTBEAT" in name for name in fields))
        with patch.dict(os.environ, {"PGPASSWORD": "previous-synthetic"}):
            with self.assertRaises(RuntimeError):
                with manual.temporary_environment(fields):
                    self.assertEqual(os.environ["PGPASSWORD"], " synthetic-password ")
                    raise RuntimeError("synthetic failure")
            self.assertEqual(os.environ["PGPASSWORD"], "previous-synthetic")

    def test_rejects_other_project_or_transaction_pooler(self):
        for uri in (URI.replace(manual.PROJECT, "anotherproject"), URI.replace(":5432/", ":6543/")):
            with self.assertRaises(BackupError):
                manual.connection_fields(uri, "synthetic", TOKEN, PUBLIC)

    def test_destination_inside_git_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / ".git").write_text("synthetic marker")
            with self.assertRaisesRegex(BackupError, "outside_git"):
                manual.destination_folder(str(root / "copies"))

    def test_encrypted_copy_and_receipt_are_verified_without_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root / "source.age"
            archive.write_bytes(b"synthetic-ciphertext")
            destination = root / "copies"
            destination.mkdir()
            first = manual.publish_archive(archive, destination, NOW, "synthetic-fingerprint")
            second = manual.publish_archive(archive, destination, NOW, "synthetic-fingerprint")
            self.assertNotEqual(first["archive"], second["archive"])
            self.assertEqual(digest_file(destination / first["archive"]), first["sha256"])
            self.assertFalse(first["restoration_tested"])
            self.assertEqual(first["expires_at"], "2027-01-21T00:00:00+00:00")
            self.assertEqual(json.loads((destination / (first["archive"] + ".json")).read_text()), first)
            self.assertFalse(list(destination.glob("*.partial")))

    def test_failed_checksum_never_publishes_receipt(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root / "source.age"
            archive.write_bytes(b"synthetic-ciphertext")
            destination = root / "copies"
            destination.mkdir()
            with patch.object(manual, "digest_file", side_effect=["original", "corrupt"]):
                with self.assertRaisesRegex(BackupError, "checksum_mismatch"):
                    manual.publish_archive(archive, destination, NOW, "synthetic")
            self.assertEqual(list(destination.iterdir()), [])

    def test_preexisting_partial_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = root / "source.age"
            archive.write_bytes(b"synthetic-ciphertext")
            name = "pronto-manual-20261023T000000Z-synthetic.tar.gz.age.partial"
            existing = root / name
            existing.write_bytes(b"preexisting")
            with patch.object(manual.uuid, "uuid4", return_value=Mock(hex="synthetic")):
                with self.assertRaises(FileExistsError):
                    manual.publish_archive(archive, root, NOW, "synthetic")
            self.assertEqual(existing.read_bytes(), b"preexisting")

    @patch("manual_server.verify_tools")
    @patch("manual_server.destination_folder")
    @patch("manual_server.execute_manual", side_effect=RuntimeError("synthetic-private-provider-message"))
    def test_form_blocks_cross_origin_and_does_not_echo_credentials(self, execute, destination, tools):
        state = {"done": False}
        handler = server_ui.make_handler(PUBLIC, "synthetic-csrf", state)
        with HTTPServer(("127.0.0.1", 0), handler) as server:
            origin = "http://127.0.0.1:" + str(server.server_port)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            fields = {"csrf": "synthetic-csrf", "connection": URI, "password": "synthetic-password",
                      "token": TOKEN, "destination": "synthetic-folder"}
            try:
                with urlopen(origin) as response:
                    self.assertEqual(response.headers["Cache-Control"], "no-store")
                    self.assertIn("frame-ancestors 'none'", response.headers["Content-Security-Policy"])
                body = urlencode(fields).encode()
                for value in ("null", "https://example.org"):
                    with self.assertRaises(HTTPError):
                        urlopen(Request(origin + "/run", data=body, headers={"Origin": value}))
                execute.assert_not_called()
                with self.assertRaises(HTTPError) as failure:
                    urlopen(Request(origin + "/run", data=body, headers={"Origin": origin}))
                content = failure.exception.read()
                for value in (b"synthetic-password", TOKEN.encode(), b"synthetic-private-provider-message"):
                    self.assertNotIn(value, content)
                self.assertIn(b"manual_copy_failed", content)
                self.assertFalse(state["done"])
            finally:
                server.shutdown()
                thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
