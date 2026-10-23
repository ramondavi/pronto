"""Operator-only Supabase secret registration; never connects to production."""
from __future__ import annotations

import argparse
from http.server import HTTPServer
import json
from pathlib import Path
import re
import secrets
import shutil
import time
from urllib.parse import unquote, urlsplit

from provision_b2 import make_handler, require_disabled, save_secret
from run_backup import require

PROJECT = "vsdkxmpzqwauzotnbdxo"


def provision(connection, password):
    # Parse only in memory. Never save the URI or use its embedded password.
    try:
        scheme, separator, remainder = connection.partition("://")
        credentials, at, address = remainder.rpartition("@")
        require(bool(separator and at), "invalid_session_connection")
        # Supabase shows [YOUR-PASSWORD], which is not a URI-escaped password.
        # Remove any embedded password before URL parsing; only the separate
        # masked field supplies the credential stored in GitHub.
        username = credentials.split(":", 1)[0]
        parsed = urlsplit(scheme + "://" + username + "@" + address)
        host, port = parsed.hostname, parsed.port
        user = unquote(parsed.username or "")
    except ValueError:
        require(False, "invalid_session_connection")
    require(parsed.scheme in {"postgres", "postgresql"} and host is not None
            and re.fullmatch(r"[a-z0-9-]+\.pooler\.supabase\.com", host) is not None
            and port == 5432 and user == "postgres." + PROJECT
            and parsed.path == "/postgres" and not parsed.query and not parsed.fragment,
            "use_pronto_session_pooler_port_5432")
    require(bool(password.strip()) and len(password) <= 1024 and "\x00" not in password,
            "invalid_database_password")
    gh = shutil.which("gh")
    require(gh is not None, "github_cli_missing")
    require_disabled(gh)
    # If one save fails, leave the schedule disabled and allow an idempotent retry.
    # Do not delete existing credentials or reset the production database password.
    for name, value in (("BACKUP_PG_HOST", host), ("BACKUP_PG_USER", user),
                        ("BACKUP_PG_PASSWORD", password)):
        save_secret(gh, name, value)


def provision_storage(project_url, credential):
    require(project_url == "https://" + PROJECT + ".supabase.co", "unexpected_supabase_project")
    require(re.fullmatch(r"sb_secret_[A-Za-z0-9_-]{20,512}", credential) is not None,
            "use_server_secret_key_not_publishable_or_legacy")
    gh = shutil.which("gh")
    require(gh is not None, "github_cli_missing")
    require_disabled(gh)
    # This is a privileged project key, not a read-only key. The backup only
    # uses GET requests; never pass this key to application/browser code.
    save_secret(gh, "BACKUP_STORAGE_READ_TOKEN", credential)


FORM = """<!doctype html><html lang="pt-br"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Banco do Pronto!</title>
<style>body{font:16px system-ui;background:#f4f6f9;color:#1e293b;max-width:680px;margin:40px auto;padding:24px}
main{background:white;padding:32px;border-radius:16px}h1{font-size:24px}p,li{line-height:1.6}
label{display:block;margin:22px 0 6px}input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:6px}
button{margin-top:24px;padding:14px;background:#3c3873;color:white;border:0;border-radius:6px;cursor:pointer}
small{display:block;line-height:1.5;margin-top:18px}</style><main><h1>Preparar acesso ao banco do Pronto!</h1>
<p>Esta página funciona somente neste computador. Os dados serão cadastrados diretamente nos segredos
protegidos do ambiente <b>backup-production</b> de <b>ramondavi/pronto</b> no GitHub.</p>
<ol><li>No painel do projeto Pronto! do Supabase, clique em <b>Connect</b>.</li>
<li>Escolha <b>Session pooler</b> e o formato <b>URI</b>. Copie o endereço completo para o primeiro campo.
Pode manter o marcador [YOUR-PASSWORD] no endereço.</li>
<li>No segundo campo, informe a senha do banco que você tem guardada.</li></ol>
<p>Este cadastro não acessa o banco, não altera sua senha e não ativa o backup.
A conexão e a senha ainda precisarão ser validadas em etapa posterior.</p>
<form method="post" action="/configure" autocomplete="off"><input type="hidden" name="csrf" value="CSRF_TOKEN">
<label for="identifier">Endereço completo da conexão Session pooler (URI)</label>
<input id="identifier" name="identifier" type="password" autocomplete="off" required maxlength="4096" spellcheck="false">
<label for="credential">Senha do banco de dados</label>
<input id="credential" name="credential" type="password" autocomplete="off" required maxlength="1024">
<button type="submit">Cadastrar acesso do banco no GitHub</button></form>
<small>Não envie esses dados ou capturas dos campos preenchidos pelo chat. Nenhuma senha será salva em arquivos locais.
O endereço completo não será armazenado; apenas servidor, usuário e senha serão cadastrados separadamente.</small></main></html>"""


