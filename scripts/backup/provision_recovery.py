"""Local recovery-key handoff. Only the public recipient is sent to GitHub."""
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
import tempfile
import time
from urllib.parse import parse_qs

from provision_b2 import ENVIRONMENT, REPOSITORY, make_handler, require_disabled
from provision_supabase import FORM
from run_backup import BackupError, require

FILE_NAME = "pronto-recuperacao-backup.txt"
PAGE = FORM.partition("<main>")[0].replace("Banco do Pronto!", "Recuperação do Pronto!") + """<main>
<h1>Guardar a chave de recuperação dos backups</h1>
<p>A parte privada será gerada somente neste computador e entregue em um arquivo. Ela não será
cadastrada no GitHub nem no Backblaze. O GitHub receberá apenas a parte pública para criptografar as cópias.</p>
<ol><li>Clique em <b>Gerar e baixar chave</b>. O arquivo se chama <b>pronto-recuperacao-backup.txt</b>.</li>
<li>Guarde o arquivo no gerenciador de senhas, como anexo ou copiando pessoalmente seu conteúdo para uma nota segura.
Use o título <b>Pronto! — recuperação dos backups</b>.</li>
<li>Confira que a nota foi salva. Depois marque a confirmação abaixo e clique em <b>Concluir</b>.</li></ol>
<p>Essa chave permite abrir as cópias: guarde-a com cuidado. Não envie o arquivo ou seu conteúdo pelo chat.
Se pedir o download novamente nesta página, você receberá a mesma chave.</p>
<form method="post" action="/download" autocomplete="off"><input type="hidden" name="csrf" value="CSRF_TOKEN">
<button type="submit">Gerar e baixar chave</button></form>
<form method="post" action="/confirm" autocomplete="off"><input type="hidden" name="csrf" value="CSRF_TOKEN">
<label><input type="checkbox" name="saved" value="yes" required style="width:auto"> Guardei e conferi a chave no meu gerenciador de senhas.</label>
<button type="submit">Concluir e cadastrar somente a parte pública</button></form>
<small>O backup continuará desativado. A página encerra após concluir ou após 30 minutos.
Após concluir, remova pessoalmente a cópia solta de Downloads, mantendo a versão no gerenciador.
A recuperação institucional e o acesso de um substituto ainda precisam ser definidos.</small></main></html>"""


def command(arguments, data=None):
    result = subprocess.run([str(value) for value in arguments], input=data,
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=60,
                            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    require(result.returncode == 0, "recovery_tool_failed")
    return result.stdout


def generate_pair(age, keygen):
    # The identity never becomes a command argument, log entry or local temp file.
    identity = command([keygen])
    require(len(identity) < 4096 and b"AGE-SECRET-KEY-1" in identity, "invalid_recovery_identity")
    recipient = command([keygen, "-y"], identity).decode("ascii").strip()
    require(re.fullmatch(r"age1[0-9a-z]{58}", recipient) is not None, "invalid_public_recipient")
    sample = b"Pronto: synthetic recovery proof, no production data."
    encrypted = command([age, "--encrypt", "-r", recipient], sample)
    with tempfile.TemporaryDirectory(prefix="pronto-recovery-check-") as directory:
        # Only ciphertext touches temporary storage. The identity stays on stdin.
        archive = Path(directory) / "synthetic.age"
        archive.write_bytes(encrypted)
        recovered = command([age, "--decrypt", "-i", "-", archive], identity)
    require(hmac.compare_digest(recovered, sample), "recovery_self_test_failed")
    return recipient, identity


def require_new_recipient(gh):
    require_disabled(gh)
    names = command([gh, "variable", "list", "--repo", REPOSITORY, "--env", ENVIRONMENT, "--json", "name"])
    require(not any(item["name"] == "BACKUP_AGE_RECIPIENT" for item in json.loads(names)),
            "existing_recipient_requires_controlled_rotation")


def save_recipient(gh, recipient):
    require_new_recipient(gh)
    command([gh, "variable", "set", "BACKUP_AGE_RECIPIENT", "--repo", REPOSITORY, "--env", ENVIRONMENT], recipient.encode("ascii"))


def recovery_handler(status, csrf, state, age, keygen, gh):
    base = make_handler(status, csrf, state)

    class Handler(base):
        def do_GET(self):
            if not self.trusted() or self.path != "/":
                self.reply("Acesso indisponível.", 403)
                return
            self.reply(PAGE.replace("CSRF_TOKEN", csrf))

        def do_POST(self):
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            origin = "http://127.0.0.1:" + str(self.server.server_port)
            if (not self.trusted() or self.headers.get("Origin") != origin
                    or self.path not in {"/download", "/confirm"} or not 0 < length <= 4096):
                self.reply("Acesso indisponível.", 403)
                return
            try:
                fields = parse_qs(self.rfile.read(length).decode("utf-8"), max_num_fields=2)
                require(hmac.compare_digest(fields.get("csrf", [""])[0], csrf), "invalid_local_form")
                require(not state["done"], "setup_already_completed")
                if self.path == "/download":
                    if state.get("identity") is None:
                        require_new_recipient(gh)
                        state["recipient"], state["identity"] = generate_pair(age, keygen)
                    self.reply(state["identity"], content_type="application/octet-stream", download_name=FILE_NAME)
                    state["downloaded"] = True
                    status.write_text(json.dumps({"ok": True, "code": "download_delivered"}), encoding="utf-8")
                    return
                require(state.get("downloaded") and fields.get("saved") == ["yes"], "save_recovery_key_first")
                save_recipient(gh, state["recipient"])
                state["done"] = True
                state["identity"] = None
                status.write_text(json.dumps({"ok": True, "code": "public_recipient_configured"}), encoding="utf-8")
                self.reply("<h1>Parte pública cadastrada no GitHub.</h1><p>A parte privada ficou com você. O backup continua desativado.</p>")
            except Exception as error:
                code = str(error) if isinstance(error, BackupError) else "recovery_setup_failed"
                status.write_text(json.dumps({"ok": False, "code": code}), encoding="utf-8")
                self.reply("<h1>Etapa não concluída.</h1><p>Código: " + code + ". Não envie a chave ou o arquivo pelo chat.</p>", 400)
    return Handler


def main():
    parser = argparse.ArgumentParser(description="Entrega local da chave de recuperação")
    parser.add_argument("status_file", type=Path)
    parser.add_argument("--age-directory", required=True, type=Path)
    options = parser.parse_args()
    age, keygen = options.age_directory / "age.exe", options.age_directory / "age-keygen.exe"
    gh = shutil.which("gh")
    require(age.is_file() and keygen.is_file() and gh is not None, "recovery_tools_missing")
    state = {"done": False}
    handler = recovery_handler(options.status_file, secrets.token_urlsafe(32), state, age, keygen, gh)
    with HTTPServer(("127.0.0.1", 0), handler) as server:
        server.timeout = 1
        options.status_file.write_text(json.dumps({"ready": True, "url": "http://127.0.0.1:" + str(server.server_port)}), encoding="utf-8")
        deadline = time.monotonic() + 1800
        while not state["done"] and time.monotonic() < deadline:
            server.handle_request()
    state.clear()


if __name__ == "__main__":
    main()
