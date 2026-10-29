"""One-session loopback recovery form. Never persists or logs submitted secrets."""
from __future__ import annotations

import argparse
import hmac
from functools import partial
import html
from http.server import ThreadingHTTPServer
import json
import os
from pathlib import Path
import secrets
import threading
import time
from urllib.parse import parse_qs
import webbrowser

from local_http import SecureLocalHandler
from restore_drill import execute_drill, IDENTITY, SchemaComparisonError
from run_backup import BackupError, require

STYLE = "body{font:16px system-ui;background:#f4f6f9;color:#1e293b;max-width:760px;margin:30px auto;padding:20px}main{background:white;border-radius:16px;padding:30px}h1{font-size:25px}p,li{line-height:1.5}label{display:block;margin:18px 0 5px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:6px}button{margin-top:24px;background:#3c3873;color:white;border:0;border-radius:6px;padding:14px;font:inherit}small{display:block;line-height:1.5;margin-top:20px}"
PHASES = {"starting": "Preparando o ensaio", "download": "Baixando e conferindo a cópia criptografada",
          "decrypt": "Abrindo a cópia neste computador", "verify_package": "Conferindo os arquivos",
          "restore": "Restaurando e comparando o banco isolado", "auth": "Conferindo login e permissões na cópia isolada", "cleanup": "Concluindo a limpeza"}


def page(body, refresh=False):
    return ('<!doctype html><html lang="pt-br"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            + ('<meta http-equiv="refresh" content="3;url=/status">' if refresh else '')
            + '<title>Ensaio de recuperação do Pronto!</title><style>' + STYLE + '</style><main>' + body + '</main></html>')


def form(csrf):
    return page('''<h1>Ensaio de recuperação do Pronto!</h1>
<p>Vamos testar a cópia já guardada no Backblaze em um banco temporário neste computador autorizado.
O banco do teste ficará sem rede e será removido ao final. O Pronto! em produção não será alterado.</p>
<p>Após conferir a integridade, este ensaio poderá criar contas fictícias somente na cópia isolada para testar login e permissões. Nenhuma senha de usuário real será solicitada. O ambiente inteiro será removido.</p>
<p>Consulte seu gerenciador de senhas e preencha os três campos. Eles não serão guardados em arquivo nem enviados ao GitHub.</p>
<form method="post" action="/run" autocomplete="off"><input type="hidden" name="csrf" value="''' + csrf + '''">
<label for="identifier">Identificador da chave principal do Backblaze (keyID)</label>
<input id="identifier" name="identifier" type="password" required maxlength="256" autocomplete="off">
<label for="credential">Chave principal do Backblaze (applicationKey)</label>
<input id="credential" name="credential" type="password" required maxlength="1024" autocomplete="off">
<label for="identity">Chave de recuperação dos backups</label>
<input id="identity" name="identity" type="password" required maxlength="256" autocomplete="off">
<small>No último campo, cole somente a linha que começa com AGE-SECRET-KEY-1, guardada em “Pronto! — recuperação dos backups”. Não envie esses valores pelo chat.</small>
<p>O botão autoriza criar no Backblaze uma credencial de leitura, restrita aos backups, com duração máxima de uma hora.
Ela será revogada após o download. A chave de recuperação será usada somente neste computador.</p>
<button type="submit">Autorizar e iniciar o ensaio local</button></form>
<small>Acompanhe as etapas na próxima tela. O ensaio confere a recuperação do banco e dos arquivos;
login pelo site e entrega dos alertas serão verificações separadas. A agenda diária continuará desativada.</small>''')


class DrillState:
    def __init__(self, status_file=None, report_file=None):
        self.lock = threading.Lock()
        self.phase = "ready"
        self.result = None
        self.error = None
        self.finished_at = None
        self.status_file = status_file
        self.report_file = report_file
        self.url = None

    def persist(self):
        if self.status_file:
            self.status_file.write_text(json.dumps({"url": self.url, "phase": self.phase,
                "done": self.finished_at is not None, "success": self.result is not None,
                "error": self.error}), encoding="utf-8")

    def progress(self, phase):
        require(phase in PHASES, "unexpected_local_progress")
        with self.lock:
            self.phase = phase
            self.persist()

    def run(self, fields, executor):
        try:
            result = executor(fields["identifier"], fields["credential"], fields["identity"], self.progress)
            # The executor returns only nonpersonal validation metadata after cleanup.
            if self.report_file:
                self.report_file.write_text(json.dumps(result, indent=2), encoding="utf-8")
            with self.lock:
                self.result = result
                self.phase = "complete"
        except Exception as error:
            if isinstance(error, SchemaComparisonError) and self.report_file:
                diagnostic_path = self.report_file.with_name(self.report_file.stem + "-diagnostics.json")
                try:
                    diagnostic_path.write_text(json.dumps(error.diagnostics, indent=2), encoding="utf-8")
                except OSError:
                    pass  # Preserve the original failure and complete the status response.
            # No provider exception, SQL, command output or submitted field in responses.
            code = str(error) if isinstance(error, BackupError) else "local_restore_failed"
            if not code.isascii() or not code.replace("_", "").isalnum() or len(code) > 90:
                code = "local_restore_failed"
            with self.lock:
                self.error = code
                self.phase = "failed"
        finally:
            fields.clear()
            with self.lock:
                self.finished_at = time.monotonic()
                self.persist()


