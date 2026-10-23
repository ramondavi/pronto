"""Synthetic tests only; no production credentials or database connections."""
from http.server import HTTPServer
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import provision_supabase as setup
from provision_b2 import make_handler
from run_backup import BackupError


URI = "postgresql://postgres." + setup.PROJECT + ":[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"


class SupabaseSetupTest(unittest.TestCase):
    @patch("provision_supabase.shutil.which", return_value="synthetic-gh")
    @patch("provision_supabase.require_disabled")
    @patch("provision_supabase.save_secret")
    def test_only_separate_fields_saved_with_exact_password(self, save, disabled, which):
        setup.provision(URI, " synthetic-password ")
        self.assertEqual([call.args[1] for call in save.call_args_list],
                         ["BACKUP_PG_HOST", "BACKUP_PG_USER", "BACKUP_PG_PASSWORD"])
        self.assertEqual(save.call_args_list[-1].args[-1], " synthetic-password ")
        self.assertTrue(all(URI not in call.args for call in save.call_args_list))
        disabled.assert_called_once_with("synthetic-gh")

    @patch("provision_supabase.save_secret")
    def test_other_project_host_port_and_options_rejected_before_save(self, save):
        invalid = [URI.replace(setup.PROJECT, "anotherproject"), URI.replace(":5432/", ":6543/"),
                   URI.replace("pooler.supabase.com", "pooler.supabase.com.example.org"),
                   URI + "?sslmode=disable", URI + "#fragment",
                   URI.replace(":5432/", ":invalid/"), URI.replace("postgresql:", "https:")]
        for value in invalid:
            with self.subTest(value=invalid.index(value)), self.assertRaises(BackupError):
                setup.provision(value, "synthetic")
        save.assert_not_called()

    @patch("provision_supabase.shutil.which", return_value="synthetic-gh")
    @patch("provision_supabase.require_disabled", side_effect=BackupError("disable_schedule_before_setup"))
    @patch("provision_supabase.save_secret")
    def test_enabled_schedule_blocks_all_writes(self, save, disabled, which):
        with self.assertRaisesRegex(BackupError, "disable_schedule_before_setup"):
            setup.provision(URI, "synthetic")
        save.assert_not_called()

    def test_local_form_preserves_password_without_echo_or_status_leak(self):
        configure = Mock()
        with tempfile.TemporaryDirectory() as temporary:
            status = Path(temporary) / "status.json"
            state = {"done": False}
            handler = make_handler(status, "synthetic-csrf", state, form=setup.FORM,
                                   configure=configure, preserve_password=True,
                                   success_body="<p>Cadastro concluído; backup desativado.</p>")
            with HTTPServer(("127.0.0.1", 0), handler) as server:
                origin = "http://127.0.0.1:" + str(server.server_port)
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                try:
                    with urlopen(origin) as response:
                        self.assertIn(b"Session pooler", response.read())
                        self.assertEqual(response.headers["Cache-Control"], "no-store")
                    body = urlencode({"csrf": "synthetic-csrf", "identifier": URI,
                                      "credential": " synthetic-password "}).encode()
                    for untrusted in ("null", "https://example.org"):
                        with self.assertRaises(HTTPError):
                            urlopen(Request(origin + "/configure", data=body, headers={"Origin": untrusted}))
                    configure.assert_not_called()
                    with urlopen(Request(origin + "/configure", data=body, headers={"Origin": origin})) as response:
                        self.assertNotIn(b"synthetic-password", response.read())
                    configure.assert_called_once_with(URI, " synthetic-password ")
                    self.assertEqual(json.loads(status.read_text()), {"ok": True, "code": "configured"})
                    self.assertTrue(state["done"])
                finally:
                    server.shutdown()
                    thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
