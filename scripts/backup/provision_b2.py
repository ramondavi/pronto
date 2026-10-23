"""Interactive credential provisioning; values never leave memory except to B2/GitHub.

Run locally by the operator, never in CI. The master credential is used only for
authorizing B2 and creating a bucket-scoped application key. It is never stored.
"""

from __future__ import annotations

import argparse
import base64
import hmac
from http.server import HTTPServer
import json
from pathlib import Path
import secrets
import shutil
import subprocess
import time
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, build_opener

from run_backup import BackupError, NoRedirect, require
from local_http import SecureLocalHandler


CAPABILITIES = ["listBuckets", "readBuckets", "readBucketEncryption", "readBucketRetentions",
                "listFiles", "readFiles", "writeFiles", "readFileRetentions"]
BUCKET = "pronto-backups"
REPOSITORY = "ramondavi/pronto"
ENVIRONMENT = "backup-production"


def b2_call(url, *, token=None, data=None, basic=None):
    parsed = urlsplit(url)
    require(parsed.scheme == "https" and parsed.hostname is not None and
            parsed.hostname.endswith(".backblazeb2.com") and not parsed.username and
            not parsed.password, "invalid_b2_api")
    headers = {"Content-Type": "application/json"}
    if basic is not None:
        headers["Authorization"] = "Basic " + base64.b64encode(basic.encode()).decode()
    else:
        headers["Authorization"] = token
    request = Request(url, headers=headers, data=json.dumps(data).encode() if data is not None else None)
    with build_opener(NoRedirect).open(request, timeout=30) as response:
        return json.load(response)


