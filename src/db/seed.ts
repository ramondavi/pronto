import { db } from "./index";
import { academicPrograms } from "./schema";
import { initialAcademicPrograms } from "@/domain/academic-programs/seeds";

export async function seedAcademicPrograms() {
  await db
    .insert(academicPrograms)
    .values(initialAcademicPrograms.map((program) => ({
      ...program,
      serviceLevelBusinessDays: 3,
      repositoryInstitutionLabel: "Universidade Federal da Bahia",
      repositoryInstitutionAcronym: "UFBA",
      repositoryUnitLabel: "Faculdade de Arquitetura",
      repositoryProgramLabel: program.name,
      repositoryCountryLabel: "Brasil",
      repositoryDefaultLanguageLabel: "Português",
    })))
    .onConflictDoNothing({ target: academicPrograms.code });
}
