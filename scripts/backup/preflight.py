"""Manual read-only access checks. No record export, object upload or heartbeat."""
from __future__ import annotations

import json
import os
import subprocess
import sys

from run_backup import BackupError, BackupStore, check_environment, database_tls, require, safe_request


def check_database(connect):
    with database_tls(), connect() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SHOW transaction_read_only")
            require(cursor.fetchone()[0] == "on", "readonly_connection_required")
            cursor.execute("SELECT 1")
            require(cursor.fetchone() == (1,), "database_connection_not_confirmed")
            cursor.execute("SHOW server_version_num")
            require(170000 <= int(cursor.fetchone()[0]) < 180000, "postgresql_17_required")


def check_storage():
    # Read only bucket configuration. Never list or download its documents here.
    token = os.environ["BACKUP_STORAGE_READ_TOKEN"]
    headers = {"apikey": token}
    if not token.startswith("sb_secret_"):
        headers["Authorization"] = "Bearer " + token
    endpoint = os.environ["SUPABASE_URL"].rstrip("/") + "/storage/v1/bucket/nada-consta"
    with safe_request(endpoint, headers=headers) as response:
        require(response.status == 200, "storage_access_not_confirmed")
        body = response.read(16385)
    require(len(body) <= 16384, "unexpected_storage_metadata")
    bucket = json.loads(body)
    require(bucket.get("id") == "nada-consta" and bucket.get("public") is False,
            "private_document_bucket_required")


def check_public_recipient():
    result = subprocess.run(["age", "--encrypt", "-r", os.environ["BACKUP_AGE_RECIPIENT"]],
                            input=b"Pronto: synthetic recipient check, no production data.",
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20)
    require(result.returncode == 0 and result.stdout.startswith(b"age-encryption.org/v1"),
            "public_recipient_not_accepted")


def main():
    os.umask(0o077)
    stage = "configuracao"
    try:
        check_environment()
        import boto3
        from botocore.config import Config
        import psycopg
        stage = "banco"
        def connect():
            return psycopg.connect(autocommit=True, connect_timeout=15, application_name="pronto-backup-preflight",
                                   options="-c default_transaction_read_only=on -c statement_timeout=15000")
        check_database(connect)
        print("Banco: conexao TLS verificada, somente leitura; nenhuma ficha consultada.")
        stage = "armazenamento_b2"
        client = boto3.client("s3", endpoint_url=os.environ["B2_ENDPOINT"], region_name=os.environ["B2_REGION"],
                              aws_access_key_id=os.environ["B2_KEY_ID"], aws_secret_access_key=os.environ["B2_APPLICATION_KEY"],
                              config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"},
                                            request_checksum_calculation="when_required", response_checksum_validation="when_required"))
        store = BackupStore(client, os.environ["B2_BUCKET"], os.environ["BACKUP_SOURCE_ID"])
        store.validate()
        print("B2: bucket privado, retencao e ciclo de vida conferidos; nenhum envio realizado.")
        stage = "documentos_privados"
        check_storage()
        print("Storage: acesso a configuracao do bucket privado conferido; nenhum PDF consultado.")
        stage = "parte_publica_recuperacao"
        check_public_recipient()
        print("Recuperacao: parte publica aceita para criptografia de conteudo ficticio.")
        print("Verificacao previa concluida. Nenhuma copia criada, nenhum ping enviado; agendamento inalterado.")
        return 0
    except Exception as error:
        code = str(error) if isinstance(error, BackupError) else "access_check_failed"
        print("Verificacao previa interrompida em " + stage + ": " + code + ".", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
