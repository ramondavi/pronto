"""All provider and CLI interactions mocked; no real tokens or dispatches."""
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
import provision_panel_dispatch as setup

class PanelSetupTest(unittest.TestCase):
    @patch("provision_panel_dispatch.urlopen")
    @patch("provision_panel_dispatch.subprocess.run")
    @patch("provision_panel_dispatch.shutil.which",return_value="synthetic-npx")
    def test_secret_is_stdin_only_and_production_only(self,which,run,open_url):
        token="github_"+"pat_"+"X"*32
        open_url.return_value.__enter__.return_value.status=200
        run.return_value.returncode=0
        setup.configure(token,Path("synthetic-workdir"))
        request=open_url.call_args.args[0]
        self.assertEqual(request.full_url,"https://api.github.com/repos/ramondavi/pronto/actions/workflows/backup.yml")
        self.assertEqual(request.get_method(),"GET")
        self.assertEqual(run.call_count,2)
        for call in run.call_args_list:
            args=call.args[0]
            self.assertNotIn(token,args)
            self.assertEqual(args[args.index("--environment")+1],"production")
            self.assertEqual(args[args.index("--project")+1],setup.PROJECT)
            self.assertNotIn("--git-branch",args)
            self.assertNotIn("workflow",args)
        self.assertIn("--sensitive",run.call_args_list[0].args[0])
        self.assertEqual(run.call_args_list[0].kwargs["input"],token.encode())
        self.assertEqual(run.call_args_list[1].kwargs["input"],b"true")

    @patch("provision_panel_dispatch.urlopen")
    def test_legacy_empty_or_invalid_token_never_leaves_the_machine(self,open_url):
        for token in ("", "not-a-token", "ghp_"+"X"*32):
            with self.assertRaises(ValueError):
                setup.configure(token,Path("synthetic-workdir"))
        open_url.assert_not_called()

    @patch("provision_panel_dispatch.urlopen")
    @patch("provision_panel_dispatch.subprocess.run")
    @patch("provision_panel_dispatch.shutil.which",return_value="synthetic-npx")
    def test_failed_secret_save_never_enables_the_feature(self,which,run,open_url):
        open_url.return_value.__enter__.return_value.status=200
        run.return_value=MagicMock(returncode=1)
        with self.assertRaises(RuntimeError):
            setup.configure("github_"+"pat_"+"X"*32,Path("synthetic-workdir"))
        self.assertEqual(run.call_count,1)

if __name__=="__main__":
    unittest.main()
