import { boolean, index, integer, jsonb, numeric, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("neuro_user_role", ["admin", "doctor", "researcher"]);
export const predictionEnum = pgEnum("neuro_prediction", ["Normal", "Seizure"]);
export const riskLevelEnum = pgEnum("neuro_risk_level", ["Low", "Moderate", "High", "Very High"]);
export const reportStatusEnum = pgEnum("neuro_report_status", ["Draft", "Signed", "Archived"]);

export const localUsers = pgTable("neuro_local_users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 220 }).notNull().unique(),
  role: userRoleEnum("role").notNull().default("doctor"),
  passwordHint: varchar("password_hint", { length: 120 }).notNull().default("offline-demo"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const patients = pgTable(
  "neuro_patients",
  {
    id: serial("id").primaryKey(),
    externalId: varchar("external_id", { length: 80 }).notNull().unique(),
    name: varchar("name", { length: 180 }).notNull(),
    age: integer("age").notNull(),
    sex: varchar("sex", { length: 32 }).notNull(),
    diagnosis: varchar("diagnosis", { length: 220 }).notNull(),
    medication: text("medication").notNull().default("Not recorded"),
    previousSeizures: integer("previous_seizures").notNull().default(0),
    lastSeizureAt: timestamp("last_seizure_at", { withTimezone: true }),
    notes: text("notes").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("neuro_patients_name_idx").on(table.name), index("neuro_patients_external_idx").on(table.externalId)],
);

export const eegAnalyses = pgTable(
  "neuro_eeg_analyses",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 240 }).notNull(),
    fileType: varchar("file_type", { length: 24 }).notNull().default("CSV"),
    channels: jsonb("channels").$type<string[]>().notNull(),
    samplingFrequency: integer("sampling_frequency").notNull(),
    durationSeconds: integer("duration_seconds").notNull(),
    amplitudeUv: numeric("amplitude_uv", { precision: 8, scale: 2, mode: "number" }).notNull(),
    prediction: predictionEnum("prediction").notNull(),
    seizureProbability: numeric("seizure_probability", { precision: 5, scale: 2, mode: "number" }).notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 2, mode: "number" }).notNull(),
    riskLevel: riskLevelEnum("risk_level").notNull(),
    riskScore: integer("risk_score").notNull(),
    severity: varchar("severity", { length: 80 }).notNull(),
    affectedChannels: jsonb("affected_channels").$type<string[]>().notNull(),
    processingTimeMs: integer("processing_time_ms").notNull(),
    featureVector: jsonb("feature_vector").$type<Record<string, number>>().notNull(),
    preprocessingSteps: jsonb("preprocessing_steps").$type<string[]>().notNull(),
    explanation: jsonb("explanation").$type<{
      summary: string;
      featureImportance: Array<{ feature: string; value: number }>;
      shap: Array<{ feature: string; contribution: number }>;
      lime: Array<{ feature: string; contribution: number }>;
      saliency: Array<{ channel: string; intensity: number }>;
    }>().notNull(),
    recommendations: jsonb("recommendations").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("neuro_analyses_patient_idx").on(table.patientId), index("neuro_analyses_risk_idx").on(table.riskLevel)],
);

export const reports = pgTable(
  "neuro_reports",
  {
    id: serial("id").primaryKey(),
    patientId: integer("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    analysisId: integer("analysis_id")
      .notNull()
      .references(() => eegAnalyses.id, { onDelete: "cascade" }),
    reportNumber: varchar("report_number", { length: 80 }).notNull().unique(),
    status: reportStatusEnum("status").notNull().default("Draft"),
    doctorNotes: text("doctor_notes").notNull().default(""),
    pdfMetadata: jsonb("pdf_metadata").$type<Record<string, string | number | boolean>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("neuro_reports_patient_idx").on(table.patientId), index("neuro_reports_analysis_idx").on(table.analysisId)],
);

export const auditLogs = pgTable("neuro_audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => localUsers.id, { onDelete: "set null" }),
  action: varchar("action", { length: 160 }).notNull(),
  entity: varchar("entity", { length: 120 }).notNull(),
  entityId: integer("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appSettings = pgTable("neuro_app_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type EegAnalysis = typeof eegAnalyses.$inferSelect;
export type NewEegAnalysis = typeof eegAnalyses.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type LocalUser = typeof localUsers.$inferSelect;
