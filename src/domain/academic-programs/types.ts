export const academicLevels = ["undergraduate", "specialization", "master", "doctorate"] as const;
export type AcademicLevel = (typeof academicLevels)[number];

export const workTypes = ["undergraduate_thesis", "specialization_thesis", "dissertation", "thesis"] as const;
export type WorkType = (typeof workTypes)[number];

export type AcademicProgramSeed = {
  code: string;
  name: string;
  shortName: string;
  level: AcademicLevel;
  workType: WorkType;
  repositoryDepositEnabled: boolean;
  repositoryDocumentTypeLabel: string | null;
  repositoryAcademicDegreeLabel: string | null;
  repositoryCollectionLabel: string | null;
};
