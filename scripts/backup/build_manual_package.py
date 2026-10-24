"""Build a pre-provisioned portable Windows toolkit; never package credentials."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from zipfile import ZipFile

from run_backup import require

APP_FILES = ("manual_server.py", "manual_backup.py", "local_http.py", "run_backup.py", "preflight.py")


def build(vendors, age_directory, configuration, output):
    require(not output.exists(), "package_directory_already_exists")
    public = json.loads(configuration.read_text(encoding="utf-8"))
    require(set(public) == {"project_url", "recipient", "ca_certificate"}, "public_configuration_only")
    output.mkdir(parents=True)
    python, tools, app = output / "python", output / "tools", output / "app"
    python.mkdir()
    tools.mkdir()
    app.mkdir()
    with ZipFile(vendors / "python.zip") as archive:
        archive.extractall(python)
    pth = python / "python314._pth"
    pth.write_text("python314.zip\n.\ndeps\n../app\n", encoding="ascii")
    with ZipFile(vendors / "postgresql.zip") as archive:
        for item in archive.infolist():
            name = Path(item.filename)
            if name.parent.as_posix() == "pgsql/bin" and (name.suffix.lower() == ".dll" or name.name in {"pg_dump.exe", "pg_dumpall.exe", "pg_restore.exe"}):
                (tools / name.name).write_bytes(archive.read(item))
            if "copyright" in name.name.lower() and not item.is_dir():
                target = output / "licenses" / "postgresql"
                target.mkdir(parents=True, exist_ok=True)
                (target / name.name).write_bytes(archive.read(item))
    shutil.copy2(age_directory / "age.exe", tools / "age.exe")
    for name in ("LICENSE", "LICENSE.txt"):
        if (age_directory / name).is_file():
            target = output / "licenses" / "age"
            target.mkdir(parents=True, exist_ok=True)
            shutil.copy2(age_directory / name, target / name)
    for name in APP_FILES:
        shutil.copy2(Path(__file__).parent / name, app / name)
    (output / "config.json").write_text(json.dumps(public, indent=2), encoding="utf-8")
    # Isolated current pip wheel, downloaded and hash-checked from python.org's
    # release instructions. Never replace the operator's system installation.
    environment = dict(os.environ, PYTHONPATH=str((vendors / "pip.whl").resolve()))
    result = subprocess.run([sys.executable, "-m", "pip", "install", "--disable-pip-version-check", "--only-binary=:all:",
                             "--implementation", "cp", "--python-version", "3.14", "--platform", "win_amd64",
                             "--target", str(python / "deps"), "--no-compile", "psycopg[binary]==3.3.6"],
                            env=environment, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=180)
    require(result.returncode == 0, "portable_dependency_install_failed")
    (output / "Iniciar backup manual.cmd").write_text('@echo off\r\nstart "" /b "%~dp0python\\pythonw.exe" "%~dp0app\\manual_server.py" --config "%~dp0config.json"\r\n', encoding="ascii")
    (output / "LEIA-ME.txt").write_text(
        "Pronto! - backup manual independente\n\n"
        "1. Extraia toda a pasta para um local privado fora do repositorio.\n"
        "2. Abra Iniciar backup manual.cmd.\n"
        "3. Informe os acessos de producao guardados no gerenciador e escolha uma pasta privada ou disco externo.\n"
        "4. Aguarde a confirmacao. Guarde o arquivo .age e o recibo .json juntos.\n\n"
        "Nao precisa de GitHub, B2, Healthchecks, Codex ou painel do Pronto durante a geracao. Precisa de Supabase e internet.\n"
        "Prepare o pacote e guarde os acessos antes de uma indisponibilidade. Nao ha senhas, tokens ou chave privada neste pacote.\n"
        "A copia e criptografada para a parte publica configurada. Guarde a identidade privada separada no gerenciador.\n"
        "Os arquivos devem ser eliminados ao fim de 90 dias pelo responsavel. Disco desconectado nao expurga sozinho.\n"
        "Recibo de integridade nao comprova restauracao. Recuperacao deve ser ensaiada isoladamente.\n"
        "Nenhuma restauracao em producao ou agenda automatica e acionada pelo pacote.\n", encoding="utf-8")
    manifest = {str(path.relative_to(output)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in output.rglob("*") if path.is_file()}
    (output / "integridade-pacote.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    shutil.make_archive(str(output), "zip", output.parent, output.name)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Montar pacote portatil de contingencia")
    parser.add_argument("--vendors", required=True, type=Path)
    parser.add_argument("--age-directory", required=True, type=Path)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    options = parser.parse_args()
    build(options.vendors, options.age_directory, options.config, options.output)
    print("Pacote portatil criado sem credenciais privadas.")
