import { bigint, boolean, date, integer, jsonb, pgEnum, pgTable, text, time, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["student", "cataloger", "administrator"]);
export const accountStatus = pgEnum("account_status", ["active", "blocked", "inactive"]);
export const academicLevel = pgEnum("academic_level", ["undergraduate", "specialization", "master", "doctorate"]);
export const workType = pgEnum("work_type", ["undergraduate_thesis", "specialization_thesis", "dissertation", "thesis"]);
export const announcementType = pgEnum("announcement_type", ["normal", "recess", "strike", "other", "holiday", "optional_day"]);
export const requestStatus = pgEnum("request_status", ["submitted", "in_review", "changes_requested", "approved", "completed", "canceled"]);
export const nadaConstaStatus = pgEnum("nada_consta_status", ["pending", "approved", "rejected", "purged"]);
export const personRole = pgEnum("person_role", ["author", "advisor", "coadvisor"]);
export const physicalExtentUnit = pgEnum("physical_extent_unit", ["pages", "volumes"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: userRole("role").default("student").notNull(),
  status: accountStatus("status").default("active").notNull(),
  avatarChoice: integer("avatar_choice"),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
  ...timestamps,
});

export const permissionDefinitions = pgTable("permission_definitions", {
  code: text("code").primaryKey(),
  area: text("area").notNull(),
  screen: text("screen").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  defaultRoles: userRole("default_roles").array().default([]).notNull(),
  professionalOnly: boolean("professional_only").default(false).notNull(),
  delegable: boolean("delegable").default(true).notNull(),
});

export const staffPermissionOverrides = pgTable("staff_permission_overrides", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  permissionCode: text("permission_code").references(() => permissionDefinitions.code).notNull(),
  effect: text("effect").notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow().notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  grantedBy: uuid("granted_by").references(() => profiles.id).notNull(),
});

export const staffInheritedRoles = pgTable("staff_inherited_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  inheritedRole: userRole("inherited_role").notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }).defaultNow().notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  grantedBy: uuid("granted_by").references(() => profiles.id).notNull(),
});

export const studentProfiles = pgTable("student_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }).notNull().unique(),
  cpf: text("cpf").notNull().unique(),
  birthDate: date("birth_date"),
  ...timestamps,
});

export const academicEnrollments = pgTable("academic_enrollments", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentProfileId: uuid("student_profile_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  academicProgramId: uuid("academic_program_id").references(() => academicPrograms.id).notNull(),
  registrationNumber: text("registration_number").notNull(),
  ...timestamps,
}, (table) => [uniqueIndex("academic_enrollments_student_program_registration_key").on(table.studentProfileId, table.academicProgramId, table.registrationNumber)]);

