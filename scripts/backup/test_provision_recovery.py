"""Synthetic recovery-handoff tests; never use a production identity."""
from http.server import HTTPServer
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import provision_recovery as setup
from run_backup import BackupError


class RecoveryTest(unittest.TestCase):
    @patch("provision_recovery.require_disabled")
    @patch("provision_recovery.command")
    def test_existing_public_recipient_is_never_overwritten(self, command, disabled):
        command.return_value = b'[{"name":"BACKUP_AGE_RECIPIENT"}]'
        with self.assertRaisesRegex(BackupError, "controlled_rotation"):
            setup.save_recipient("synthetic-gh", "synthetic-public")
        self.assertEqual(command.call_count, 1)
        self.assertNotIn("set", command.call_args.args[0])

    @patch("provision_recovery.require_disabled")
    @patch("provision_recovery.command")
    def test_only_public_recipient_sent_to_github(self, command, disabled):
        command.side_effect = [b"[]", b""]
        setup.save_recipient("synthetic-gh", "synthetic-public")
        self.assertEqual(command.call_args.args[1], b"synthetic-public")
        args = command.call_args.args[0]
        self.assertIn("BACKUP_AGE_RECIPIENT", args)
        self.assertIn("backup-production", args)
        self.assertIn("ramondavi/pronto", args)
        self.assertNotIn("secret", args)

    @patch("provision_recovery.command")
    @patch("provision_recovery.require_disabled", side_effect=BackupError("disable_schedule_before_setup"))
    def test_enabled_schedule_blocks_setup(self, disabled, command):
        with self.assertRaises(BackupError):
            setup.require_new_recipient("synthetic-gh")
        command.assert_not_called()

    @patch("provision_recovery.require_new_recipient")
    @patch("provision_recovery.generate_pair", return_value=("synthetic-public", b"synthetic-private"))
    @patch("provision_recovery.save_recipient")
    def test_private_download_is_same_key_and_confirmation_precedes_public_save(self, save, generate, fresh):
        with tempfile.TemporaryDirectory() as directory:
            status = Path(directory) / "status.json"
            state = {"done": False}
            handler = setup.recovery_handler(status, "synthetic-csrf", state, "synthetic-age", "synthetic-keygen", "synthetic-gh")
            with HTTPServer(("127.0.0.1", 0), handler) as server:
                origin = "http://127.0.0.1:" + str(server.server_port)
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                def post(path, *, saved=False, request_origin=None, csrf="synthetic-csrf"):
                    fields = {"csrf": csrf}
                    if saved:
                        fields["saved"] = "yes"
                    return urlopen(Request(origin + path, data=urlencode(fields).encode(),
                                           headers={"Origin": request_origin or origin}))
                try:
                    with urlopen(origin) as response:
                        self.assertNotIn(b"synthetic-private", response.read())
                    for request_origin in ("null", "https://example.org"):
                        with self.assertRaises(HTTPError):
                            post("/download", request_origin=request_origin)
                    with self.assertRaises(HTTPError):
                        post("/download", csrf="incorrect")
                    generate.assert_not_called()
                    with self.assertRaises(HTTPError):
                        post("/confirm", saved=True)
                    save.assert_not_called()
                    for attempt in range(2):
                        with post("/download") as response:
                            self.assertEqual(response.read(), b"synthetic-private")
                            self.assertEqual(response.headers["Cache-Control"], "no-store")
                            self.assertIn("attachment", response.headers["Content-Disposition"])
                            self.assertEqual(response.headers["Referrer-Policy"], "same-origin")
                            self.assertIn("frame-ancestors 'none'", response.headers["Content-Security-Policy"])
                    generate.assert_called_once()
                    self.assertNotIn("synthetic-private", status.read_text())
                    with urlopen(origin) as response:
                        self.assertNotIn(b"synthetic-private", response.read())
                    with self.assertRaises(HTTPError):
                        post("/confirm")
                    save.assert_not_called()
                    with post("/confirm", saved=True) as response:
                        self.assertNotIn(b"synthetic-private", response.read())
                    save.assert_called_once_with("synthetic-gh", "synthetic-public")
                    self.assertEqual(json.loads(status.read_text()), {"ok": True, "code": "public_recipient_configured"})
                    self.assertTrue(state["done"])
                    self.assertIsNone(state["identity"])
                    with self.assertRaises(HTTPError):
                        post("/download")
                    generate.assert_called_once()
                finally:
                    server.shutdown()
                    thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
