from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Organiza arquivos PDF em pastas por ano."
    )
    parser.add_argument(
        "origem",
        nargs="?",
        default=".",
        help="Pasta onde os PDFs estão. Padrão: pasta atual.",
    )
    parser.add_argument(
        "--destino",
        default=None,
        help="Pasta de destino. Padrão: a própria pasta de origem.",
    )
    parser.add_argument(
        "--criterio",
        choices=("modificacao", "criacao"),
        default="modificacao",
        help="Qual data usar para descobrir o ano do arquivo.",
    )
    parser.add_argument(
        "--copiar",
        action="store_true",
        help="Copia os PDFs em vez de mover.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mostra o que seria feito sem alterar arquivos.",
    )
    return parser.parse_args()


def obter_ano(pdf: Path, criterio: str) -> str:
    stat = pdf.stat()
    timestamp = stat.st_mtime if criterio == "modificacao" else stat.st_ctime
    return str(__import__("datetime").datetime.fromtimestamp(timestamp).year)


def nome_unico(destino: Path) -> Path:
    if not destino.exists():
        return destino

    contador = 1
    while True:
        candidato = destino.with_name(f"{destino.stem}_{contador}{destino.suffix}")
        if not candidato.exists():
            return candidato
        contador += 1


def organizar_pdfs(
    origem: Path, destino_base: Path, criterio: str, copiar: bool, dry_run: bool
) -> tuple[int, int]:
    pdfs = sorted(
        arquivo
        for arquivo in origem.iterdir()
        if arquivo.is_file() and arquivo.suffix.lower() == ".pdf"
    )

    total = len(pdfs)
    processados = 0

    for pdf in pdfs:
        ano = obter_ano(pdf, criterio)
        pasta_destino = destino_base / ano
        arquivo_destino = nome_unico(pasta_destino / pdf.name)

        acao = "COPIAR" if copiar else "MOVER"
        print(f"[{acao}] {pdf} -> {arquivo_destino}")

        if dry_run:
            processados += 1
            continue

        pasta_destino.mkdir(parents=True, exist_ok=True)
        if copiar:
            shutil.copy2(pdf, arquivo_destino)
        else:
            shutil.move(str(pdf), str(arquivo_destino))
        processados += 1

    return total, processados


def main() -> None:
    args = parse_args()
    origem = Path(args.origem).expanduser().resolve()
    destino_base = (
        Path(args.destino).expanduser().resolve() if args.destino else origem
    )

    if not origem.exists() or not origem.is_dir():
        raise SystemExit(f"Pasta de origem inválida: {origem}")

    total, processados = organizar_pdfs(
        origem=origem,
        destino_base=destino_base,
        criterio=args.criterio,
        copiar=args.copiar,
        dry_run=args.dry_run,
    )

    if total == 0:
        print("Nenhum PDF encontrado na pasta informada.")
        return

    print(f"\nPDFs encontrados: {total}")
    print(f"PDFs processados: {processados}")
    print(f"Critério usado: {args.criterio}")
    print(f"Destino base: {destino_base}")


if __name__ == "__main__":
    main()
