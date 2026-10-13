import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCardContent, catalogedWorkFilename, normalizeCutterCode, prefixBeforeFourthAuthorLetter, type CatalogingCardSnapshot } from "../src/domain/cataloging-card/types.ts";

const originalMigration = readFileSync("supabase/migrations/202608230004_cataloging_card.sql", "utf8");
const institutionalMigration = readFileSync("supabase/migrations/202608260000_cataloging_card_institutional_models.sql", "utf8");
const snapshot: CatalogingCardSnapshot = {
  institution: { university: "Universidade Federal da Bahia (UFBA)", librarySystem: "Sistema Universitário de Bibliotecas (SIBI)", library: "Biblioteca da Faculdade de Arquitetura (BIB/FA)" },
  request: { protocol: "FC2026-0001", title: "A arquitetura do agora", subtitle: "estudo de caso", programName: "Mestrado em Arquitetura e Urbanismo", academicLevel: "master", workNature: "Dissertação", programTracing: "Programa de Pós-Graduação em Arquitetura e Urbanismo", depositYear: 2026, defenseYear: 2025, extentUnit: "pages", extentCount: 204, hasIllustrations: true, publicationPlace: "Salvador" },
  people: [
    { role: "author", transcribedName: "Mateus Gama", authorizedName: "Santos, Mateus Gama dos" },
    { role: "advisor", transcribedName: "Prof. Dr. Carlos Alberto Almeida", authorizedName: "Almeida, Carlos Alberto", noteLabel: "Orientador" },
    { role: "coadvisor", transcribedName: "Profa. Dra. Isabel Figueira da Lima", authorizedName: "Lima, Isabel Figueira da", noteLabel: "Coorientadora" },
  ],
  subjects: [{ labelPt: "Arquitetura moderna - Brasília (DF)", isPrimary: true }],
  classification: { cdu: "72.036(81)", cutter: "S237" },
  technicalResponsibility: { name: "Ramon Davi Santana", crb: "CRB-5/1972" },
  catalogingConventions: { electronicResourceLabel: "[recurso eletrônico]", pageAbbreviation: "p.", volumeAbbreviation: "v.", illustrationAbbreviation: "il.", statementSeparator: "—", academicNoteSeparator: "–", subdivisionSeparator: "-" },
  layoutStatus: "institutional_models_validated",
};

test("compõe título, subtítulo, responsabilidade e depósito na ordem institucional", () => {
  const content = buildCardContent(snapshot);
  assert.equal(content.authorizedAuthor, "Santos, Mateus Gama dos.");
  assert.equal(content.titleStatement, "A arquitetura do agora [recurso eletrônico] : estudo de caso / Mateus Gama. — Salvador, 2026.");
  assert.equal(content.physicalDescription, "204 p. : il.");
});

test("remove os dois-pontos quando não há subtítulo", () => {
  const content = buildCardContent({ ...snapshot, request: { ...snapshot.request, subtitle: null } });
  assert.equal(content.titleStatement, "A arquitetura do agora [recurso eletrônico] / Mateus Gama. — Salvador, 2026.");
});

test("inicia subtítulo comum com minúscula e remove a inicial do título do Cutter", () => {
  const content = buildCardContent({ ...snapshot, request: { ...snapshot.request, subtitle: "Estudo de caso" } });
  assert.match(content.titleStatement, / : estudo de caso \/ Mateus/);
  assert.equal(normalizeCutterCode("S237a"), "S237");
  assert.equal(normalizeCutterCode("S237"), "S237");
});

test("calcula a âncora abaixo da quarta letra da entrada autorizada", () => {
  assert.equal(prefixBeforeFourthAuthorLetter("Santos, Mateus Gama."), "San");
  assert.equal(prefixBeforeFourthAuthorLetter("D'Ávila, Joana."), "D'Áv");
});

test("nomeia o trabalho mesclado por autor, ano e tipo", () => {
  assert.equal(catalogedWorkFilename(snapshot), "santos-mateus-gama-dos-2026-dissertacao.pdf");
});

test("descreve o MP-CECRE por volumes", () => {
  const content = buildCardContent({ ...snapshot, request: { ...snapshot.request, extentUnit: "volumes", extentCount: 3 } });
  assert.equal(content.physicalDescription, "3 v. : il.");
});

test("separa formas transcritas, autorizadas e traçado do programa", () => {
  const content = buildCardContent(snapshot);
  assert.deepEqual(content.notes, ["Orientador: Prof. Dr. Carlos Alberto Almeida.", "Coorientadora: Profa. Dra. Isabel Figueira da Lima."]);
  assert.match(content.tracings, /^1\. Arquitetura moderna - Brasília \(DF\)\./);
  assert.match(content.tracings, /I\. Almeida, Carlos Alberto\./);
  assert.match(content.tracings, /II\. Lima, Isabel Figueira da\./);
  assert.match(content.tracings, /III\. Universidade Federal da Bahia\. Faculdade de Arquitetura\. Programa de Pós-Graduação em Arquitetura e Urbanismo\./);
  assert.match(content.tracings, /IV\. Título\.$/);
});

test("gera nota acadêmica com meia-risca e responsabilidade técnica padronizada", () => {
  const content = buildCardContent(snapshot);
  assert.equal(content.academicNote, "Dissertação – Universidade Federal da Bahia, Faculdade de Arquitetura, Programa de Pós-Graduação em Arquitetura e Urbanismo, Mestrado em Arquitetura e Urbanismo. 2025.");
  assert.equal(content.technicalResponsibility, "Responsável técnico: Ramon Davi Santana - CRB/5-1972");
});

test("preserva o snapshot original e cria a versão institucional sem reescrever histórico", () => {
  assert.match(originalMigration, /cataloging_card_homologation_immutable/);
  assert.match(institutionalMigration, /layout_version, homologated_by/);
  assert.match(institutionalMigration, /'institutional-v2'/);
  assert.match(institutionalMigration, /request_card_details/);
  assert.match(institutionalMigration, /cataloging_program_tracing/);
});

test("mantém homologação condicionada a classificação, autoridades, detalhes e termo principal", () => {
  assert.match(institutionalMigration, /classification_required/);
  assert.match(institutionalMigration, /author_and_advisor_authorities_required/);
  assert.match(institutionalMigration, /card_details_required/);
  assert.match(institutionalMigration, /primary_controlled_term_required/);
});

test("não envia liberação final durante a homologação", () => {
  const functionBody = institutionalMigration.match(/create or replace function public\.homologate_cataloging_card[\s\S]*?revoke all on function/)?.[0] ?? "";
  assert.doesNotMatch(functionBody, /queue_request_release_notice|request_released/);
});