export const catalogingRequests = pgTable("cataloging_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentProfileId: uuid("student_profile_id").references(() => studentProfiles.id, { onDelete: "restrict" }).notNull(),
  academicEnrollmentId: uuid("academic_enrollment_id").references(() => academicEnrollments.id, { onDelete: "restrict" }).notNull(),
  protocol: text("protocol").notNull().unique(),
  status: requestStatus("status").default("submitted").notNull(),
  assignedTo: uuid("assigned_to").references(() => profiles.id, { onDelete: "restrict" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  equivalentTitle: text("equivalent_title"),
  otherTitles: jsonb("other_titles").$type<string[]>().default([]).notNull(),
  publicWorkUrl: text("public_work_url").notNull(),
  specialCases: jsonb("special_cases").$type<string[]>().default([]).notNull(),
  volumeInformation: text("volume_information"),
  libraryNote: text("library_note"),
  defendedAndApproved: boolean("defended_and_approved").notNull(),
  finalFileConfirmed: boolean("final_file_confirmed").notNull(),
  approvalPageConfirmed: boolean("approval_page_confirmed").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
});

export const requestCardDetails = pgTable("request_card_details", {
  requestId: uuid("request_id").primaryKey().references(() => catalogingRequests.id, { onDelete: "cascade" }),
  depositYear: integer("deposit_year").notNull(),
  defenseYear: integer("defense_year").notNull(),
  extentUnit: physicalExtentUnit("extent_unit").notNull(),
  extentCount: integer("extent_count").notNull(),
  hasIllustrations: boolean("has_illustrations").default(false).notNull(),
  publicationPlace: text("publication_place").default("Salvador").notNull(),
  advisorNoteLabel: text("advisor_note_label").notNull(),
  coadvisorNoteLabel: text("coadvisor_note_label"),
  ...timestamps,
});

export const requestAnalyses = pgTable("request_analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "cascade" }).notNull().unique(),
  analysisNotes: text("analysis_notes").default("").notNull(),
  internalNote: text("internal_note").default("").notNull(),
  lastEditedBy: uuid("last_edited_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(),
  reviewCompletedAt: timestamp("review_completed_at", { withTimezone: true }),
  reviewCompletedBy: uuid("review_completed_by").references(() => profiles.id, { onDelete: "restrict" }),
  citationText: text("citation_text"),
  citationSourceSignature: text("citation_source_signature"),
  citationValidatedAt: timestamp("citation_validated_at", { withTimezone: true }),
  citationValidatedBy: uuid("citation_validated_by").references(() => profiles.id, { onDelete: "restrict" }),
  ...timestamps,
});

export const requestDirectCorrectionBaselines = pgTable("request_direct_correction_baselines", {
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "cascade" }).notNull(),
  fieldKey: text("field_key").notNull(),
  originalValue: jsonb("original_value").notNull(),
  correctedBy: uuid("corrected_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("request_direct_correction_baselines_pkey").on(table.requestId, table.fieldKey)]);

export const issueTemplates = pgTable("issue_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  message: text("message").notNull(),
  fieldKeys: text("field_keys").array().default([]).notNull(),
  active: boolean("active").default(true).notNull(),
  position: integer("position").default(0).notNull(),
  ...timestamps,
});

export const requestRevisionRounds = pgTable("request_revision_rounds", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "cascade" }).notNull(),
  roundNumber: integer("round_number").notNull(),
  returnedBy: uuid("returned_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(),
  returnedAt: timestamp("returned_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  ...timestamps,
});

export const requestFieldIssues = pgTable("request_field_issues", {
  id: uuid("id").defaultRandom().primaryKey(),
  revisionRoundId: uuid("revision_round_id").references(() => requestRevisionRounds.id, { onDelete: "cascade" }).notNull(),
  fieldKey: text("field_key").notNull(),
  fieldLabel: text("field_label").notNull(),
  templateId: uuid("template_id").references(() => issueTemplates.id, { onDelete: "restrict" }),
  justification: text("justification").notNull(),
  originalValue: jsonb("original_value").$type<unknown>(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  ...timestamps,
});

export const requestCorrections = pgTable("request_corrections", {
  id: uuid("id").defaultRandom().primaryKey(),
  revisionRoundId: uuid("revision_round_id").references(() => requestRevisionRounds.id, { onDelete: "cascade" }).notNull(),
  fieldKey: text("field_key").notNull(),
  previousValue: jsonb("previous_value").$type<unknown>(),
  correctedValue: jsonb("corrected_value").$type<unknown>(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailOutbox = pgTable("email_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "cascade" }).notNull(),
  eventType: text("event_type").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  textBody: text("text_body").notNull(),
  status: text("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  lastError: text("last_error"),
  ...timestamps,
});

export const privacyNoticeAcknowledgements = pgTable("privacy_notice_acknowledgements", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }).notNull(),
  noticeVersion: text("notice_version").notNull(),
  source: text("source").notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("privacy_notice_acknowledgements_profile_version_key").on(table.profileId, table.noticeVersion)]);

export const accountNotificationOutbox = pgTable("account_notification_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetUserId: uuid("target_user_id").notNull(),
  recipient: text("recipient").notNull(), subject: text("subject").notNull(), textBody: text("text_body").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(), status: text("status").default("pending").notNull(), attempts: integer("attempts").default(0).notNull(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }), lastError: text("last_error"), ...timestamps,
});

export const requestPeople = pgTable("request_people", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "cascade" }).notNull(),
  role: personRole("role").notNull(),
  transcribedName: text("transcribed_name").notNull(),
  authorizedName: text("authorized_name"),
  birthYear: integer("birth_year"),
  birthYearAcknowledgedAt: timestamp("birth_year_acknowledged_at", { withTimezone: true }),
  birthYearValidatedAt: timestamp("birth_year_validated_at", { withTimezone: true }),
  birthYearValidatedBy: uuid("birth_year_validated_by").references(() => profiles.id, { onDelete: "restrict" }),
  position: integer("position").default(0).notNull(),
  ...timestamps,
});