def save_secret(gh, name, value):
    # stdin avoids credentials in command arguments and shell/process listings.
    result = subprocess.run([gh, "secret", "set", name, "--repo", REPOSITORY, "--env", ENVIRONMENT],
                            input=value.encode(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                            timeout=60, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    require(result.returncode == 0, "github_secret_not_saved")


def require_disabled(gh):
    # A pair of GitHub Secrets cannot be replaced atomically. Never rotate it
    # while the production schedule is enabled.
    result = subprocess.run([gh, "variable", "get", "BACKUP_ENABLED", "--repo", REPOSITORY],
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=30,
                            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    require(result.returncode == 0 and result.stdout.strip() == b"false", "disable_schedule_before_setup")


def provision(key_id, master_key):
    gh = shutil.which("gh")
    require(gh is not None, "github_cli_missing")
    require_disabled(gh)
    authorization = b2_call("https://api.backblazeb2.com/b2api/v2/b2_authorize_account",
                            basic=key_id + ":" + master_key)
    api = authorization["apiUrl"].rstrip("/")
    token = authorization["authorizationToken"]
    account = authorization["accountId"]
    buckets = b2_call(api + "/b2api/v2/b2_list_buckets", token=token,
                      data={"accountId": account, "bucketName": BUCKET})["buckets"]
    require(len(buckets) == 1 and buckets[0]["bucketName"] == BUCKET and
            buckets[0]["bucketType"] == "allPrivate", "private_bucket_not_found")
    bucket_id = buckets[0]["bucketId"]
    child = b2_call(api + "/b2api/v2/b2_create_key", token=token, data={
        "accountId": account, "bucketId": bucket_id, "keyName": "pronto-backup-production",
        "capabilities": CAPABILITIES, "validDurationInSeconds": 180 * 24 * 60 * 60})
    try:
        require(set(child["capabilities"]) == set(CAPABILITIES) and child.get("bucketId") == bucket_id,
                "unexpected_key_permissions")
        save_secret(gh, "BACKUP_B2_KEY_ID", child["applicationKeyId"])
        save_secret(gh, "BACKUP_B2_APPLICATION_KEY", child["applicationKey"])
    except Exception:
        # Roll back only the new credential created by this operation. Never
        # delete existing keys or files; a partial setup cannot be activated.
        try:
            b2_call(api + "/b2api/v2/b2_delete_key", token=token,
                    data={"applicationKeyId": child["applicationKeyId"]})
        except Exception:
            raise BackupError("setup_failed_check_new_key") from None
        raise BackupError("setup_failed_new_key_revoked") from None


FORM = """<!doctype html><html lang="pt-br"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar backup do Pronto!</title>
<style>body{font:16px system-ui;background:#f4f6f9;color:#1e293b;max-width:640px;margin:48px auto;padding:24px}
main{background:white;padding:32px;border-radius:16px}h1{font-size:24px}p{line-height:1.5}
label{display:block;margin:22px 0 6px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:6px}
button{margin-top:24px;padding:14px;background:#3c3873;color:white;border:0;border-radius:6px;cursor:pointer}
small{display:block;line-height:1.5;margin-top:18px}</style><main><h1>Conectar o backup do Pronto!</h1>
<p>Esta página funciona somente neste computador. Você autoriza o uso temporário da chave mestra
para criar uma credencial limitada ao bucket <b>pronto-backups</b>, sem exclusão permanente ou alteração de retenção.</p>
<p>A credencial limitada será cadastrada diretamente no ambiente <b>backup-production</b> do GitHub de
<b>ramondavi/pronto</b>. A chave mestra não será salva. O backup continuará desativado.</p>
<form method="post" action="/configure" autocomplete="off"><input type="hidden" name="csrf" value="CSRF_TOKEN">
<label for="identifier">Master Application Key ID</label>
<input id="identifier" name="identifier" type="password" autocomplete="off" required maxlength="1024">
<label for="credential">Master Application Key</label>
<input id="credential" name="credential" type="password" autocomplete="off" required maxlength="1024">
<button type="submit">Criar credencial restrita e cadastrar no GitHub</button></form>
<small>Os valores são enviados somente ao Backblaze para autorização; apenas a credencial limitada vai ao GitHub.
Nenhum segredo aparece em relatórios ou arquivos locais. Não envie capturas com os campos preenchidos.</small></main></html>"""


def make_handler(status_path, csrf, state, *, form=None, configure=None, success_body=None, preserve_password=False):
    class Handler(SecureLocalHandler):
        def do_GET(self):
            if not self.trusted() or self.path != "/":
                self.reply("Acesso indisponível.", 403)
                return
            self.reply((form or FORM).replace("CSRF_TOKEN", csrf))

        def do_POST(self):
            origin = "http://127.0.0.1:" + str(self.server.server_port)
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self.reply("Acesso indisponível.", 403)
                return
            if (not self.trusted() or self.path != "/configure" or self.headers.get("Origin") != origin
                    or not 0 < length <= 16384):
                self.reply("Acesso indisponível.", 403)
                return
            try:
                fields = parse_qs(self.rfile.read(length).decode("utf-8"), max_num_fields=3)
                require(hmac.compare_digest(fields.get("csrf", [""])[0], csrf), "invalid_local_form")
                identifier, credential = fields.get("identifier", [""])[0], fields.get("credential", [""])[0]
                require(bool(identifier.strip() and credential.strip()), "missing_fields")
                (configure or provision)(identifier.strip(), credential if preserve_password else credential.strip())
                ok, code = True, "configured"
            except Exception as error:
                ok = False
                code = str(error) if isinstance(error, BackupError) else "provider_request_failed"
            status_path.write_text(json.dumps({"ok": ok, "code": code}), encoding="utf-8")
            if ok:
                state["done"] = True
                self.reply(success_body or "<h1>Credencial restrita cadastrada no GitHub.</h1><p>Pode fechar esta página. O backup continua desativado.</p>")
            else:
                self.reply("<h1>Cadastro não concluído.</h1><p>Código: " + code + ". Não envie os campos pelo chat.</p>", 400)
    return Handler


def main():
    parser = argparse.ArgumentParser(description="Cadastro local protegido do backup")
    parser.add_argument("status_file", type=Path)
    parser.add_argument("--port", type=int, default=0)
    options = parser.parse_args()
    require(0 <= options.port <= 65535, "invalid_local_port")
    status_path = options.status_file
    state = {"done": False}
    with HTTPServer(("127.0.0.1", options.port), make_handler(status_path, secrets.token_urlsafe(32), state)) as server:
        server.timeout = 1
        status_path.write_text(json.dumps({"ready": True, "url": "http://127.0.0.1:" + str(server.server_port)}), encoding="utf-8")
        deadline = time.monotonic() + 1800
        while not state["done"] and time.monotonic() < deadline:
            server.handle_request()


if __name__ == "__main__":
    main()
