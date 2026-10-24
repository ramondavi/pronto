"""Loopback-only HTTP response protections; no credentials or service integrations."""
from http.server import BaseHTTPRequestHandler


class SecureLocalHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # Never log requests, headers, form data or provider exceptions.

    def reply(self, body, status=200, *, content_type="text/html; charset=utf-8", download_name=None):
        data = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        if download_name is not None:
            self.send_header("Content-Disposition", 'attachment; filename="' + download_name + '"')
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        # no-referrer makes browser form submissions send Origin: null.
        # Preserve the local origin so strict Origin/CSRF checks keep working.
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(data)

    def trusted(self):
        return self.headers.get("Host") == "127.0.0.1:" + str(self.server.server_port)
