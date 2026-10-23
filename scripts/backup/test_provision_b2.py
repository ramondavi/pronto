import unittest
from unittest.mock import patch
from http.server import HTTPServer
import json
from pathlib import Path
import tempfile
import threading
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import provision_b2 as setup
from run_backup import BackupError


class ProvisionTest(unittest.TestCase):
    def setUp(self):
        disabled = patch("provision_b2.require_disabled")
        self.disabled = disabled.start()
        self.addCleanup(disabled.stop)

    def responses(self, extra_capability=False):
        return [
            {"accountId": "synthetic", "apiUrl": "https://api001.backblazeb2.com", "authorizationToken": "synthetic"},
            {"buckets": [{"bucketId": "synthetic", "bucketName": "pronto-backups", "bucketType": "allPrivate"}]},
            {"bucketId": "synthetic", "applicationKeyId": "synthetic-id", "applicationKey": "synthetic-key",
             "capabilities": setup.CAPABILITIES + (["deleteFiles"] if extra_capability else [])},
            {},
        ]

    @patch("provision_b2.shutil.which", return_value="synthetic-gh")
    @patch("provision_b2.save_secret")
    @patch("provision_b2.b2_call")
    def test_only_bucket_scoped_minimum_permissions_are_saved(self, api, save, which):
        api.side_effect = self.responses()
        setup.provision("synthetic-id", "synthetic-key")
        self.assertEqual(save.call_count, 2)
        request = api.call_args_list[2].kwargs["data"]
        self.assertEqual(request["bucketId"], "synthetic")
        self.assertNotIn("deleteFiles", request["capabilities"])
        self.assertNotIn("writeBucketRetentions", request["capabilities"])
        self.assertEqual(request["validDurationInSeconds"], 15552000)

    @patch("provision_b2.shutil.which", return_value="synthetic-gh")
    @patch("provision_b2.save_secret")
    @patch("provision_b2.b2_call")
    def test_unexpected_permissions_revoke_only_new_key(self, api, save, which):
        api.side_effect = self.responses(extra_capability=True)
        with self.assertRaisesRegex(BackupError, "setup_failed_new_key_revoked"):
            setup.provision("synthetic-id", "synthetic-key")
        save.assert_not_called()
        self.assertTrue(api.call_args_list[-1].args[0].endswith("/b2_delete_key"))

    @patch("provision_b2.shutil.which", return_value="synthetic-gh")
    @patch("provision_b2.save_secret", side_effect=RuntimeError("synthetic private error"))
    @patch("provision_b2.b2_call")
    def test_partial_secret_failure_does_not_leave_valid_new_key(self, api, save, which):
        api.side_effect = self.responses()
        with self.assertRaisesRegex(BackupError, "setup_failed_new_key_revoked"):
            setup.provision("synthetic-id", "synthetic-key")

    def test_non_vendor_api_is_rejected_before_transmitting_credentials(self):
        with self.assertRaisesRegex(BackupError, "invalid_b2_api"):
            setup.b2_call("https://example.org/collect", basic="synthetic:synthetic")

    @patch("provision_b2.shutil.which", return_value="synthetic-gh")
    @patch("provision_b2.b2_call")
    def test_enabled_schedule_blocks_provisioning_before_authorization(self, api, which):
        self.disabled.side_effect = BackupError("disable_schedule_before_setup")
        with self.assertRaisesRegex(BackupError, "disable_schedule_before_setup"):
            setup.provision("synthetic-id", "synthetic-key")
        api.assert_not_called()

    @patch("provision_b2.provision")
    def test_local_form_rejects_other_origins_and_never_records_values(self, provision):
        with tempfile.TemporaryDirectory() as temp:
            status = Path(temp) / "status.json"
            state = {"done": False}
            server = HTTPServer(("127.0.0.1", 0), setup.make_handler(status, "synthetic-csrf", state))
            origin = "http://127.0.0.1:" + str(server.server_port)
            with server:
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                try:
                    with urlopen(origin) as page:
                        self.assertEqual(page.headers["Cache-Control"], "no-store")
                        self.assertIn("frame-ancestors 'none'", page.headers["Content-Security-Policy"])
                    body = urlencode({"csrf": "synthetic-csrf", "identifier": "synthetic-id", "credential": "synthetic-value"}).encode()
                    for headers, data in (({"Origin": "https://example.org"}, body),
                                           ({"Origin": origin}, body.replace(b"synthetic-csrf", b"incorrect-csrf"))):
                        with self.assertRaises(HTTPError):
                            urlopen(Request(origin + "/configure", data=data, headers=headers))
                    provision.assert_not_called()
                    with urlopen(Request(origin + "/configure", data=body, headers={"Origin": origin})) as response:
                        self.assertNotIn(b"synthetic-value", response.read())
                    self.assertEqual(json.loads(status.read_text()), {"ok": True, "code": "configured"})
                    self.assertTrue(state["done"])
                    provision.assert_called_once_with("synthetic-id", "synthetic-value")
                finally:
                    server.shutdown()
                    thread.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
