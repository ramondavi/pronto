"""Offline Auth smoke test. Secrets travel over stdin only; no HTTP/SQL logging."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
from pathlib import Path
import re
import secrets
import subprocess
import time

from run_backup import BackupError, require

AUTH_IMAGE = "public.ecr.aws/supabase/gotrue@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b"
AUTH_SHA256 = "f2aa147268461f74784ddc8b2240aa446ee71ceb9633bac41c30e7b852a860aa"
AUTH_VERSION = "v2.197.0"
FIXTURE_IDS = tuple("10000000-0000-4000-8000-" + str(i).zfill(12) for i in range(1, 7))
FIXTURE_ROLES = ("student", "student", "cataloger", "administrator", None, None)


def curl_quote(value):
    require(isinstance(value, str) and "\x00" not in value and "\r" not in value and "\n" not in value,
            "invalid_offline_http_value")
    return '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'


def verified_claims(token, key, expected_id):
    require(isinstance(token, str) and len(token) <= 16384, "offline_auth_token_invalid")
    parts = token.split(".")
    require(len(parts) == 3, "offline_auth_token_invalid")
    def decode(value):
        return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    header, claims = json.loads(decode(parts[0])), json.loads(decode(parts[1]))
    require(header.get("alg") == "HS256", "offline_auth_algorithm_unexpected")
    signature = hmac.new(key.encode(), (parts[0] + "." + parts[1]).encode(), hashlib.sha256).digest()
    require(hmac.compare_digest(signature, decode(parts[2])), "offline_auth_signature_invalid")
    require(expected_id in FIXTURE_IDS and claims.get("sub") == expected_id and
            claims.get("role") == "authenticated" and claims.get("aud") == "authenticated" and
            isinstance(claims.get("exp"), int) and claims["exp"] > time.time(), "offline_auth_claims_invalid")
    return claims


def prepare_offline_fixture(database):
    """Insert synthetic accounts only AFTER the restored contents were verified.

    Fixed identifiers must be unused. All writes stay in the disposable,
    networkless restored copy; conflicts abort rather than overwrite accounts.
    """
    database.check_isolation()
    identifiers = ",".join("'" + value + "'::uuid" for value in FIXTURE_IDS)
    query = "SELECT count(*) FROM auth.users WHERE id IN (" + identifiers + ") OR email LIKE 'teste.pgtap.%@ufba.br'"
    sql = lambda value: database.command("psql", "-XAtq", "-h", "/restore/socket", "-U", "pronto_drill_owner",
        "-d", "postgres", "--set", "ON_ERROR_STOP=1", data=value.encode())
    require(sql(query).strip() == b"0", "offline_auth_fixture_conflict")
    fixture = Path(__file__).resolve().parents[2] / "supabase/tests/database/authorization_rls.test.sql"
    source = fixture.read_text(encoding="utf-8")
    setup = source[source.index("insert into auth.users"):source.index("set local role authenticated;")]
    password = secrets.token_urlsafe(32)
    # The generated password contains only URL-safe characters and travels on stdin.
    require(re.fullmatch(r"[A-Za-z0-9_-]{40,64}", password), "offline_fixture_password_invalid")
    setup += "UPDATE auth.users SET encrypted_password=extensions.crypt('" + password + "',extensions.gen_salt('bf',10)),"
    setup += "aud='authenticated',role='authenticated',email_confirmed_at=now(),confirmation_token='',recovery_token='',"
    setup += "email_change_token_new='',email_change='',email_change_token_current='',reauthentication_token='',"
    setup += "phone_change='',phone_change_token='',instance_id='00000000-0000-0000-0000-000000000000',"
    setup += "raw_app_meta_data='{\"provider\":\"email\",\"providers\":[\"email\"]}'::jsonb,created_at=now(),updated_at=now() "
    setup += "WHERE id IN (" + identifiers + ");"
    setup += ("INSERT INTO auth.identities(id,provider_id,user_id,identity_data,provider,created_at,updated_at) "
        "SELECT extensions.gen_random_uuid(),id::text,id,jsonb_build_object('sub',id::text,'email',email,'email_verified',true),"
        "'email',now(),now() FROM auth.users WHERE id IN (" + identifiers + ");")
    sql("BEGIN;" + setup + "COMMIT;")
    return password


class OfflineAuth:
    def __init__(self, database, binary):
        self.database = database
        self.binary = Path(binary)
        self.key = secrets.token_urlsafe(48)
        self.process = None
        self.login_enabled = False

    def sql(self, statement):
        return self.database.command("psql", "-XAtq", "-h", "/restore/socket", "-U", "pronto_drill_owner",
                                     "-d", "postgres", "--set", "ON_ERROR_STOP=1", data=statement.encode())

    def request(self, path, *, payload=None, token=None):
        require(path in {"/health", "/token?grant_type=password", "/token?grant_type=refresh_token", "/user", "/logout"},
                "unexpected_offline_auth_endpoint")
        lines = ['url = ' + curl_quote("http://127.0.0.1:9999" + path), 'silent', 'show-error', 'max-time = 10',
                 'write-out = "\\n%{http_code}"']
        if token:
            require(re.fullmatch(r"[A-Za-z0-9_.-]+", token), "invalid_offline_auth_header")
            lines.append('header = ' + curl_quote("Authorization: Bearer " + token))
        if payload is not None:
            lines += ['header = "Content-Type: application/json"', 'request = "POST"',
                      'data-binary = ' + curl_quote(json.dumps(payload, separators=(",", ":")))]
        elif path == "/logout":
            lines.append('request = "POST"')
        raw = self.database.command("curl", "--config", "-", data=("\n".join(lines) + "\n").encode(),
                                    code="offline_auth_http_failed")
        body, _, code = raw.rpartition(b"\n")
        require(code.isdigit(), "offline_auth_http_status_invalid")
        return int(code), json.loads(body) if body.strip() else {}

    def __enter__(self):
        self.database.check_isolation()
        require(self.binary.is_file() and hashlib.sha256(self.binary.read_bytes()).hexdigest() == AUTH_SHA256,
                "offline_auth_binary_not_verified")
        require(self.database.auth_tools, "offline_auth_tools_mount_required")
        with self.binary.open("rb") as source:
            copy = subprocess.run(["docker", "exec", "-i", "--user", "0:0", self.database.container,
                "/bin/sh", "-c", "rm -f /auth-tools/auth && cat > /auth-tools/auth && chmod 0555 /auth-tools/auth"],
                stdin=source, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=300,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        require(copy.returncode == 0, "offline_auth_binary_transfer_failed")
        checksum = self.database.command("sha256sum", "/auth-tools/auth").split()[0].decode("ascii")
        require(checksum == AUTH_SHA256, "offline_auth_transferred_binary_not_verified")
        role = json.loads(self.sql("SELECT json_build_array(rolsuper,rolcreaterole,rolcreatedb,rolreplication,rolbypassrls,rolcanlogin) "
                                   "FROM pg_roles WHERE rolname='supabase_auth_admin'"))
        require(role == [False] * 6, "offline_auth_role_not_restricted")
        self.sql("ALTER ROLE supabase_auth_admin LOGIN")
        self.login_enabled = True
        values = {
            "GOTRUE_JWT_SECRET": self.key,
            "GOTRUE_DB_DRIVER": "postgres",
            "GOTRUE_DB_DATABASE_URL": "postgresql://supabase_auth_admin@/postgres?host=/restore/socket&sslmode=disable&options=-csearch_path%3Dauth%2Cpublic%2Cextensions",
            "GOTRUE_DB_NAMESPACE": "auth",
            "GOTRUE_DB_MAX_POOL_SIZE": "4",
            "GOTRUE_DB_CLEANUP_ENABLED": "false",
            "GOTRUE_API_HOST": "127.0.0.1",
            "GOTRUE_API_PORT": "9999",
            "API_EXTERNAL_URL": "http://127.0.0.1:9999",
            "GOTRUE_SITE_URL": "http://127.0.0.1:9999",
            "GOTRUE_JWT_AUD": "authenticated",
            "GOTRUE_JWT_DEFAULT_GROUP_NAME": "authenticated",
            "GOTRUE_JWT_ADMIN_ROLES": "service_role",
            "GOTRUE_JWT_EXP": "600",
            "GOTRUE_DISABLE_SIGNUP": "true",
            "GOTRUE_EXTERNAL_EMAIL_ENABLED": "true",
            "GOTRUE_MAILER_AUTOCONFIRM": "true",
            "GOTRUE_SMTP_HOST": "127.0.0.1",
            "GOTRUE_SMTP_PORT": "1",
            "GOTRUE_LOG_LEVEL": "error",
        }
        script = 'cd /restore; echo $$ > /restore/auth.pid; '
        script += ' '.join('IFS= read -r ' + name + '; export ' + name + ';' for name in values)
        script += ' exec /auth-tools/auth serve'
        try:
            self.process = subprocess.Popen(["docker", "exec", "-i", "--user", "100:101", self.database.container,
                "/bin/sh", "-c", script], stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            self.process.stdin.write(("\n".join(values.values()) + "\n").encode())
            self.process.stdin.close()
            deadline = time.monotonic() + 45
            while time.monotonic() < deadline:
                require(self.process.poll() is None, "offline_auth_server_not_started")
                try:
                    status, health = self.request("/health")
                    if status == 200:
                        require(health.get("version") == AUTH_VERSION, "offline_auth_version_unexpected")
                        return self
                except BackupError:
                    pass
                time.sleep(0.5)
            raise BackupError("offline_auth_server_not_ready")
        except Exception:
            self.stop()
            raise
        finally:
            values.clear()

    def stop(self):
        try:
            if self.process is not None:
                if self.process.poll() is None:
                    self.database.command("/bin/sh", "-c",
                        'pid=$(cat /restore/auth.pid); case "$pid" in ""|*[!0-9]*) exit 1;; esac; kill -TERM "$pid"',
                        code="offline_auth_stop_failed")
                    try:
                        self.process.wait(timeout=15)
                    except subprocess.TimeoutExpired:
                        raise BackupError("offline_auth_stop_not_confirmed") from None
                self.process = None
        finally:
            try:
                if self.login_enabled:
                    self.sql("ALTER ROLE supabase_auth_admin NOLOGIN")
                    self.login_enabled = False
            finally:
                self.key = ""

    def __exit__(self, *_):
        self.stop()

    def verify_fixture(self, password):
        """Only predetermined, explicitly synthetic accounts; never a real user."""
        checked = 0
        for index, user_id in enumerate(FIXTURE_IDS):
            # Fixture addresses are obtained internally; no names, addresses,
            # passwords, JWTs, refresh tokens or SQL responses leave the test.
            email = json.loads(self.sql("SELECT to_json(email) FROM auth.users WHERE id='" + user_id + "'"))
            require(isinstance(email, str) and email.startswith("teste.pgtap.") and email.endswith("@ufba.br"),
                    "synthetic_auth_fixture_required")
            status, session = self.request("/token?grant_type=password", payload={"email": email, "password": password})
            require(status == 200 and session.get("user", {}).get("id") == user_id, "offline_auth_fixture_login_failed")
            claims = verified_claims(session.get("access_token"), self.key, user_id)
            status, user = self.request("/user", token=session["access_token"])
            require(status == 200 and user.get("id") == user_id, "offline_auth_fixture_identity_failed")
            quoted_claims = json.dumps(claims, separators=(",", ":")).replace("'", "''")
            query = "BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claims','" + quoted_claims + "',true);"
            query += "SELECT set_config('request.jwt.claim.sub','" + claims["sub"] + "',true);"
            if index == 2:
                query += "WITH changed AS (UPDATE public.profiles SET role='administrator' WHERE id='" + FIXTURE_IDS[0] + "' RETURNING 1) SELECT count(*) FROM changed;"
            elif index == 3:
                query += "WITH changed AS (UPDATE public.profiles SET full_name='Synthetic recovery check' WHERE id='" + FIXTURE_IDS[0] + "' RETURNING 1) SELECT count(*) FROM changed;"
            identifiers = ",".join("'" + value + "'::uuid" for value in FIXTURE_IDS)
            query += ("SELECT json_build_array(public.current_user_role(),public.is_active_user(),"
                      "(SELECT count(*) FROM public.profiles WHERE id IN (" + identifiers + ")),"
                      "(SELECT count(*) FROM public.profiles),"
                      "(SELECT count(*) FROM public.student_profiles WHERE profile_id IN (" + identifiers + ")),"
                      "(SELECT count(*) FROM public.staff_profiles WHERE profile_id IN (" + identifiers + ")),"
                      "(SELECT count(*) FROM public.academic_programs));ROLLBACK;")
            output = self.sql(query).splitlines()
            actual = json.loads(output[-1])
            expected_count = 1 if index < 2 else 6 if index < 4 else 0
            expected_students = 1 if index < 2 else 2 if index < 4 else 0
            expected_staff = 1 if index == 2 else 4 if index == 3 else 0
            require(actual[:3] == [FIXTURE_ROLES[index], index < 4, expected_count] and
                    actual[4:6] == [expected_students, expected_staff], "offline_auth_fixture_rls_failed")
            if index < 2:
                require(actual[3] == 1, "offline_auth_student_isolation_failed")
            elif index >= 4:
                require(actual[3] == 0 and actual[6] == 0, "offline_auth_inactive_access_not_denied")
            if index in (2, 3):
                require(int(output[-2]) == (0 if index == 2 else 1), "offline_auth_staff_permissions_failed")
            if index == 0:
                bad, denied = self.request("/token?grant_type=password", payload={"email": email, "password": password + "wrong"})
                require(bad in {400, 401, 422} and not denied.get("access_token"), "offline_auth_wrong_password_accepted")
                refresh_status, refreshed = self.request("/token?grant_type=refresh_token", payload={"refresh_token": session["refresh_token"]})
                require(refresh_status == 200, "offline_auth_refresh_failed")
                verified_claims(refreshed.get("access_token"), self.key, user_id)
                logout_status, _ = self.request("/logout", token=refreshed["access_token"])
                require(logout_status in {200, 204}, "offline_auth_logout_failed")
                revoked, denied = self.request("/token?grant_type=refresh_token", payload={"refresh_token": refreshed["refresh_token"]})
                require(revoked in {400, 401, 422} and not denied.get("access_token"), "offline_auth_session_not_revoked")
            checked += 1
        return {"synthetic_logins_verified": checked, "wrong_password_rejected": True, "refresh_verified": True,
                "logout_refresh_revoked": True, "profile_rls_verified": True, "blocked_inactive_operational_access_denied": True,
                "auth_version": AUTH_VERSION, "external_network": False, "host_ports": False,
                "production_modified": False, "real_user_passwords_used": False}
