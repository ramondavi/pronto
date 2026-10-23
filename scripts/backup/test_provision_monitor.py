"""Synthetic monitor setup tests; no external pings or real credentials."""
import unittest
from unittest.mock import patch

import provision_monitor as setup
from run_backup import BackupError


SYNTHETIC = "https://hc-ping.com/00000000-0000-0000-0000-000000000000"


class MonitorSetupTest(unittest.TestCase):
    @patch("provision_monitor.shutil.which", return_value="synthetic-gh")
    @patch("provision_monitor.require_disabled")
    @patch("provision_monitor.save_secret")
    def test_only_base_ping_address_saved_with_schedule_disabled(self, save, disabled, which):
        setup.provision("Healthchecks.io", SYNTHETIC)
        disabled.assert_called_once_with("synthetic-gh")
        save.assert_called_once_with("synthetic-gh", "BACKUP_HEARTBEAT_URL", SYNTHETIC)

    @patch("provision_monitor.save_secret")
    def test_other_hosts_credentials_suffixes_and_options_rejected_before_save(self, save):
        invalid = [SYNTHETIC.replace("https:", "http:"), SYNTHETIC + "/start", SYNTHETIC + "/fail",
                   SYNTHETIC + "?value=private", SYNTHETIC + "#fragment",
                   SYNTHETIC.replace("hc-ping.com", "hc-ping.com.example.org"),
                   SYNTHETIC.replace("hc-ping.com", "user:password@hc-ping.com"),
                   SYNTHETIC.replace("hc-ping.com", "hc-ping.com:8080"),
                   SYNTHETIC.replace("hc-ping.com", "hc-ping.com:invalid")]
        for index, address in enumerate(invalid):
            with self.subTest(case=index), self.assertRaises(BackupError):
                setup.provision("Healthchecks.io", address)
        save.assert_not_called()

    @patch("provision_monitor.shutil.which", return_value="synthetic-gh")
    @patch("provision_monitor.require_disabled", side_effect=BackupError("disable_schedule_before_setup"))
    @patch("provision_monitor.save_secret")
    def test_enabled_schedule_blocks_reconfiguration(self, save, disabled, which):
        with self.assertRaisesRegex(BackupError, "disable_schedule_before_setup"):
            setup.provision("Healthchecks.io", SYNTHETIC)
        save.assert_not_called()


if __name__ == "__main__":
    unittest.main()
