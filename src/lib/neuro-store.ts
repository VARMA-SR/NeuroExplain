import { db } from "@/db";
import { auditLogs, eegAnalyses, localUsers, patients, reports } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { demoPatients, runOfflineInference, type PatientProfile } from "@/lib/neuro-ai";

const globalForNeuroStore = globalThis as typeof globalThis & {
  __neuroExplainBootstrapped?: boolean;
};

async function createEnumIfMissing(name: string, values: string[]) {
  const enumValues = values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", ");
  await db.execute(
    sql.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
          CREATE TYPE ${name} AS ENUM (${enumValues});
        END IF;
      END
      $$;
    `),
  );
}

export async function ensureNeuroDatabase() {
  if (globalForNeuroStore.__neuroExplainBootstrapped) {
    return;
  }

  await createEnumIfMissing("neuro_user_role", ["admin", "doctor", "researcher"]);
  await createEnumIfMissing("neuro_prediction", ["Normal", "Seizure"]);
  await createEnumIfMissing("neuro_risk_level", ["Low", "Moderate", "High", "Very High"]);
  await createEnumIfMissing("neuro_report_status", ["Draft", "Signed", "Archived"]);

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS neuro_local_users (
      id serial PRIMARY KEY,
      name varchar(160) NOT NULL,
      email varchar(220) NOT NULL UNIQUE,
      role neuro_user_role NOT NULL DEFAULT 'doctor',
      password_hint varchar(120) NOT NULL DEFAULT 'offline-demo',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS neuro_patients (
      id serial PRIMARY KEY,
      external_id varchar(80) NOT NULL UNIQUE,
      name varchar(180) NOT NULL,
      age integer NOT NULL,
      sex varchar(32) NOT NULL,
      diagnosis varchar(220) NOT NULL,
      medication text NOT NULL DEFAULT 'Not recorded',
      previous_seizures integer NOT NULL DEFAULT 0,
      last_seizure_at timestamptz,
      notes text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS neuro_patients_name_idx ON neuro_patients (name);
    CREATE INDEX IF NOT EXISTS neuro_patients_external_idx ON neuro_patients (external_id);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS neuro_eeg_analyses (
      id serial PRIMARY KEY,
      patient_id integer NOT NULL REFERENCES neuro_patients(id) ON DELETE CASCADE,
      file_name varchar(240) NOT NULL,
      file_type varchar(24) NOT NULL DEFAULT 'CSV',
      channels jsonb NOT NULL DEFAULT '[]'::jsonb,
      sampling_frequency integer NOT NULL,
      duration_seconds integer NOT NULL,
      amplitude_uv numeric(8, 2) NOT NULL,
      prediction neuro_prediction NOT NULL,
      seizure_probability numeric(5, 2) NOT NULL,
      confidence numeric(5, 2) NOT NULL,
      risk_level neuro_risk_level NOT NULL,
      risk_score integer NOT NULL,
      severity varchar(80) NOT NULL,
      affected_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
      processing_time_ms integer NOT NULL,
      feature_vector jsonb NOT NULL DEFAULT '{}'::jsonb,
      preprocessing_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
      explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
      recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS neuro_analyses_patient_idx ON neuro_eeg_analyses (patient_id);
    CREATE INDEX IF NOT EXISTS neuro_analyses_risk_idx ON neuro_eeg_analyses (risk_level);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS neuro_reports (
      id serial PRIMARY KEY,
      patient_id integer NOT NULL REFERENCES neuro_patients(id) ON DELETE CASCADE,
      analysis_id integer NOT NULL REFERENCES neuro_eeg_analyses(id) ON DELETE CASCADE,
      report_number varchar(80) NOT NULL UNIQUE,
      status neuro_report_status NOT NULL DEFAULT 'Draft',
      doctor_notes text NOT NULL DEFAULT '',
      pdf_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS neuro_reports_patient_idx ON neuro_reports (patient_id);
    CREATE INDEX IF NOT EXISTS neuro_reports_analysis_idx ON neuro_reports (analysis_id);
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS neuro_audit_logs (
      id serial PRIMARY KEY,
      user_id integer REFERENCES neuro_local_users(id) ON DELETE SET NULL,
      action varchar(160) NOT NULL,
      entity varchar(120) NOT NULL,
      entity_id integer,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `));

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS neuro_app_settings (
      id serial PRIMARY KEY,
      key varchar(120) NOT NULL UNIQUE,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `));

  await seedDemoData();
  globalForNeuroStore.__neuroExplainBootstrapped = true;
}

async function seedDemoData() {
  const [{ patientCount }] = await db
    .select({ patientCount: sql<number>`count(*)::int` })
    .from(patients);

  const [{ userCount }] = await db.select({ userCount: sql<number>`count(*)::int` }).from(localUsers);
  if (Number(userCount) === 0) {
    await db.insert(localUsers).values([
      { name: "Dr. Nila Rao", email: "doctor@neuro.local", role: "doctor", passwordHint: "offline-demo" },
      { name: "Research Console", email: "research@neuro.local", role: "researcher", passwordHint: "offline-demo" },
      { name: "Admin Operator", email: "admin@neuro.local", role: "admin", passwordHint: "offline-demo" },
    ]);
  }

  if (Number(patientCount) > 0) {
    return;
  }

  const insertedPatients = await db
    .insert(patients)
    .values(
      demoPatients.map((patient, index) => ({
        externalId: `NX-${String(index + 1001).padStart(5, "0")}`,
        name: patient.name,
        age: patient.age,
        sex: patient.sex,
        diagnosis: patient.diagnosis,
        medication: patient.medication,
        previousSeizures: patient.previousSeizures,
        notes: patient.notes ?? "",
      })),
    )
    .returning();

  for (const [index, patient] of insertedPatients.entries()) {
    const profile: PatientProfile = {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      sex: patient.sex,
      diagnosis: patient.diagnosis,
      medication: patient.medication,
      previousSeizures: patient.previousSeizures,
      notes: patient.notes,
    };
    const result = runOfflineInference({
      patient: profile,
      fileName: `demo-session-${index + 1}.csv`,
      fileType: "CSV",
    });

    const [analysis] = await db
      .insert(eegAnalyses)
      .values({
        patientId: patient.id,
        fileName: result.fileName,
        fileType: result.fileType,
        channels: result.channels,
        samplingFrequency: result.samplingFrequency,
        durationSeconds: result.durationSeconds,
        amplitudeUv: result.amplitudeUv,
        prediction: result.prediction,
        seizureProbability: result.seizureProbability,
        confidence: result.confidence,
        riskLevel: result.riskLevel,
        riskScore: result.riskScore,
        severity: result.severity,
        affectedChannels: result.affectedChannels,
        processingTimeMs: result.processingTimeMs,
        featureVector: result.featureVector,
        preprocessingSteps: result.preprocessingSteps,
        explanation: result.explanation,
        recommendations: result.recommendations,
      })
      .returning();

    await db.insert(reports).values({
      patientId: patient.id,
      analysisId: analysis.id,
      reportNumber: `NXR-${new Date().getFullYear()}-${String(analysis.id).padStart(5, "0")}`,
      status: index === 0 ? "Signed" : "Draft",
      doctorNotes: "Auto-generated offline report with explainable AI decision support.",
      pdfMetadata: { generatedBy: "NeuroExplain", offline: true, version: "1.0" },
    });
  }

  await db.insert(auditLogs).values({
    action: "seed_offline_workspace",
    entity: "system",
    metadata: { patients: insertedPatients.length, source: "local bootstrap" },
  });
}

export async function getDashboardSummary() {
  await ensureNeuroDatabase();

  const patientRows = await db.select().from(patients).orderBy(desc(patients.updatedAt)).limit(12);
  const analysisRows = await db
    .select({
      id: eegAnalyses.id,
      patientId: eegAnalyses.patientId,
      patientName: patients.name,
      fileName: eegAnalyses.fileName,
      prediction: eegAnalyses.prediction,
      riskLevel: eegAnalyses.riskLevel,
      riskScore: eegAnalyses.riskScore,
      seizureProbability: eegAnalyses.seizureProbability,
      confidence: eegAnalyses.confidence,
      affectedChannels: eegAnalyses.affectedChannels,
      severity: eegAnalyses.severity,
      recommendations: eegAnalyses.recommendations,
      explanation: eegAnalyses.explanation,
      featureVector: eegAnalyses.featureVector,
      preprocessingSteps: eegAnalyses.preprocessingSteps,
      processingTimeMs: eegAnalyses.processingTimeMs,
      createdAt: eegAnalyses.createdAt,
    })
    .from(eegAnalyses)
    .innerJoin(patients, eq(eegAnalyses.patientId, patients.id))
    .orderBy(desc(eegAnalyses.createdAt))
    .limit(15);

  const reportRows = await db
    .select({
      id: reports.id,
      reportNumber: reports.reportNumber,
      status: reports.status,
      patientName: patients.name,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .innerJoin(patients, eq(reports.patientId, patients.id))
    .orderBy(desc(reports.createdAt))
    .limit(8);

  const auditRows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(8);

  const seizureCount = analysisRows.filter((analysis) => analysis.prediction === "Seizure").length;
  const averageRisk = analysisRows.length
    ? Math.round(analysisRows.reduce((sum, analysis) => sum + analysis.riskScore, 0) / analysisRows.length)
    : 0;
  const highRiskPatients = analysisRows.filter((analysis) => analysis.riskLevel === "High" || analysis.riskLevel === "Very High").length;

  return {
    generatedAt: new Date().toISOString(),
    patients: patientRows,
    analyses: analysisRows,
    reports: reportRows,
    auditLogs: auditRows,
    stats: {
      patientCount: patientRows.length,
      analysisCount: analysisRows.length,
      seizureCount,
      averageRisk,
      highRiskPatients,
      offlineReady: true,
    },
  };
}

export async function createPatient(input: {
  name: string;
  age: number;
  sex: string;
  diagnosis: string;
  medication: string;
  previousSeizures: number;
  notes?: string;
}) {
  await ensureNeuroDatabase();
  const [patient] = await db
    .insert(patients)
    .values({
      externalId: `NX-${Date.now().toString().slice(-7)}`,
      name: input.name,
      age: input.age,
      sex: input.sex,
      diagnosis: input.diagnosis,
      medication: input.medication,
      previousSeizures: input.previousSeizures,
      notes: input.notes ?? "",
    })
    .returning();

  await db.insert(auditLogs).values({
    action: "create_patient",
    entity: "patient",
    entityId: patient.id,
    metadata: { name: patient.name, offline: true },
  });

  return patient;
}

export async function createAnalysis(input: {
  patientId: number;
  fileName?: string;
  fileType?: string;
  signalText?: string;
}) {
  await ensureNeuroDatabase();
  const [patient] = await db.select().from(patients).where(eq(patients.id, input.patientId)).limit(1);
  if (!patient) {
    throw new Error("Patient not found");
  }

  const result = runOfflineInference({
    patient: {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      sex: patient.sex,
      diagnosis: patient.diagnosis,
      medication: patient.medication,
      previousSeizures: patient.previousSeizures,
      notes: patient.notes,
    },
    fileName: input.fileName || `uploaded-${Date.now()}.csv`,
    fileType: input.fileType || "CSV",
    signalText: input.signalText,
  });

  const [analysis] = await db
    .insert(eegAnalyses)
    .values({
      patientId: patient.id,
      fileName: result.fileName,
      fileType: result.fileType,
      channels: result.channels,
      samplingFrequency: result.samplingFrequency,
      durationSeconds: result.durationSeconds,
      amplitudeUv: result.amplitudeUv,
      prediction: result.prediction,
      seizureProbability: result.seizureProbability,
      confidence: result.confidence,
      riskLevel: result.riskLevel,
      riskScore: result.riskScore,
      severity: result.severity,
      affectedChannels: result.affectedChannels,
      processingTimeMs: result.processingTimeMs,
      featureVector: result.featureVector,
      preprocessingSteps: result.preprocessingSteps,
      explanation: result.explanation,
      recommendations: result.recommendations,
    })
    .returning();

  const [report] = await db
    .insert(reports)
    .values({
      patientId: patient.id,
      analysisId: analysis.id,
      reportNumber: `NXR-${new Date().getFullYear()}-${String(analysis.id).padStart(5, "0")}`,
      status: "Draft",
      doctorNotes: "Generated by NeuroExplain offline analysis pipeline.",
      pdfMetadata: { offline: true, exportReady: true },
    })
    .returning();

  await db.insert(auditLogs).values({
    action: "run_eeg_analysis",
    entity: "analysis",
    entityId: analysis.id,
    metadata: { patientId: patient.id, prediction: result.prediction, riskLevel: result.riskLevel },
  });

  return { analysis, report, result, patient };
}

export async function findAnalysisForPatient(patientId: number) {
  await ensureNeuroDatabase();
  return db
    .select()
    .from(eegAnalyses)
    .where(and(eq(eegAnalyses.patientId, patientId)))
    .orderBy(desc(eegAnalyses.createdAt))
    .limit(10);
}

export async function authenticateUser(email: string, passwordHint: string) {
  await ensureNeuroDatabase();
  const [user] = await db
    .select()
    .from(localUsers)
    .where(and(eq(localUsers.email, email), eq(localUsers.passwordHint, passwordHint)))
    .limit(1);

  if (!user) {
    throw new Error("Invalid credentials or user not found.");
  }

  if (!user.isActive) {
    throw new Error("User account is disabled.");
  }

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "user_login",
    entity: "session",
    metadata: { role: user.role, ip: "local" },
  });

  return user;
}