export const requestKeywords = pgTable("request_keywords", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "cascade" }).notNull(),
  language: text("language").notNull(),
  term: text("term").notNull(),
  position: integer("position").default(0).notNull(),
  ...timestamps,
});

export const personAuthorities = pgTable("person_authorities", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorizedName: text("authorized_name").notNull(),
  normalizedName: text("normalized_name").notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(),
  ...timestamps,
});

export const requestCatalogingPeople = pgTable("request_cataloging_people", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "cascade" }).notNull(),
  authorityPersonId: uuid("authority_person_id").references(() => personAuthorities.id, { onDelete: "restrict" }).notNull(),
  role: text("role").notNull(),
  transcribedName: text("transcribed_name").notNull(),
  authorizedNameSnapshot: text("authorized_name_snapshot").notNull(),
  position: integer("position").default(0).notNull(),
  ...timestamps,
});

export const controlledTerms = pgTable("controlled_terms", {
  id: uuid("id").defaultRandom().primaryKey(),
  preferredLabelPt: text("preferred_label_pt").notNull(),
  normalizedLabelPt: text("normalized_label_pt").notNull().unique(),
  preferredLabelEn: text("preferred_label_en"),
  normalizedLabelEn: text("normalized_label_en"),
  active: boolean("active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(),
  ...timestamps,
});

export const requestControlledTerms = pgTable("request_controlled_terms", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "cascade" }).notNull(),
  controlledTermId: uuid("controlled_term_id").references(() => controlledTerms.id, { onDelete: "restrict" }).notNull(),
  labelPtSnapshot: text("label_pt_snapshot").notNull(),
  labelEnSnapshot: text("label_en_snapshot"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  position: integer("position").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const requestCatalogingMetadata = pgTable("request_cataloging_metadata", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "cascade" }).notNull().unique(),
  cduCode: text("cdu_code"),
  cutterCode: text("cutter_code"),
  marc21Preparation: jsonb("marc21_preparation").$type<Record<string, unknown>>().default({}).notNull(),
  lastEditedBy: uuid("last_edited_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(),
  ...timestamps,
});

export const catalogingCardHomologations = pgTable("cataloging_card_homologations", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "restrict" }).notNull().unique(),
  publicToken: uuid("public_token").defaultRandom().notNull().unique(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  layoutVersion: text("layout_version").default("provisional-v1").notNull(),
  homologatedBy: uuid("homologated_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(),
  librarianNameSnapshot: text("librarian_name_snapshot").notNull(),
  librarianCrbSnapshot: text("librarian_crb_snapshot").notNull(),
  homologatedAt: timestamp("homologated_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const nadaConstaDocuments = pgTable("nada_consta_documents", {
  id: uuid("id").defaultRandom().primaryKey(), requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "restrict" }).notNull(),
  objectPath: text("object_path"), originalName: text("original_name").notNull(), sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(), mimeType: text("mime_type").notNull(), sha256: text("sha256").notNull(),
  status: nadaConstaStatus("status").default("pending").notNull(), uploadedBy: uuid("uploaded_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(), uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  validatedBy: uuid("validated_by").references(() => profiles.id, { onDelete: "restrict" }), validatedAt: timestamp("validated_at", { withTimezone: true }), rejectionReason: text("rejection_reason"), releasedAt: timestamp("released_at", { withTimezone: true }), purgeAfter: timestamp("purge_after", { withTimezone: true }), purgedAt: timestamp("purged_at", { withTimezone: true }), ...timestamps,
});

export const repositoryDepositProgress = pgTable("repository_deposit_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "restrict" }).notNull().unique(),
  startedBy: uuid("started_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
});

export const repositoryPublications = pgTable("repository_publications", {
  id: uuid("id").defaultRandom().primaryKey(), requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "restrict" }).notNull().unique(),
  permanentUrl: text("permanent_url").notNull(), verifiedBy: uuid("verified_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(), verifiedAt: timestamp("verified_at", { withTimezone: true }).defaultNow().notNull(), ...timestamps,
});