STORAGE_FORM = FORM.partition("<main>")[0].replace("Banco do Pronto!", "Documentos do Pronto!") + """<main>
<h1>Preparar backup dos documentos privados</h1>
<p>A chave será cadastrada diretamente no ambiente protegido <b>backup-production</b> do repositório
<b>ramondavi/pronto</b> no GitHub, conforme sua autorização. O backup continuará desativado.</p>
<ol><li>No Supabase, abra o projeto de produção do Pronto! e vá a <b>Settings → API Keys</b>.</li>
<li>Na seção <b>Secret keys</b>, crie uma chave dedicada com o nome <b>pronto-backup</b>.
Ela deve começar por <b>sb_secret_</b>. Mantenha as chaves existentes.</li>
<li>Copie a nova chave e cole somente no campo abaixo. Não a envie pelo chat.</li></ol>
<p>Esta chave tem acesso privilegiado aos dados do projeto. O executor a usará para baixar os PDFs
privados do Nada Consta. Este cadastro não acessa documentos nem testa a chave.</p>
<form method="post" action="/configure" autocomplete="off"><input type="hidden" name="csrf" value="CSRF_TOKEN">
<label for="identifier">Projeto de produção</label>
<input id="identifier" name="identifier" type="text" value="https://vsdkxmpzqwauzotnbdxo.supabase.co" readonly required>
<label for="credential">Chave de servidor (sb_secret_...)</label>
<input id="credential" name="credential" type="password" autocomplete="off" spellcheck="false" required maxlength="1024">
<button type="submit">Cadastrar chave dos documentos no GitHub</button></form>
<small>A página funciona somente neste computador. A chave não será salva em arquivos locais ou nos relatórios.
Não envie capturas da chave ou dos campos preenchidos.</small></main></html>"""


def main():
    parser = argparse.ArgumentParser(description="Cadastro local protegido do acesso ao banco")
    parser.add_argument("status_file", type=Path)
    parser.add_argument("--storage-key", action="store_true")
    options = parser.parse_args()
    state = {"done": False}
    success = ("Chave dos documentos cadastrada no GitHub." if options.storage_key else
               "Acesso do banco cadastrado no GitHub.")
    notice = ("A chave ainda não foi testada" if options.storage_key else "A conexão ainda não foi testada")
    handler = make_handler(options.status_file, secrets.token_urlsafe(32), state,
                           form=STORAGE_FORM if options.storage_key else FORM,
                           configure=provision_storage if options.storage_key else provision,
                           preserve_password=not options.storage_key,
                           success_body="<h1>" + success + "</h1><p>" + notice + " e o backup continua desativado.</p>")
    with HTTPServer(("127.0.0.1", 0), handler) as server:
        server.timeout = 1
        options.status_file.write_text(json.dumps({"ready": True, "url": "http://127.0.0.1:" + str(server.server_port)}), encoding="utf-8")
        deadline = time.monotonic() + 1800
        while not state["done"] and time.monotonic() < deadline:
            server.handle_request()


if __name__ == "__main__":
    main()
