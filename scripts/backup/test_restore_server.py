"""The protected loopback handoff uses fake credentials and no external services."""
import json
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import time
import unittest
from urllib.parse import urlencode

import restore_server as server


class LocalFormTest(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.state = server.DrillState(Path(self.folder.name) / "status.json", Path(self.folder.name) / "report.json")
        self.started = threading.Event()
        self.release = threading.Event()
        self.fields = None

        def fake(identifier, credential, identity, progress):
            self.fields = (identifier, credential, identity)
            progress("download")
            self.started.set()
            self.release.wait(5)
            return {"synthetic": True, "container_removed": True}

        self.http = ThreadingHTTPServer(("127.0.0.1", 0), server.make_handler(self.state, "csrf-fixture", fake))
        self.origin = "http://127.0.0.1:" + str(self.http.server_port)
        self.state.url = self.origin
        self.thread = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.release.set()
        self.http.shutdown()
        self.http.server_close()
        self.thread.join()
        self.folder.cleanup()

    def request(self, path="/", body=None, headers=None):
        connection = HTTPConnection("127.0.0.1", self.http.server_port, timeout=3)
        connection.request("POST" if body is not None else "GET", path, body=body, headers=headers or {})
        response = connection.getresponse()
        value = response.status, dict(response.getheaders()), response.read().decode()
        connection.close()
        return value

    def payload(self, **overrides):
        fields = dict(csrf="csrf-fixture", identifier="fake-id", credential="fake-master", identity="AGE-SECRET-KEY-1" + "A" * 58)
        fields.update(overrides)
        return urlencode(fields)

    def headers(self, **extra):
        return {"Origin": self.origin, "Content-Type": "application/x-www-form-urlencoded", **extra}

    def test_empty_form_has_response_protections_and_no_external_content(self):
        status, headers, body = self.request()
        self.assertEqual(status, 200)
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertIn("frame-ancestors 'none'", headers["Content-Security-Policy"])
        self.assertEqual(body.count('type="password"'), 3)
        self.assertNotIn("<script", body)
        self.assertNotIn("https://", body)

    def test_origin_host_and_csrf_rejected_before_executor(self):
        for headers, body in [(self.headers(Origin="https://other.invalid"), self.payload()),
                              (self.headers(Host="other.invalid"), self.payload()),
                              (self.headers(), self.payload(csrf="wrong"))]:
            with self.subTest(headers=headers):
                status, _, _ = self.request("/run", body, headers)
                self.assertIn(status, (400, 403))
        self.assertFalse(self.started.is_set())

    def test_asynchronous_progress_and_result_never_echo_credentials(self):
        status, _, body = self.request("/run", self.payload(), self.headers())
        self.assertEqual(status, 202)
        self.assertTrue(self.started.wait(3))
        self.assertFalse(self.release.is_set())
        _, _, progress = self.request("/status")
        self.assertIn("Baixando", progress)
        self.release.set()
        deadline = time.monotonic() + 3
        while self.state.finished_at is None and time.monotonic() < deadline:
            time.sleep(0.01)
        _, _, complete = self.request("/status")
        self.assertIn("concluído e conferido", complete)
        saved = self.state.status_file.read_text() + self.state.report_file.read_text()
        for value in self.fields:
            self.assertNotIn(value, body + progress + complete + saved)
        self.assertTrue(json.loads(self.state.report_file.read_text())["container_removed"])
        status, _, _ = self.request("/run", self.payload(), self.headers())
        self.assertEqual(status, 400)


class SanitizedFailureTest(unittest.TestCase):
    def test_schema_failure_saves_counts_and_finishes_without_credentials(self):
        with tempfile.TemporaryDirectory() as folder:
            state = server.DrillState(Path(folder) / "status.json", Path(folder) / "report.json")
            fields = dict(identifier="fake-private-id", credential="fake-private-master", identity="fake-private-identity")
            def failed(*_):
                raise server.SchemaComparisonError(b"GRANT SELECT ON private_table TO private_role;", b"\n")
            state.run(fields, failed)
            self.assertEqual(fields, {})
            self.assertEqual(state.phase, "failed")
            self.assertIsNotNone(state.finished_at)
            report = (Path(folder) / "report-diagnostics.json").read_text()
            self.assertIn("source_only", report)
            for forbidden in ("private_table", "private_role", "fake-private"):
                self.assertNotIn(forbidden, report + state.status_file.read_text())


if __name__ == "__main__":
    unittest.main()