export const staffProfiles = pgTable("staff_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }).notNull().unique(),
  professionalName: text("professional_name").notNull(),
  crb: text("crb").notNull(),
  availableForAssignment: boolean("available_for_assignment").default(true).notNull(),
  ...timestamps,
});

export const academicPrograms = pgTable("academic_programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  level: academicLevel("level").notNull(),
  workType: workType("work_type").notNull(),
  active: boolean("active").default(true).notNull(),
  serviceLevelBusinessDays: integer("service_level_business_days").default(3).notNull(),
  repositoryDepositEnabled: boolean("repository_deposit_enabled").default(true).notNull(),
  coordinationMagicLinkEnabled: boolean("coordination_magic_link_enabled").default(false).notNull(),
  coordinationIssueEmailsEnabled: boolean("coordination_issue_emails_enabled").default(false).notNull(),
  repositoryCollectionLabel: text("repository_collection_label"),
  repositoryDocumentTypeLabel: text("repository_document_type_label"),
  repositoryAcademicDegreeLabel: text("repository_academic_degree_label"),
  repositoryInstitutionLabel: text("repository_institution_label").default("Universidade Federal da Bahia").notNull(),
  repositoryInstitutionAcronym: text("repository_institution_acronym").default("UFBA").notNull(),
  repositoryUnitLabel: text("repository_unit_label").default("Faculdade de Arquitetura").notNull(),
  repositoryProgramLabel: text("repository_program_label"),
  repositoryCountryLabel: text("repository_country_label").default("Brasil").notNull(),
  repositoryDefaultLanguageLabel: text("repository_default_language_label").default("Português").notNull(),
  catalogingProgramTracing: text("cataloging_program_tracing"),
  ...timestamps,
});

export const coordinationContacts = pgTable("coordination_contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  academicProgramId: uuid("academic_program_id").references(() => academicPrograms.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  active: boolean("active").default(true).notNull(),
  receivesOpeningEmails: boolean("receives_opening_emails").default(true).notNull(),
  receivesIssueEmails: boolean("receives_issue_emails").default(false).notNull(),
  receivesCompletionEmails: boolean("receives_completion_emails").default(true).notNull(),
  ...timestamps,
});

export const coordinationMagicLinks = pgTable("coordination_magic_links", {
  id: uuid("id").defaultRandom().primaryKey(), requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "cascade" }).notNull(), coordinationContactId: uuid("coordination_contact_id").references(() => coordinationContacts.id, { onDelete: "restrict" }).notNull(),
  tokenHash: text("token_hash").notNull().unique(), issuedBy: uuid("issued_by").references(() => profiles.id, { onDelete: "restrict" }).notNull(), issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(), invalidatedAt: timestamp("invalidated_at", { withTimezone: true }), finalCommunicatedAt: timestamp("final_communicated_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const libraryAnnouncements = pgTable("library_announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: announcementType("type").default("normal").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  active: boolean("active").default(true).notNull(),
  createdBy: uuid("created_by").references(() => profiles.id),
  calendarSource: text("calendar_source").default("manual").notNull(),
  sourceReference: text("source_reference"),
  ...timestamps,
});

export const libraryDailyHours = pgTable("library_daily_hours", {
  serviceDate: date("service_date").primaryKey(),
  closingTime: time("closing_time").notNull(),
  updatedBy: uuid("updated_by").references(() => profiles.id).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const studentRequestDrafts = pgTable("student_request_drafts", {
  userId: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const requestAnalysisDrafts = pgTable("request_analysis_drafts", {
  requestId: uuid("request_id").primaryKey().references(() => catalogingRequests.id, { onDelete: "cascade" }),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const slaSettings = pgTable("sla_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  academicProgramId: uuid("academic_program_id").references(() => academicPrograms.id, { onDelete: "cascade" }),
  businessDays: integer("business_days").default(3).notNull(),
  active: boolean("active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).defaultNow().notNull(),
  ...timestamps,
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => profiles.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
});

export const staffNotifications = pgTable("staff_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipientId: uuid("recipient_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "set null" }),
  sourceKey: text("source_key").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  href: text("href").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("staff_notifications_recipient_source").on(table.recipientId, table.sourceKey)]);

export const staffMessages = pgTable("staff_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  recipientId: uuid("recipient_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  requestId: uuid("request_id").references(() => catalogingRequests.id, { onDelete: "set null" }),
  body: text("body").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