def make_handler(state, csrf, executor=execute_drill):
    class Handler(SecureLocalHandler):
        def do_GET(self):
            if not self.trusted() or self.path not in {"/", "/status"}:
                self.reply("Acesso indisponível.", 403)
                return
            with state.lock:
                if state.phase == "ready":
                    self.reply(form(csrf))
                elif state.result is not None:
                    self.reply(page('<h1>Ensaio concluído e conferido</h1><p>A cópia foi aberta, o banco foi restaurado e a integridade foi conferida. '
                        'O ambiente temporário e os arquivos de trabalho foram removidos.</p><p>Produção e agenda diária não foram alteradas. '
                        'Login pelo site permanece uma verificação separada.</p>'
                        + ('<p>Login e permissões de contas fictícias também foram conferidos na cópia isolada.</p>' if state.result.get('auth_service_login_tested') else '')
                        + '<p>Você pode fechar esta página.</p>'))
                elif state.error:
                    self.reply(page('<h1>Ensaio não concluído</h1><p>Código: ' + html.escape(state.error)
                        + '.</p><p>Nenhum sucesso foi registrado. Informe somente esse código; não envie as credenciais pelo chat.</p>'))
                else:
                    self.reply(page('<h1>' + PHASES.get(state.phase, "Preparando o ensaio")
                        + '</h1><p>Esta tela atualiza a cada três segundos. Aguarde a confirmação final; o teste pode levar alguns minutos.</p>'
                        '<p><a href="/status">Atualizar acompanhamento</a></p>', refresh=True))

        def do_POST(self):
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            expected_origin = "http://127.0.0.1:" + str(self.server.server_port)
            if (not self.trusted() or self.path != "/run" or self.headers.get("Origin") != expected_origin
                    or self.headers.get("Content-Type") != "application/x-www-form-urlencoded"
                    or not 0 < length <= 16384):
                self.reply("Acesso indisponível.", 403)
                return
            parsed, fields = {}, {}
            try:
                parsed = parse_qs(self.rfile.read(length).decode("utf-8"), strict_parsing=True, max_num_fields=4)
                require(set(parsed) == {"csrf", "identifier", "credential", "identity"}
                        and all(len(values) == 1 for values in parsed.values()), "invalid_local_form")
                require(hmac.compare_digest(parsed["csrf"][0], csrf), "invalid_local_form")
                fields = {key: parsed[key][0].strip() for key in ("identifier", "credential", "identity")}
                require(0 < len(fields["identifier"]) <= 256 and 0 < len(fields["credential"]) <= 1024
                        and IDENTITY.fullmatch(fields["identity"]), "invalid_local_form")
                with state.lock:
                    require(state.phase == "ready", "local_drill_already_started")
                    state.phase = "starting"
                    state.persist()
                worker_fields = fields.copy()
                threading.Thread(target=state.run, args=(worker_fields, executor), daemon=False).start()
                self.reply(page('<h1>Ensaio iniciado</h1><p><a href="/status">Acompanhar as etapas</a></p>', refresh=True), 202)
            except Exception:
                self.reply(page('<h1>Não foi possível iniciar</h1><p>Confira os campos ou se o ensaio já está em andamento. '
                                'Não envie os valores pelo chat.</p>'), 400)
            finally:
                fields.clear()
                parsed.clear()
    return Handler


def main():
    parser = argparse.ArgumentParser(description="Ensaio local de recuperação do Pronto!")
    parser.add_argument("--status-file", type=Path, required=True)
    parser.add_argument("--report-file", type=Path, required=True)
    parser.add_argument("--tools", type=Path, required=True)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--auth-binary", type=Path)
    options = parser.parse_args()
    os.umask(0o077)
    os.environ["PATH"] = str(options.tools.resolve()) + os.pathsep + os.environ.get("PATH", "")
    state = DrillState(options.status_file, options.report_file)
    executor = partial(execute_drill, auth_binary=options.auth_binary)
    with ThreadingHTTPServer(("127.0.0.1", 0), make_handler(state, secrets.token_urlsafe(32), executor)) as server:
        server.timeout = 1
        state.url = "http://127.0.0.1:" + str(server.server_port)
        state.persist()
        if not options.no_browser:
            webbrowser.open(state.url)
        deadline = time.monotonic() + 3600
        while time.monotonic() < deadline or state.phase in PHASES:
            server.handle_request()
            if state.finished_at is not None and time.monotonic() - state.finished_at > 600:
                break


if __name__ == "__main__":
    main()
