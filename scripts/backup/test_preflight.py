"""Synthetic read-only preflight tests; no production access."""
import contextlib
import io
import json
import os
import unittest
from unittest.mock import Mock, patch

import preflight as setup
from run_backup import BackupError


class PreflightTest(unittest.TestCase):
    @patch("preflight.database_tls", return_value=contextlib.nullcontext())
    def test_database_reads_only_connection_settings_and_constant(self, tls):
        connection = Mock()
        connection.__enter__ = Mock(return_value=connection)
        connection.__exit__ = Mock(return_value=None)
        cursor = Mock()
        connection.cursor.return_value = contextlib.nullcontext(cursor)
        cursor.fetchone.side_effect = [("on",), (1,), ("170007",)]
        setup.check_database(lambda: connection)
        self.assertEqual([call.args[0] for call in cursor.execute.call_args_list],
                         ["SHOW transaction_read_only", "SELECT 1", "SHOW server_version_num"])

    @patch("preflight.database_tls", return_value=contextlib.nullcontext())
    def test_database_rejects_write_enabled_connection(self, tls):
        connection = Mock()
        connection.__enter__ = Mock(return_value=connection)
        connection.__exit__ = Mock(return_value=None)
        cursor = Mock()
        connection.cursor.return_value = contextlib.nullcontext(cursor)
        cursor.fetchone.return_value = ("off",)
        with self.assertRaisesRegex(BackupError, "readonly_connection_required"):
            setup.check_database(lambda: connection)
        self.assertEqual(cursor.execute.call_count, 1)

    def test_storage_reads_bucket_configuration_only_and_rejects_public_bucket(self):
        for public in (False, True):
            with self.subTest(public=public), patch.dict(os.environ, {
                    "SUPABASE_URL": "https://synthetic.supabase.co", "BACKUP_STORAGE_READ_TOKEN": "sb_secret_synthetic"}):
                response = io.BytesIO(json.dumps({"id": "nada-consta", "public": public}).encode())
                response.status = 200
                with patch("preflight.safe_request", return_value=response) as request:
                    if public:
                        with self.assertRaises(BackupError):
                            setup.check_storage()
                    else:
                        setup.check_storage()
                    self.assertTrue(request.call_args.args[0].endswith("/storage/v1/bucket/nada-consta"))
                    self.assertNotIn("Authorization", request.call_args.kwargs["headers"])

    @patch("preflight.check_environment", side_effect=RuntimeError("synthetic-private-provider-error"))
    def test_errors_never_echo_provider_credentials_or_details(self, check):
        with patch("sys.stderr", new_callable=io.StringIO) as output:
            self.assertEqual(setup.main(), 1)
        self.assertIn("configuracao", output.getvalue())
        self.assertNotIn("synthetic-private-provider-error", output.getvalue())


if __name__ == "__main__":
    unittest.main()
