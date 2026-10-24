"""Standalone local page for contingency copies. Values never leave process memory except to Supabase."""
from __future__ import annotations

import argparse
import hmac
from http.server import HTTPServer
import html
import json
import os
from pathlib import Path
import secrets
import time
from urllib.parse import parse_qs
import webbrowser

from local_http import SecureLocalHandler
from manual_backup import connection_fields, destination_folder, execute_manual, verify_tools
from preflight import error_code
from run_backup import BackupError, require

PAGE = """<!doctype html><html lang="pt-br"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Backup manual do Pronto!</title><style>body{font:16px system-ui;background:#f4f6f9;color:#1e293b;max-width:760px;margin:30px auto;padding:20px}
main{background:white;border-radius:16px;padding:30px}h1{font-size:25px}p,li{line-height:1.5}label{display:block;margin:16px 0 5px}
input{box-sizing:border-box;width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:6px}button{margin-top:22px;background:#3c3873;color:white;border:0;border-radius:6px;padding:14px}small{display:block;line-height:1.5;margin-top:18px}</style>
<main><h1>Backup manual do Pronto!</h1><p>Esta página gera uma cópia criptografada do banco e dos PDFs privados do Nada Consta.
Funciona sem GitHub, Backblaze, Healthchecks ou o painel do Pronto. Precisa que o Supabase e a conexão de internet estejam disponíveis.</p>
<p>Consulte o gerenciador de senhas e informe os acessos abaixo. A chave privada de recuperação não é necessária para gerar a cópia.</p>
<form method="post" action="/run" autocomplete="off"><input type="hidden" name="csrf" value="CSRF_TOKEN">
<label for="connection">Endereço completo de conexão Session pooler (URI), porta 5432</label>
<input id="connection" name="connection" type="password" autocomplete="off" required maxlength="4096">
<label for="password">Senha do banco de produção</label><input id="password" name="password" type="password" autocomplete="off" required maxlength="1024">
<label for="token">Chave de servidor do Supabase (sb_secret_...)</label><input id="token" name="token" type="password" autocomplete="off" required maxlength="1024">
<label for="destination">Pasta privada para guardar a cópia (fora do repositório)</label>
<input id="destination" name="destination" type="text" value="DESTINATION_VALUE" required maxlength="2048">
<p>O botão abaixo autoriza esta cópia do banco e dos documentos para a pasta escolhida. Ele não altera o banco, não envia e-mails e não liga a agenda automática.</p>
<button type="submit">Gerar cópia criptografada nesta pasta</button></form>
<small>Aguarde a mensagem final; a geração pode levar vários minutos. Só considere concluída a cópia que tiver arquivo .age e recibo .json com integridade conferida.
Guarde a chave de recuperação separadamente. As cópias manuais devem ser eliminadas ao fim de 90 dias, sob sua responsabilidade; disco desconectado não faz expurgo automático.</small></main></html>"""


def make_handler(configuration, csrf, state):
    class Handler(SecureLocalHandler):
        def do_GET(self):
            if not self.trusted() or self.path != "/":
                self.reply("Acesso indisponível.", 403)
                return
            default = str(Path.home() / "Pronto-Backups-Manuais")
            self.reply(PAGE.replace("CSRF_TOKEN", csrf).replace("DESTINATION_VALUE", html.escape(default, quote=True)))

        def do_POST(self):
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            origin = "http://127.0.0.1:" + str(self.server.server_port)
            if not self.trusted() or self.path != "/run" or self.headers.get("Origin") != origin or not 0 < length <= 16384:
                self.reply("Acesso indisponível.", 403)
                return
            fields = None
            data = {}
            try:
                require(not state["done"], "manual_copy_already_completed")
                data = parse_qs(self.rfile.read(length).decode("utf-8"), max_num_fields=5)
                require(hmac.compare_digest(data.get("csrf", [""])[0], csrf), "invalid_local_form")
                fields = connection_fields(data.get("connection", [""])[0], data.get("password", [""])[0],
                                           data.get("token", [""])[0], configuration)
                destination = destination_folder(data.get("destination", [""])[0])
                verify_tools()
                receipt = execute_manual(fields, destination)
                state["done"] = True
                self.reply("<h1>Cópia criptografada concluída e conferida.</h1><p>Pasta: " + html.escape(str(destination)) +
                           "</p><p>Arquivo: " + html.escape(receipt["archive"]) + "</p><p>Guarde o arquivo .age junto do recibo .json. "
                           "O teste de restauração ainda precisa ser feito. A agenda automática não foi alterada.</p>")
            except Exception as error:
                code = (str(error) if isinstance(error, BackupError) else
                        error_code(error, "banco") if error.__class__.__module__.startswith("psycopg") else
                        "manual_copy_failed")
                self.reply("<h1>Cópia não concluída.</h1><p>Código: " + code +
                           ". Nenhum sucesso foi registrado. Reabra a página para tentar novamente; não envie os campos pelo chat.</p>", 400)
            finally:
                data.clear()
                if fields is not None:
                    fields.clear()
    return Handler


def main():
    parser = argparse.ArgumentParser(description="Página local de backup manual")
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--status-file", type=Path)
    options = parser.parse_args()
    os.umask(0o077)
    configuration = json.loads(options.config.read_text(encoding="utf-8"))  # Public configuration only.
    package = options.config.resolve().parent
    os.environ["PATH"] = os.pathsep.join((str(package / "tools"), os.environ.get("PATH", "")))
    state = {"done": False}
    handler = make_handler(configuration, secrets.token_urlsafe(32), state)
    with HTTPServer(("127.0.0.1", 0), handler) as server:
        server.timeout = 1
        url = "http://127.0.0.1:" + str(server.server_port)
        if options.status_file:
            options.status_file.write_text(json.dumps({"ready": True, "url": url}), encoding="utf-8")
        if not options.no_browser:
            webbrowser.open(url)
        deadline = time.monotonic() + 1800
        while not state["done"] and time.monotonic() < deadline:
            server.handle_request()


if __name__ == "__main__":
    main()
