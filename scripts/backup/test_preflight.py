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
                         ["BEGIN READ ONLY", "SHOW transaction_read_only", "SELECT 1", "SHOW server_version_num"])

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
        self.assertEqual(cursor.execute.call_count, 2)

    @unittest.skipUnless(os.environ.get("BACKUP_INTEGRATION") == "1", "local synthetic PostgreSQL required")
    @patch("preflight.database_tls", return_value=contextlib.nullcontext())
    def test_real_database_with_write_enabled_session_defaults(self, tls):
        import psycopg
        with patch.dict(os.environ, {"PGOPTIONS": "-c default_transaction_read_only=off"}):
            def connect():
                return psycopg.connect(host="127.0.0.1", port=55432, dbname="postgres",
                                       user="postgres", password="synthetic", sslmode="disable", autocommit=True)
            with connect() as connection:
                self.assertEqual(connection.execute("SHOW transaction_read_only").fetchone(), ("off",))
            setup.check_database(connect)

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

    def test_database_diagnosis_uses_static_codes_without_provider_message(self):
        samples = [("password authentication failed with synthetic-private", "database_credentials_not_accepted"),
                   ("certificate verify failed: synthetic-private", "database_tls_validation_failed"),
                   ("connection timeout synthetic-private", "database_network_unavailable")]
        for message, expected in samples:
            self.assertEqual(setup.error_code(RuntimeError(message), "banco"), expected)

    def test_b2_diagnosis_exposes_only_fixed_operation_and_reason(self):
        class ProviderFailure(Exception):
            operation_name = "GetBucketLifecycleConfiguration"
            response = {"Error": {"Code": "AccessDenied", "Message": "synthetic-private"},
                        "ResponseMetadata": {"RequestId": "synthetic-private"}}
        error = ProviderFailure("synthetic-private")
        self.assertEqual(setup.error_code(error, "armazenamento_b2"), "b2_lifecycle_access_denied")
        error.operation_name = "synthetic-private"
        error.response["Error"]["Code"] = "synthetic-private"
        self.assertEqual(setup.error_code(error, "armazenamento_b2"), "b2_connection_check_failed")
        self.assertNotIn("synthetic-private", setup.error_code(error, "armazenamento_b2"))
        error.operation_name = ["synthetic-private"]
        error.response["Error"]["Code"] = {"synthetic-private": True}
        self.assertEqual(setup.error_code(error, "armazenamento_b2"), "b2_connection_check_failed")

    @patch("preflight.check_environment", side_effect=RuntimeError("synthetic-private-provider-error"))
    def test_errors_never_echo_provider_credentials_or_details(self, check):
        with patch("sys.stderr", new_callable=io.StringIO) as output:
            self.assertEqual(setup.main(), 1)
        self.assertIn("configuracao", output.getvalue())
        self.assertNotIn("synthetic-private-provider-error", output.getvalue())


if __name__ == "__main__":
    unittest.main()
