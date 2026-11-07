import { authorityAsIso2709, authorityAsMarcXml, type PublicAuthority } from "../../src/lib/public-subject-authority.ts";

const record: PublicAuthority = {
  id: "00000000-0000-4000-8000-000000000001", label: "Habitação e praça", label_en: "Housing and square",
  source: "pronto", source_identifier: null, source_url: null, origin: "manual", heading_type: "topic",
  components: [{ kind: "main", value: "Habitação e praça" }],
  variants: [{ value: "Moradia e espaço público", language: "pt" }], notes: [{ kind: "680", value: "Construção e convivência." }],
  relations: [], rights_statement: "Teste", published_at: "2026-11-05T10:00:00.000Z",
  marc_mapping: { heading_ind1: " ", variant_ind1: [" "], relation_ind1: [] },
};

process.stdout.write(JSON.stringify({
  first: Buffer.from(authorityAsIso2709(record)).toString("base64"),
  second: Buffer.from(authorityAsIso2709({ ...record, id: "00000000-0000-4000-8000-000000000002", label: "Urbanização", components: [{ kind: "main", value: "Urbanização" }] })).toString("base64"),
  xml: authorityAsMarcXml(record),
}));
