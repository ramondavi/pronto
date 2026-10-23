"""Operator-only registration of the Healthchecks ping URL; never sends a ping."""
from __future__ import annotations

import argparse
from http.server import HTTPServer
import json
from pathlib import Path
import re
import secrets
import shutil
import time
from urllib.parse import urlsplit

from provision_b2 import make_handler, require_disabled, save_secret
from provision_supabase import FORM
from run_backup import require


def provision(identifier, ping_url):
    require(identifier == "Healthchecks.io", "unexpected_monitor")
    try:
        parsed = urlsplit(ping_url)
        host, port = parsed.hostname or "", parsed.port
    except ValueError:
        require(False, "invalid_monitor_address")
    require(parsed.scheme == "https" and (host == "hc-ping.com" or host.endswith(".hc-ping.com"))
            and port in (None, 443) and not parsed.username and not parsed.password
            and not parsed.query and not parsed.fragment
            and re.fullmatch(r"/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", parsed.path) is not None,
            "use_https_base_ping_url")
    gh = shutil.which("gh")
    require(gh is not None, "github_cli_missing")
    require_disabled(gh)
    # Do not ping here: successful setup must not impersonate a completed backup.
    save_secret(gh, "BACKUP_HEARTBEAT_URL", ping_url)


PAGE = FORM.partition("<main>")[0].replace("Banco do Pronto!", "Monitor do Pronto!") + """<main>
<h1>Conectar o monitor de falhas do backup</h1>
<p>O endereço será cadastrado diretamente nos segredos protegidos do ambiente <b>backup-production</b>
do repositório <b>ramondavi/pronto</b> no GitHub, conforme sua autorização.</p>
<ol><li>No Healthchecks.io, abra o monitor <b>Pronto! — backup diário</b>.</li>
<li>Copie o endereço <b>Ping URL</b>, começando por <b>https://hc-ping.com/</b>, e cole abaixo.
Use o endereço principal, sem acrescentar /start ou /fail.</li>
<li>Clique em <b>Cadastrar monitor no GitHub</b>.</li></ol>
<p>Esta etapa não envia sinal de sucesso ou falha e não ativa o backup. O monitor ainda precisará
ser testado com a rotina e com os avisos por e-mail.</p>
<form method="post" action="/configure" autocomplete="off"><input type="hidden" name="csrf" value="CSRF_TOKEN">
<label for="identifier">Serviço de monitoramento</label>
<input id="identifier" name="identifier" type="text" value="Healthchecks.io" readonly required>
<label for="credential">Endereço secreto de ping (Ping URL)</label>
<input id="credential" name="credential" type="password" autocomplete="off" spellcheck="false" required maxlength="2048">
<button type="submit">Cadastrar monitor no GitHub</button></form>
<small>A página funciona somente neste computador. Não envie o endereço ou capturas dos campos preenchidos pelo chat.
O endereço não será salvo em arquivos locais ou nos relatórios.</small></main></html>"""


def main():
    parser = argparse.ArgumentParser(description="Cadastro local protegido do monitor")
    parser.add_argument("status_file", type=Path)
    options = parser.parse_args()
    state = {"done": False}
    handler = make_handler(options.status_file, secrets.token_urlsafe(32), state,
                           form=PAGE, configure=provision,
                           success_body="<h1>Monitor cadastrado no GitHub.</h1><p>O monitor ainda não foi testado e o backup continua desativado.</p>")
    with HTTPServer(("127.0.0.1", 0), handler) as server:
        server.timeout = 1
        options.status_file.write_text(json.dumps({"ready": True, "url": "http://127.0.0.1:" + str(server.server_port)}), encoding="utf-8")
        deadline = time.monotonic() + 1800
        while not state["done"] and time.monotonic() < deadline:
            server.handle_request()


if __name__ == "__main__":
    main()
