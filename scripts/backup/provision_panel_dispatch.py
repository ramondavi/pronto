"""Operator-supplied fine-grained GitHub token -> production-only Vercel Secret.
Never reads local secrets, starts a backup, or changes backup scheduling.
"""
from __future__ import annotations
import argparse
import hmac
from http.server import HTTPServer
import json
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import threading
import time
from urllib.parse import parse_qs
from urllib.request import Request, urlopen
from local_http import SecureLocalHandler

PROJECT = "prj_lqo9AH8zF9DSwYuZBNnc6pw3V6N6"
FORM = """<!doctype html><html lang="pt-br"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acionamento de backup — produção</title><style>body{font:16px system-ui;max-width:760px;margin:32px auto;padding:20px;background:#f3f5f8;color:#1c2940}main{padding:28px;background:white;border-radius:16px}li,p{line-height:1.6}li{margin:12px 0}label{display:block;font-weight:700;margin:22px 0 8px}input{box-sizing:border-box;width:100%;padding:14px;border:1px solid #bac4d2;border-radius:8px}button{margin-top:18px;padding:14px 20px;background:#203f75;color:white;border:0;border-radius:8px}</style><main><h1>Liberar o botão de backup em produção</h1><p>Esta configuração foi autorizada para a publicação. A credencial ficará somente no servidor de produção da Vercel. Nenhum backup será disparado por este formulário.</p><ol><li>Abra <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">New fine-grained personal access token no GitHub</a>.</li><li>Nome: <b>Pronto — backup pelo painel</b>. Proprietário: <b>ramondavi</b>. Escolha validade limitada e <b>Only select repositories → pronto</b>.</li><li>Em <b>Repository permissions</b>, adicione somente <b>Actions: Read and write</b>. Metadata: Read-only é obrigatório. Não adicione Contents, Administration, Secrets nem outros repositórios.</li><li>Gere o token, guarde-o no cofre e cole abaixo. Não envie o token pelo chat.</li></ol><form method="post" action="/configure" autocomplete="off"><input type="hidden" name="csrf" value="CSRF_TOKEN"><label for="token">Novo token técnico restrito do GitHub</label><input id="token" name="token" type="password" autocomplete="off" required maxlength="1024"><button type="submit">Cadastrar segredo somente em produção</button></form><p>Não é a chave de recuperação do backup nem uma chave do Supabase. O valor é usado em memória para consultar o workflow e cadastrar um Secret na Vercel. Nunca aparece em arquivo, relatório ou código. A produção só usará a nova configuração na próxima publicação.</p></main></html>"""


def configure(token, workdir):
    if re.fullmatch(r"github_pat_[A-Za-z0-9_]{20,1000}", token) is None:
        raise ValueError("fine_grained_token_required")
    request = Request("https://api.github.com/repos/ramondavi/pronto/actions/workflows/backup.yml", headers={"Authorization":"Bearer " + token,"Accept":"application/vnd.github+json","User-Agent":"Pronto-Panel-Provisioning"})
    with urlopen(request, timeout=15) as response:
        if response.status != 200:
            raise RuntimeError("workflow_read_not_confirmed")
    npx = shutil.which("npx.cmd")
    if not npx:
        raise RuntimeError("runtime_unavailable")
    for name, value, secret in (("BACKUP_PANEL_GITHUB_TOKEN",token,True),("BACKUP_PANEL_DISPATCH_ENABLED","true",False)):
        command=[npx,"--yes","vercel@65.7.0","env","add",name,"--environment","production","--scope","ramondavis-projects","--project",PROJECT,"--force","--yes","--sensitive" if secret else "--no-sensitive"]
        result=subprocess.run(command,input=value.encode(),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,cwd=workdir,timeout=60,creationflags=getattr(subprocess,"CREATE_NO_WINDOW",0))
        if result.returncode:
            raise RuntimeError("vercel_configuration_not_confirmed")


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--status-file",required=True,type=Path)
    parser.add_argument("--workdir",required=True,type=Path)
    options=parser.parse_args()
    state={"state":"ready"}
    csrf=secrets.token_urlsafe(32)
    def save():
        options.status_file.write_text(json.dumps(state),encoding="utf-8")
    def worker(token):
        try:
            configure(token,options.workdir)
            state.update(state="configured",code="configured")
        except Exception:
            state.update(state="failed",code="configuration_not_confirmed")
        finally:
            save()
    class Handler(SecureLocalHandler):
        def do_GET(self):
            if not self.trusted():
                return self.reply("Acesso indisponível.",403)
            if self.path=="/" and state["state"]=="ready":
                return self.reply(FORM.replace("CSRF_TOKEN",csrf))
            if self.path=="/status":
                if state["state"]=="configuring":
                    return self.reply('<meta http-equiv="refresh" content="3"><h1>Cadastrando segredo de produção...</h1><p>Aguarde. Nenhum backup será executado.</p>')
                if state["state"]=="configured":
                    return self.reply("<h1>Segredo cadastrado somente em produção.</h1><p>Pode fechar e avisar no chat. Nenhum backup foi iniciado e nenhum segredo foi publicado.</p>")
                return self.reply("<h1>Cadastro não confirmado.</h1><p>Informe somente o código configuration_not_confirmed. Não envie o token.</p>",400)
            self.reply("Acesso indisponível.",403)
        def do_POST(self):
            origin="http://127.0.0.1:"+str(self.server.server_port)
            try:
                length=int(self.headers.get("Content-Length","0"))
                if not self.trusted() or self.path!="/configure" or self.headers.get("Origin")!=origin or not 0<length<=4096 or state["state"]!="ready":
                    return self.reply("Acesso indisponível.",403)
                fields=parse_qs(self.rfile.read(length).decode(),max_num_fields=2)
                if not hmac.compare_digest(fields.get("csrf",[""])[0],csrf):
                    return self.reply("Acesso indisponível.",403)
                token=fields.get("token",[""])[0].strip()
                state["state"]="configuring";save()
                threading.Thread(target=worker,args=(token,),daemon=True).start()
                self.send_response(303);self.send_header("Location","/status");self.send_header("Cache-Control","no-store");self.end_headers()
            except Exception:
                self.reply("Cadastro não confirmado. Não envie o token.",400)
    with HTTPServer(("127.0.0.1",0),Handler) as server:
        server.timeout=1
        state["url"]="http://127.0.0.1:"+str(server.server_port)
        save()
        deadline=time.monotonic()+3600
        while time.monotonic()<deadline:
            server.handle_request()

if __name__=="__main__":
    main()
