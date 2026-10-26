"""Unit checks never use project credentials or real accounts."""
import base64
import hashlib
import hmac
import json
import time
import unittest
from unittest.mock import patch

import restore_auth as auth
from run_backup import BackupError


def token(claims, key="synthetic-key", algorithm="HS256"):
    encode=lambda value:base64.urlsafe_b64encode(json.dumps(value).encode()).rstrip(b"=").decode()
    content=encode({"alg":algorithm,"typ":"JWT"})+"."+encode(claims)
    signature=hmac.new(key.encode(),content.encode(),hashlib.sha256).digest()
    return content+"."+base64.urlsafe_b64encode(signature).rstrip(b"=").decode()


class TokenTest(unittest.TestCase):
    def claims(self):
        return {"sub":auth.FIXTURE_IDS[0],"role":"authenticated","aud":"authenticated","exp":int(time.time())+600}

    def test_correct_signature_and_fixture_identity_required(self):
        claims=self.claims()
        self.assertEqual(auth.verified_claims(token(claims),"synthetic-key",auth.FIXTURE_IDS[0]),claims)
        for mutation in ({"sub":"20000000-0000-4000-8000-000000000001"},{"role":"service_role"},{"aud":"other"},{"exp":1}):
            with self.subTest(mutation=mutation),self.assertRaises(BackupError):
                auth.verified_claims(token({**claims,**mutation}),"synthetic-key",auth.FIXTURE_IDS[0])

    def test_wrong_signature_or_algorithm_cannot_be_accepted(self):
        for value in (token(self.claims(),key="other-synthetic-key"),token(self.claims(),algorithm="none")):
            with self.subTest(value_type="synthetic"),self.assertRaises(BackupError):
                auth.verified_claims(value,"synthetic-key",auth.FIXTURE_IDS[0])

    def test_curl_config_values_cannot_inject_lines(self):
        self.assertEqual(auth.curl_quote('a"b\\c'),'"a\\"b\\\\c"')
        for value in ("value\nheader=x","value\rheader=x","value\x00"):
            with self.subTest(control_character=True),self.assertRaises(BackupError):
                auth.curl_quote(value)

    def test_http_credentials_go_only_in_stdin(self):
        class Database:
            arguments=None
            body=None
            def command(self,*arguments,**options):
                self.arguments=arguments
                self.body=options["data"]
                return b'{"error_code":"invalid_credentials"}\n400'
        database=Database()
        runner=auth.OfflineAuth(database,"unused-synthetic-path")
        status,_=runner.request("/token?grant_type=password",payload={"email":"synthetic@invalid.example","password":"synthetic-password"})
        self.assertEqual(status,400)
        self.assertNotIn("synthetic-password",repr(database.arguments))
        self.assertIn(b"synthetic-password",database.body)
        self.assertEqual(database.arguments,("curl","--config","-"))
        with self.assertRaises(BackupError):
            runner.request("https://outside.invalid")


if __name__=="__main__":
    unittest.main()
