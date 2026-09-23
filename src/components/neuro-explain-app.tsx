"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform, type MotionValue, useMotionValueEvent } from "framer-motion";
import { useForm } from "react-hook-form";
import LineSidebar from "./LineSidebar";
import Dock from "./Dock";
import Shuffle from "./Shuffle";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BadgeCheck,
  Bell,
  BellRing,
  Bot,
  BookOpen,
  MessageSquare,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  ClipboardList,
  Cpu,
  Database,
  Download,
  Eye,
  FileText,
  Gauge,
  HardDrive,
  HeartPulse,
  HelpCircle,
  History,
  Hospital,
  Layers3,
  LineChart as LineChartIcon,
  Lock,
  LogIn,
  Menu,
  Microscope,
  Moon,
  Network,
  Pill as PillIcon,
  PlayCircle,
  Printer,
  Radio,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  UploadCloud,
  UserPlus,
  Users,
  Volume2,
  WandSparkles,
  Workflow,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createSyntheticEegSeries,
  demoPatients,
  researchMetrics,
  runOfflineInference,
  type OfflineInferenceResult,
  type Prediction,
  type RiskLevel,
} from "@/lib/neuro-ai";

// Mock data for the reconstructed signal (Step 4)
const generateMockSignal = (seed = 0) => {
  const data = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      time: i,
      original: Math.sin(i * 0.1 + seed) * 50 + Math.sin(i * 0.5 - seed) * 20 + Math.random() * (10 + (seed % 5)),
      imf1: Math.sin(i * 0.5 - seed) * 20 + Math.random() * (10 + (seed % 5)),
      imf2: Math.sin(i * 0.1 + seed) * 50,
    });
  }
  return data;
};

type Role = "admin" | "doctor" | "researcher";

type DashboardPatient = {
  id: number;
  externalId: string;
  name: string;
  age: number;
  sex: string;
  diagnosis: string;
  medication: string;
  previousSeizures: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  datasetFile?: string;
};

type DashboardAnalysis = {
  id: number;
  patientId: number;
  patientName: string;
  fileName: string;
  prediction: Prediction;
  riskLevel: RiskLevel;
  riskScore: number;
  seizureProbability: number;
  confidence: number;
  affectedChannels: string[];
  severity: string;
  recommendations: string[];
  explanation: OfflineInferenceResult["explanation"];
  featureVector: Record<string, number>;
  preprocessingSteps: string[];
  processingTimeMs: number;
  createdAt: string;
};

type DashboardReport = {
  id: number;
  reportNumber: string;
  status: "Draft" | "Signed" | "Archived";
  patientName: string;
  createdAt: string;
};

type DashboardSummary = {
  generatedAt: string;
  patients: DashboardPatient[];
  analyses: DashboardAnalysis[];
  reports: DashboardReport[];
  auditLogs: Array<{ id: number; action: string; entity: string; createdAt: string }>;
  stats: {
    patientCount: number;
    analysisCount: number;
    seizureCount: number;
    averageRisk: number;
    highRiskPatients: number;
    offlineReady: boolean;
  };
};

type UploadedFile = {
  name: string;
  type: string;
  size: number;
  signalText?: string;
  previewUrl?: string;
};

type PatientForm = {
  name: string;
  age: number;
  sex: string;
  diagnosis: string;
  medication: string;
  previousSeizures: number;
  notes: string;
};

type SummaryResponse = {
  ok: boolean;
  summary?: DashboardSummary;
};

type AnalyzeResponse = {
  ok: boolean;
  analysis?: { id: number; createdAt?: string };
  patient?: DashboardPatient;
  result?: OfflineInferenceResult;
  report?: { id: number; reportNumber: string; status: "Draft" | "Signed" | "Archived"; createdAt?: string };
  error?: string;
};

type PatientResponse = {
  ok: boolean;
  patient?: DashboardPatient;
  error?: string;
};

const fixedNow = "2026-01-15T08:00:00.000Z";
const riskOrder: Record<RiskLevel, number> = { Low: 1, Moderate: 2, High: 3, "Very High": 4 };
const riskMeta: Record<RiskLevel, { color: string; className: string; glow: string }> = {
  Low: { color: "#22c55e", className: "bg-emerald-400/15 text-emerald-600 border-emerald-300/25", glow: "shadow-emerald-500/20" },
  Moderate: { color: "#f59e0b", className: "bg-amber-400/15 text-amber-200 border-amber-300/25", glow: "shadow-amber-500/20" },
  High: { color: "#f97316", className: "bg-orange-400/15 text-orange-200 border-orange-300/25", glow: "shadow-orange-500/20" },
  "Very High": { color: "#ef4444", className: "bg-rose-400/15 text-rose-200 border-rose-300/25", glow: "shadow-rose-500/20" },
};

const roleDescriptions: Record<Role, string> = {
  admin: "Model, audit, backup, and access governance",
  doctor: "Patient review, decision support, reports",
  researcher: "Dataset explorer, annotations, model comparison",
};

const tooltipStyle = {
  background: "rgba(8, 13, 34, 0.94)",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: "16px",
  color: "#e2e8f0",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: value > 999 ? "compact" : "standard" }).format(value);
}

function buildAnalysisFromResult(
  result: OfflineInferenceResult,
  patient: DashboardPatient,
  id: number,
  createdAt = fixedNow,
): DashboardAnalysis {
  return {
    id,
    patientId: patient.id,
    patientName: patient.name,
    fileName: result.fileName,
    prediction: result.prediction,
    riskLevel: result.riskLevel,
    riskScore: result.riskScore,
    seizureProbability: result.seizureProbability,
    confidence: result.confidence,
    affectedChannels: result.affectedChannels,
    severity: result.severity,
    recommendations: result.recommendations,
    explanation: result.explanation,
    featureVector: result.featureVector,
    preprocessingSteps: result.preprocessingSteps,
    processingTimeMs: result.processingTimeMs,
    createdAt,
  };
}

function buildFallbackSummary(): DashboardSummary {
  const patients: DashboardPatient[] = demoPatients.map((patient, index) => ({
    id: index + 1,
    externalId: `NX-${String(index + 1001).padStart(5, "0")}`,
    name: patient.name,
    age: patient.age,
    sex: patient.sex,
    diagnosis: patient.diagnosis,
    medication: patient.medication,
    previousSeizures: patient.previousSeizures,
    notes: patient.notes ?? "",
    createdAt: `2026-01-${String(10 + index).padStart(2, "0")}T08:00:00.000Z`,
    updatedAt: `2026-01-${String(12 + index).padStart(2, "0")}T08:00:00.000Z`,
    datasetFile: patient.datasetFile,
  }));

  const analyses = patients.map((patient, index) =>
    buildAnalysisFromResult(
      runOfflineInference({ patient, fileName: `demo-session-${index + 1}.csv`, fileType: "CSV" }),
      patient,
      index + 1,
      `2026-01-${String(12 + index).padStart(2, "0")}T10:30:00.000Z`,
    ),
  );

  return {
    generatedAt: fixedNow,
    patients,
    analyses,
    reports: analyses.map((analysis, index) => ({
      id: index + 1,
      reportNumber: `NXR-2026-${String(index + 1).padStart(5, "0")}`,
      status: index === 0 ? "Signed" : "Draft",
      patientName: analysis.patientName,
      createdAt: analysis.createdAt,
    })),
    auditLogs: [
      { id: 1, action: "offline_workspace_ready", entity: "system", createdAt: fixedNow },
      { id: 2, action: "model_checksum_verified", entity: "model", createdAt: fixedNow },
    ],
    stats: {
      patientCount: patients.length,
      analysisCount: analyses.length,
      seizureCount: analyses.filter((analysis) => analysis.prediction === "Seizure").length,
      averageRisk: Math.round(analyses.reduce((sum, analysis) => sum + analysis.riskScore, 0) / analyses.length),
      highRiskPatients: analyses.filter((analysis) => riskOrder[analysis.riskLevel] >= riskOrder.High).length,
      offlineReady: true,
    },
  };
}

const fallbackSummary = buildFallbackSummary();

const navItems = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Dashboard", href: "#dashboard" },
];

const dashboardModules = [
  { label: "EEG UPLOAD", icon: UploadCloud, href: "#upload" },
  { label: "AI ANALYSIS & SIGNAL VISUALIZATION", icon: Activity, href: "#analysis" },
  { label: "RISK", icon: Gauge, href: "#risk" },
  { label: "AI LECTURE", icon: BookOpen, href: "#lecture" },
  { label: "INTERACTIVE LEARNING", icon: MessageSquare, href: "#learning" },
  { label: "CLINICAL REPORT", icon: FileText, href: "#reports" },
];

const featureCards = [
  {
    icon: Brain,
    title: "Offline seizure detection",
    text: "Runs deterministic local EEG inference without cloud dependency for rural clinics, labs, and secure hospital rooms.",
  },
  {
    icon: Eye,
    title: "Explainable AI evidence",
    text: "SHAP-style contributions, LIME-style feature attribution, saliency maps, and natural language clinical explanations.",
  },
  {
    icon: Gauge,
    title: "Longitudinal risk scoring",
    text: "Combines EEG biomarkers, previous seizure burden, demographics, medication context, and trend changes.",
  },
  {
    icon: FileText,
    title: "Hospital-grade reports",
    text: "Printable clinical decision support reports with patient details, charts, confidence, recommendations, and notes.",
  },
  {
    icon: Database,
    title: "Local records and audit trail",
    text: "Patients, scans, reports, settings, and audit events persist locally through the offline database backend.",
  },
  {
    icon: Microscope,
    title: "Research mode",
    text: "Dataset explorer, annotation workflow, ROC/confusion visualizations, and model comparison-ready architecture.",
  },
];

const workflowSteps = [
  { title: "Upload EEG", icon: UploadCloud, detail: "EDF, CSV, MAT, TXT, PNG, PDF" },
  { title: "Preprocess", icon: SlidersHorizontal, detail: "Filter, normalize, segment" },
  { title: "Extract features", icon: Layers3, detail: "Bands, entropy, spikes" },
  { title: "CNN inference", icon: Cpu, detail: "Offline probability" },
  { title: "Risk score", icon: Gauge, detail: "Clinical factors" },
  { title: "Explain", icon: Eye, detail: "SHAP/LIME/saliency" },
  { title: "Recommend", icon: Stethoscope, detail: "Decision support" },
  { title: "Report", icon: FileText, detail: "PDF/print/export" },
];

function GlassCard({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className={cx("glass-panel rounded-[2rem] p-5 sm:p-6", className)}
    >
      {children}
    </motion.section>
  );
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.32em] text-dusty-dark/80">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-navy sm:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-navy/80 sm:text-lg">{text}</p>
    </div>
  );
}

function StatusPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium", className)}>{children}</span>;
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <StatusPill className={riskMeta[risk].className}>{risk}</StatusPill>;
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-3xl border border-dusty-blue/30 bg-cream/[0.06] p-4 shadow-2xl shadow-black/10">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl border border-dusty-blue/30 bg-dusty-blue/20 p-3 text-dusty-dark">
          <Icon className="h-5 w-5" />
        </div>
        <Sparkles className="h-4 w-4 text-purple-200/70" />
      </div>
      <p className="mt-5 text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-navy">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-600">{detail}</p>
    </div>
  );
}

function MetricMeter({ label, value, color = "#06b6d4" }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-navy/80">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-cream-dark">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, #7c3aed)` }}
        />
      </div>
    </div>
  );
}


function RiskGauge({ riskScore, riskLevel }: { riskScore: number; riskLevel: RiskLevel }) {
  const color = riskMeta[riskLevel].color;
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="relative grid h-44 w-44 place-items-center rounded-full shadow-2xl"
        style={{ background: `conic-gradient(${color} ${riskScore * 3.6}deg, rgba(0,0,0,0.05) 0deg)` }}
      >
        <div className="grid h-32 w-32 place-items-center rounded-full border border-dusty-blue/30 bg-cream-dark text-center">
          <div>
            <p className="text-4xl font-semibold text-navy">{riskScore}</p>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-600">Risk</p>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <RiskBadge risk={riskLevel} />
      </div>
    </div>
  );
}

function MiniMatrix() {
  const cells = [
    { label: "TN", value: 94, className: "bg-emerald-400/20 text-emerald-800" },
    { label: "FP", value: 6, className: "bg-amber-400/20 text-amber-800" },
    { label: "FN", value: 4, className: "bg-orange-400/20 text-orange-800" },
    { label: "TP", value: 96, className: "bg-cyan-400/20 text-cyan-800" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((cell) => (
        <div key={cell.label} className={cx("rounded-2xl border border-dusty-blue/30 p-4 text-center", cell.className)}>
          <p className="text-xs text-navy/80">{cell.label}</p>
          <p className="mt-1 text-2xl font-semibold">{cell.value}</p>
        </div>
      ))}
    </div>
  );
}

export function NeuroExplainApp() {
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);


  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<Role>("doctor");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(fallbackSummary.patients[0]?.id ?? 1);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [examineStatus, setExamineStatus] = useState<"idle" | "analyzing" | "complete">("idle");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [doctorNote, setDoctorNote] = useState("Patient remained stable during acquisition. Please correlate with clinical history.");
  const [filterRisk, setFilterRisk] = useState<RiskLevel | "All">("All");
  const [activeModule, setActiveModule] = useState("#upload");
  const [reportNotification, setReportNotification] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: "I have fully analyzed the document. You can explore the extracted signals or ask me any questions about the methodology, IMFs, or classifications mentioned in the text." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeModule]);


  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: "user", text: userMessage }]);
    setChatInput("");

    setTimeout(() => {
      let aiResponse = "I'm not sure I understand. Could you rephrase your question about the EEG analysis or the methodology?";
      const lowerInput = userMessage.toLowerCase();

      if (lowerInput.includes("safe") || lowerInput.includes("prevent") || lowerInput.includes("help") || lowerInput.includes("what should i do")) {
        aiResponse = "To remain in a safe zone, we recommend adhering strictly to your prescribed antiseizure medication schedule, ensuring adequate sleep, and avoiding known triggers. Please consult your neurologist immediately to discuss these findings and adjust your care plan.";
      } else if (lowerInput.includes("seizure") || lowerInput.includes("risk")) {
        aiResponse = `Based on the latest analysis, the system detected a ${selectedAnalysis?.seizureProbability || 88}% probability of paroxysmal activity. This is classified as a ${selectedAnalysis?.riskLevel || 'High'} risk level due to high-frequency oscillations matching ictal patterns.`;
      } else if (lowerInput.includes("entropy") || lowerInput.includes("methodology")) {
        aiResponse = "Sample entropy is preferred here over approximate entropy because it is less dependent on record length and shows greater consistency for non-linear EEG signals, making it more robust for detecting the chaotic dynamics of a seizure.";
      } else if (lowerInput.includes("imf") || lowerInput.includes("empirical") || lowerInput.includes("emd")) {
        aiResponse = "Empirical Mode Decomposition (EMD) separates the complex raw EEG signal into Intrinsic Mode Functions (IMFs). The first few IMFs capture the high-frequency components that often correlate with seizure onset zones, allowing our Random Forest model to isolate pathological features.";
      } else if (lowerInput.includes("channel") || lowerInput.includes("where")) {
        aiResponse = `The most significant anomalies were detected in channels ${selectedAnalysis?.affectedChannels?.join(', ') || 'F7-T3, F8-T4'}. This temporal asymmetry heavily influenced the model's prediction.`;
      } else if (lowerInput.includes("hello") || lowerInput.includes("hi")) {
        aiResponse = "Hello! I'm NeuroExplain's AI assistant. You can ask me about the patient's risk profile, the EEG methodology, or specific extracted features.";
      }

      setChatMessages(prev => [...prev, {
        role: "ai",
        text: aiResponse
      }]);
    }, 800);
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number, name: string, email: string, role: string } | null>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/neuro/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCurrentUser(data.user);
        setRole(data.user.role as Role);
        setIsLoginModalOpen(false);
        setLoginForm({ email: "", password: "" });
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch {
      setLoginError("Network error occurred.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setRole("doctor");
  }

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    // Map #home and #about both to the home section
    const targetId = href === "#about" ? "#home" : href;
    const el = document.querySelector(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMenuOpen(false);
  };

  const { register, handleSubmit, reset, formState } = useForm<PatientForm>({
    defaultValues: {
      name: "",
      age: 34,
      sex: "Female",
      diagnosis: "Focal epilepsy monitoring",
      medication: "Levetiracetam 500 mg twice daily",
      previousSeizures: 1,
      notes: "",
    },
  });

  useEffect(() => {
    let active = true;
    async function loadSummary() {
      try {
        const response = await fetch("/api/neuro/summary", { cache: "no-store" });
        const payload = (await response.json()) as SummaryResponse;
        if (active && response.ok && payload.ok && payload.summary) {
          setSummary(payload.summary);
          setSelectedPatientId(payload.summary.patients[0]?.id ?? fallbackSummary.patients[0].id);
        }
      } catch {
        if (active) {
          setSummary(fallbackSummary);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadSummary();
    return () => {
      active = false;
    };
  }, []);

  const patients = summary.patients;
  const analyses = summary.analyses;
  const reports = summary.reports;
  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? patients[0];
  const selectedAnalysis =
    analyses.find((analysis) => analysis.patientId === selectedPatient?.id) ?? analyses[0] ?? fallbackSummary.analyses[0];

  useEffect(() => {
    if (selectedPatient) {
      const notes = [
        `Patient ${selectedPatient.name} remained stable during acquisition. Please correlate with clinical history and recent medication changes.`,
        `No visible artifacts recorded for ${selectedPatient.name}. Routine EEG evaluation requested by neurology.`,
        `Patient reported slight discomfort during setup, but the trace is clean. Monitor closely given history of ${selectedPatient.previousSeizures} recorded events.`,
        `Standard protocol followed for ${selectedPatient.age}-year-old ${selectedPatient.sex}. AI summary attached for primary physician review.`
      ];
      setDoctorNote(notes[(selectedPatient.id + selectedPatient.previousSeizures) % notes.length]);
    }
  }, [selectedPatient]);
  // Only show analysis content once the user has uploaded a file or a run has completed
  const hasAnalysisResult = uploadedFile !== null || analysisStatus === "complete";



  const filteredPatients = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return patients.filter((patient) => {
      const matchesQuery =
        !normalized ||
        [patient.name, patient.externalId, patient.diagnosis, patient.medication].some((field) => field.toLowerCase().includes(normalized));
      const patientAnalysis = analyses.find((analysis) => analysis.patientId === patient.id);
      const matchesRisk = filterRisk === "All" || patientAnalysis?.riskLevel === filterRisk;
      return matchesQuery && matchesRisk;
    });
  }, [analyses, filterRisk, patients, query]);

  const eegSeries = useMemo(() => {
    if (uploadedFile?.signalText) {
      try {
        const lines = uploadedFile.signalText.split("\n").filter((l) => l.trim().length > 0);
        // Assuming CSV might have a header line. If the first line parses to NaN, skip it.
        const startIdx = isNaN(parseFloat(lines[0].split(",")[0])) ? 1 : 0;

        return lines.slice(startIdx).map((line, i) => {
          const parts = line.split(",").map(s => s.trim());
          return {
            time: i,
            frontal: parseFloat(parts[0] || "0") || 0,
            temporal: parseFloat(parts[7] || parts[1] || parts[0] || "0") || 0,
            occipital: parseFloat(parts[17] || parts[2] || parts[0] || "0") || 0,
          };
        }).filter(d => !isNaN(d.temporal) && !isNaN(d.frontal)).slice(0, 500); // Limit points for performance
      } catch {
        return createSyntheticEegSeries(selectedPatient?.id ?? 7);
      }
    }
    return createSyntheticEegSeries(selectedPatient?.id ?? 7);
  }, [selectedPatient?.id, uploadedFile]);

  const trendData = useMemo(
    () =>
      [...analyses]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((analysis, index) => ({
          session: `S${index + 1}`,
          risk: analysis.riskScore,
          probability: analysis.seizureProbability,
          confidence: analysis.confidence,
        })),
    [analyses],
  );

  const riskDistribution = useMemo(
    () =>
      (["Low", "Moderate", "High", "Very High"] as RiskLevel[]).map((risk) => ({
        name: risk,
        value: Math.max(analyses.filter((analysis) => analysis.riskLevel === risk).length, 0),
        fill: riskMeta[risk].color,
      })),
    [analyses],
  );

  const dynamicSignalData = useMemo(
    () => generateMockSignal(selectedAnalysis.id + Math.random() * 100),
    [selectedAnalysis.id]
  );

  const featureImportance = selectedAnalysis.explanation.featureImportance.slice(0, 7).map((feature) => ({
    feature: feature.feature.replace(" activity", ""),
    value: feature.value,
  }));

  const radarData = [
    { metric: "Delta", value: selectedAnalysis.featureVector.deltaPower ?? 0 },
    { metric: "Theta", value: selectedAnalysis.featureVector.thetaPower ?? 0 },
    { metric: "Alpha", value: selectedAnalysis.featureVector.alphaPower ?? 0 },
    { metric: "Beta", value: selectedAnalysis.featureVector.betaPower ?? 0 },
    { metric: "Gamma", value: selectedAnalysis.featureVector.gammaPower ?? 0 },
    { metric: "Spike", value: Math.min((selectedAnalysis.featureVector.spikeRate ?? 0) * 3, 100) },
  ];

  const rocData = Array.from({ length: 9 }, (_, index) => ({
    fpr: Number((index / 10).toFixed(1)),
    tpr: Math.min(0.12 + index * 0.112 + (index > 5 ? 0.05 : 0), 0.99),
  }));

  const predictionTimeline = Array.from({ length: 12 }, (_, index) => ({
    time: `${index * 5}m`,
    probability: Math.round(Math.max(5, Math.min(98, selectedAnalysis.seizureProbability + Math.sin(index / 1.4) * 11))),
    risk: Math.round(Math.max(5, Math.min(99, selectedAnalysis.riskScore + Math.cos(index / 1.9) * 9))),
  }));

  async function onCreatePatient(data: PatientForm) {
    const localPatient: DashboardPatient = {
      // eslint-disable-next-line react-hooks/purity
      id: Date.now(),
      // eslint-disable-next-line react-hooks/purity
      externalId: `NX-${Date.now().toString().slice(-7)}`,
      name: data.name,
      age: Number(data.age),
      sex: data.sex,
      diagnosis: data.diagnosis,
      medication: data.medication || "Not recorded",
      previousSeizures: Number(data.previousSeizures) || 0,
      notes: data.notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/neuro/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = (await response.json()) as PatientResponse;
      const patient = response.ok && payload.ok && payload.patient ? payload.patient : localPatient;
      setSummary((current) => ({
        ...current,
        patients: [patient, ...current.patients],
        stats: { ...current.stats, patientCount: current.stats.patientCount + 1 },
      }));
      setSelectedPatientId(patient.id);
      reset();
    } catch {
      setSummary((current) => ({
        ...current,
        patients: [localPatient, ...current.patients],
        stats: { ...current.stats, patientCount: current.stats.patientCount + 1 },
      }));
      setSelectedPatientId(localPatient.id);
      reset();
    }
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const extension = file.name.split(".").pop()?.toUpperCase() || "EEG";
    let signalText = "";

    const isCsvOrTxt = /\.(csv|txt)$/i.test(file.name) || file.type.startsWith("text/");
    const isImage = file.type.startsWith("image/");
    
    if (isCsvOrTxt) {
      try {
        signalText = (await file.text()).slice(0, 25000);
      } catch {
        signalText = "";
      }
      
      // Validate that the file has signal data (must contain numbers)
      const hasSignals = (signalText.match(/\d/g) || []).length > 10;
      if (!hasSignals) {
        setReportNotification("please upload an valid file");
        setTimeout(() => setReportNotification(null), 5000);
        event.target.value = "";
        return;
      }
    } else if (isImage) {
      // Validate image using a visual heuristic (graphs have large solid backgrounds)
      const isGraph = await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(true);
          
          canvas.width = 100;
          canvas.height = 100;
          ctx.drawImage(img, 0, 0, 100, 100);
          const data = ctx.getImageData(0, 0, 100, 100).data;
          const counts: Record<string, number> = {};
          let max = 0;
          
          for (let i = 0; i < data.length; i += 4) {
            const key = `${Math.round(data[i]/32)},${Math.round(data[i+1]/32)},${Math.round(data[i+2]/32)}`;
            counts[key] = (counts[key] || 0) + 1;
            if (counts[key] > max) max = counts[key];
          }
          // A graph is usually mostly white/transparent background (> 60% uniform pixels)
          resolve(max > 6000);
        };
        img.onerror = () => resolve(false);
        img.src = URL.createObjectURL(file);
      });

      if (!isGraph) {
        setReportNotification("please upload an valid file");
        setTimeout(() => setReportNotification(null), 5000);
        event.target.value = "";
        return;
      }
    }

    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;

    setUploadedFile({ name: file.name, type: extension, size: file.size, signalText, previewUrl });
    setAnalysisStatus("idle");
  }

  async function runAnalysis() {
    if (!selectedPatient) return;
    setAnalysisStatus("running");

    try {
      const response = await fetch("/api/neuro/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          fileName: uploadedFile?.name || `simulated-eeg-${selectedPatient.externalId}.csv`,
          fileType: uploadedFile?.type || "CSV",
          signalText: uploadedFile?.signalText,
        }),
      });
      const payload = (await response.json()) as AnalyzeResponse;
      if (!response.ok || !payload.ok || !payload.result) {
        throw new Error(payload.error || "Analysis failed");
      }

      const newAnalysis = buildAnalysisFromResult(
        payload.result,
        selectedPatient,
        payload.analysis?.id ?? Date.now(),
        payload.analysis?.createdAt ?? new Date().toISOString(),
      );
      const report: DashboardReport = {
        id: payload.report?.id ?? Date.now() + 1,
        reportNumber: payload.report?.reportNumber ?? `NXR-${new Date().getFullYear()}-${String(newAnalysis.id).padStart(5, "0")}`,
        status: payload.report?.status ?? "Draft",
        patientName: selectedPatient.name,
        createdAt: payload.report?.createdAt ?? newAnalysis.createdAt,
      };

      setSummary((current) => ({
        ...current,
        analyses: [newAnalysis, ...current.analyses],
        reports: [report, ...current.reports],
        stats: {
          ...current.stats,
          analysisCount: current.stats.analysisCount + 1,
          seizureCount: current.stats.seizureCount + (newAnalysis.prediction === "Seizure" ? 1 : 0),
          highRiskPatients: current.stats.highRiskPatients + (riskOrder[newAnalysis.riskLevel] >= riskOrder.High ? 1 : 0),
          averageRisk: Math.round((current.stats.averageRisk * Math.max(current.stats.analysisCount, 1) + newAnalysis.riskScore) / (current.stats.analysisCount + 1)),
        },
      }));
      setAnalysisStatus("complete");
      setReportNotification("Analysis complete — report is ready. Click here to view.");
    } catch {
      const result = runOfflineInference({
        patient: selectedPatient,
        fileName: uploadedFile?.name || `local-simulated-${selectedPatient.externalId}.csv`,
        fileType: uploadedFile?.type || "CSV",
        signalText: uploadedFile?.signalText,
      });
      const newAnalysis = buildAnalysisFromResult(result, selectedPatient, Date.now(), new Date().toISOString());
      setSummary((current) => ({
        ...current,
        analyses: [newAnalysis, ...current.analyses],
        reports: [
          {
            id: Date.now() + 2,
            reportNumber: `NXR-LOCAL-${String(newAnalysis.id).slice(-5)}`,
            status: "Draft",
            patientName: selectedPatient.name,
            createdAt: newAnalysis.createdAt,
          },
          ...current.reports,
        ],
        stats: {
          ...current.stats,
          analysisCount: current.stats.analysisCount + 1,
          seizureCount: current.stats.seizureCount + (newAnalysis.prediction === "Seizure" ? 1 : 0),
          highRiskPatients: current.stats.highRiskPatients + (riskOrder[newAnalysis.riskLevel] >= riskOrder.High ? 1 : 0),
          averageRisk: Math.round((current.stats.averageRisk * Math.max(current.stats.analysisCount, 1) + newAnalysis.riskScore) / (current.stats.analysisCount + 1)),
        },
      }));
      setAnalysisStatus("complete");
      setReportNotification("Analysis complete — report is ready. Click here to view.");
    }
  }

  function exportReport() {
    const payload = {
      product: "NeuroExplain",
      generatedAt: new Date().toISOString(),
      patient: selectedPatient,
      analysis: selectedAnalysis,
      doctorNote,
      disclaimer: "Decision support only. Not a standalone medical diagnosis.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedPatient?.externalId ?? "patient"}-neuroexplain-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function speakSummary() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(
      `${selectedAnalysis.prediction} prediction for ${selectedPatient?.name}. Seizure probability ${selectedAnalysis.seizureProbability} percent. Risk level ${selectedAnalysis.riskLevel}. ${selectedAnalysis.explanation.summary}`,
    );
    utterance.rate = 0.92;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="relative min-h-screen bg-cream-dark flex flex-col pt-24"><div className="w-full">

      <header className="no-print fixed inset-x-0 top-0 z-50 border-b border-dusty-blue/30 bg-cream-dark/70 backdrop-blur-2xl">
        <nav className="mx-auto flex w-full items-center justify-between px-4 py-2.5 sm:px-6 lg:px-12" aria-label="Primary navigation">
          <a href="#home" onClick={(e) => handleNavClick(e, "#home")} className="group flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/25 bg-dusty-blue/20 text-dusty-dark shadow-[0_0_28px_rgba(6,182,212,0.25)]">
              <Brain className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight text-navy mb-0.5">
                <Shuffle
                  text="NeuroExplain"
                  shuffleDirection="down"
                  duration={0.8}
                  animationMode="sequential"
                  shuffleTimes={4} /* Extends the rolling track of scrambled letters */
                  ease="power3.out"
                  stagger={0.06}
                  threshold={0.1}
                  triggerOnce={false}
                  triggerOnHover={true}
                  respectReducedMotion={true}
                  loop={true}
                  loopDelay={3.5} /* Pause before rolling again so it doesn't get violently distracting */
                />
              </span>
            </span>
          </a>

          <div className="hidden lg:flex origin-bottom">
            <Dock
              items={[
                { label: 'About', icon: <><HelpCircle /><span className="text-[10px] font-medium leading-none tracking-wide text-navy/80">About</span></>, onClick: () => handleNavClick({ preventDefault: () => { } } as any, '#home') },
                { label: 'Features', icon: <><Sparkles /><span className="text-[10px] font-medium leading-none tracking-wide text-navy/80">Features</span></>, onClick: () => handleNavClick({ preventDefault: () => { } } as any, '#features') },
                { label: 'Workflow', icon: <><Workflow /><span className="text-[10px] font-medium leading-none tracking-wide text-navy/80">Workflow</span></>, onClick: () => handleNavClick({ preventDefault: () => { } } as any, '#workflow') },
                { label: 'Dashboard', icon: <><Activity /><span className="text-[10px] font-medium leading-none tracking-wide text-navy/80">Dashboard</span></>, onClick: () => handleNavClick({ preventDefault: () => { } } as any, '#dashboard') },
              ]}
              baseItemSize={64}
              magnification={78}
            />
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <StatusPill className="border-emerald-300/20 bg-emerald-400/10 text-emerald-600">
              <HardDrive className="h-3.5 w-3.5" /> Offline Ready
            </StatusPill>
            {currentUser ? (
              <button
                onClick={handleLogout}
                className="rounded-full bg-cream-dark px-4.5 py-2 text-xs font-semibold text-navy transition hover:bg-cream/20"
              >
                Log out ({currentUser.name})
              </button>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="rounded-full bg-cream px-4.5 py-2 text-xs font-semibold text-navy transition hover:bg-cyan-100"
              >
                Login
              </button>
            )}
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-dusty-blue/30 bg-cream-dark text-navy lg:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </nav>
        <AnimatePresence>
          {menuOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-dusty-blue/30 bg-cream-dark/95 px-4 py-4 lg:hidden"
            >
              <div className="mx-auto grid max-w-7xl gap-2">
                {navItems.map((item) => (
                  <a key={item.href} href={item.href} onClick={(e) => handleNavClick(e, item.href)} className="rounded-2xl px-4 py-3 text-sm text-navy/80 hover:bg-cream-dark">
                    {item.label}
                  </a>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <section id="home" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col justify-center py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.03fr_0.97fr]">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <h1 className="mt-0 max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl lg:text-[5.5rem] drop-shadow-2xl">
              <span className="text-navy drop-shadow-[0_2px_20px_rgba(0,0,0,0.1)]">Explainable offline EEG</span>
              <br />
              <span className="text-black">seizure intelligence.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl md:leading-relaxed">
              NeuroExplain detects epileptic seizure probability, estimates longitudinal risk, visualizes EEG patterns, and explains every prediction with clinician-friendly evidence.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a href="#dashboard" onClick={(e) => handleNavClick(e, "#dashboard")} className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-cream px-8 py-3.5 text-sm font-bold text-navy shadow-xl transition-all hover:scale-[1.03] hover:bg-cream-dark hover:shadow-2xl">
                <span className="relative flex items-center gap-2">Launch AI dashboard <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </a>
              <a href="#workflow" onClick={(e) => handleNavClick(e, "#workflow")} className="inline-flex items-center justify-center gap-2 rounded-full border border-dusty-blue/30 bg-transparent px-8 py-3.5 text-sm font-semibold text-navy/80 shadow-sm backdrop-blur-md transition hover:border-slate-300 hover:bg-cream-dark hover:text-navy">
                View clinical workflow
              </a>
            </div>
            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {researchMetrics.map((metric) => (
                <div key={metric.label} className="group rounded-2xl border border-dusty-blue/30 bg-white p-5 backdrop-blur-lg transition hover:bg-slate-50 hover:border-dusty-blue/30">
                  <p className="text-3xl font-bold tracking-tight text-navy">{metric.value}</p>
                  <p className="mt-1.5 text-sm font-medium text-navy/80">{metric.label}</p>
                  <p className="mt-1 text-xs text-slate-600">{metric.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }} className="relative">
            <div className="float-slow glow-border rounded-[2.5rem]">
              <div className="glass-panel scanline overflow-hidden rounded-[2.5rem] p-5">
                <div className="flex items-center justify-between border-b border-dusty-blue/30 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-dusty-dark/80">Live offline inference</p>
                    <h2 className="mt-1 text-2xl font-semibold text-navy">AI Neurology Console</h2>
                  </div>
                  <StatusPill className="border-emerald-300/20 bg-emerald-300/10 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Encrypted local
                  </StatusPill>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-dusty-blue/30 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-navy/80">Prediction</span>
                      <Activity className="h-5 w-5 text-dusty-dark" />
                    </div>
                    <p className="mt-4 text-4xl font-semibold text-navy">{selectedAnalysis.prediction}</p>
                    <MetricMeter label="Seizure probability" value={selectedAnalysis.seizureProbability} color="#a8b8c4" />
                  </div>
                  <div className="rounded-3xl border border-dusty-blue/30 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-navy/80">Risk Level</span>
                      <Gauge className="h-5 w-5 text-dusty-dark" />
                    </div>
                    <p className="mt-4 text-4xl font-semibold text-navy">{selectedAnalysis.riskScore}</p>
                    <MetricMeter label={selectedAnalysis.riskLevel} value={selectedAnalysis.riskScore} color={riskMeta[selectedAnalysis.riskLevel].color} />
                  </div>
                </div>
                <div className="mt-5 h-56 rounded-3xl border border-dusty-blue/30 bg-cream/[0.035] p-3">
                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <AreaChart data={eegSeries.slice(0, 90)} margin={{ left: -18, right: 8, top: 12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="heroTemporal" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="temporal" stroke="#a8b8c4" fill="url(#heroTemporal)" strokeWidth={2} />
                      <Line type="monotone" dataKey="frontal" stroke="#8198aa" dot={false} strokeWidth={1.8} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-4 rounded-2xl border border-cyan-300/15 bg-dusty-blue/20 p-4 text-sm leading-6 text-black font-medium">
                  “{selectedAnalysis.explanation.summary}”
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="relative z-20 flex flex-col justify-center min-h-screen py-24">
        <div className="mx-auto w-full max-w-[92rem] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Platform capabilities"
            title="Built like a premium medical AI operating system."
            text="A modular workflow for patients, EEG uploads, preprocessing, inference, risk, recommendations, reports, search, settings, assistant features, and research mode."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <GlassCard key={feature.title} className="group h-full transition hover:-translate-y-1 hover:border-cyan-300/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dusty-blue/30 bg-gradient-to-br from-blue-500/20 to-cyan-400/10 text-cyan-800">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-navy">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-navy/80">{feature.text}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="relative z-30 flex flex-col justify-center min-h-screen py-24">
        <div className="mx-auto w-full max-w-[92rem] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="End-to-end workflow"
            title="From EEG upload to explainable report in one offline loop."
            text="The complete pipeline mirrors a real clinical decision support product while remaining lightweight enough for local demonstrations."
          />
          <GlassCard className="overflow-hidden">
            <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
              {workflowSteps.map((step, index) => (
                <div key={step.title} className="relative rounded-3xl border border-dusty-blue/30 bg-cream p-4">
                  <div className="flex items-center justify-between">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-dusty-blue/20 text-dusty-dark">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-slate-600">0{index + 1}</span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-navy">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{step.detail}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      <section id="dashboard" className="mx-auto max-w-[92rem] px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Dashboard preview"
          title="Clinical-grade offline command center."
          text="Search patients, upload EEG data, run inference, review explainability, track risk trends, generate reports, and manage local settings."
        />

        <div className="glass-panel overflow-hidden rounded-[2.4rem] border-white/15">
          <div className="grid lg:grid-cols-[17rem_1fr]">
            <aside className="no-print border-b border-dusty-blue/30 bg-cream/[0.035] p-4 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3 rounded-3xl border border-dusty-blue/30 bg-cream/[0.06] p-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-navy">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-navy">NeuroOS</p>
                  <p className="text-xs text-slate-600">v1.0 offline</p>
                </div>
              </div>
              <div className="mt-4">
                <LineSidebar
                  items={examineStatus === "complete" ? dashboardModules : dashboardModules.slice(0, 1)}
                  defaultActive={Math.max(0, dashboardModules.findIndex(m => m.href === activeModule))}
                  onItemClick={(_index, item) => setActiveModule(item.href)}
                  accentColor="#006d77"
                  textColor="#83c5be"
                  itemGap={32}
                  className="mb-4"
                />
              </div>
              <div className="mt-6 rounded-3xl border border-emerald-300/15 bg-emerald-300/10 p-4">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
                <p className="mt-3 text-sm font-semibold text-navy">Security posture</p>
                <p className="mt-1 text-xs leading-5 text-emerald-800/75">Local authentication, role access, audit logs, input validation, encrypted-backup ready.</p>
              </div>
            </aside>

            <div className="min-w-0 p-4 sm:p-6 lg:p-7">
              <div className="no-print mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-end">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={runAnalysis}
                    disabled={analysisStatus === "running"}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 px-5 py-3 text-sm font-semibold text-navy shadow-sm transition hover:scale-[1.01] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {analysisStatus === "running" ? <RefreshCw className="h-4 w-4 animate-spin text-navy" /> : <PlayCircle className="h-4 w-4 text-navy" />}
                    {analysisStatus === "running" ? "Running local model..." : "Run offline AI analysis"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportNotification(null)}
                    title="Notifications"
                    className="relative grid h-11 w-11 place-items-center rounded-2xl border border-dusty-blue/30 bg-cream-dark text-navy/80 transition hover:bg-cream"
                  >
                    {reportNotification ? <BellRing className="h-5 w-5 text-rose-500 animate-[wiggle_0.4s_ease-in-out]" /> : <Bell className="h-5 w-5" />}
                    {reportNotification && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-cream" />
                    )}
                  </button>
                </div>
              </div>

              {/* ── Report-ready notification toast ── */}
              {reportNotification && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-300/40 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 shadow-sm animate-in slide-in-from-top-2 duration-300">
                  <BellRing className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="flex-1 font-medium">{reportNotification}</span>
                  <button
                    type="button"
                    onClick={() => { setReportNotification(null); setActiveModule("#analysis"); }}
                    className="rounded-xl bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    View report
                  </button>
                  <button type="button" onClick={() => setReportNotification(null)} className="text-emerald-600 hover:text-emerald-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {activeModule === "#patients" && (
                <div className="mt-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard icon={Users} label="Patients tracked" value={summary.stats.patientCount} detail="Local longitudinal records" />
                    <MetricCard icon={Activity} label="EEG analyses" value={summary.stats.analysisCount} detail="Stored scans and reports" />
                    <MetricCard icon={AlertTriangle} label="Seizure-positive" value={summary.stats.seizureCount} detail="AI flagged sessions" />
                    <MetricCard icon={Gauge} label="Average risk" value={`${summary.stats.averageRisk}%`} detail="Current cohort score" />
                  </div>
                  <GlassCard id="patients" className="print-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-dusty-dark/80">Patient management</p>
                        <h3 className="mt-2 text-2xl font-semibold text-navy">Records, history, medication</h3>
                      </div>
                      <StatusPill className="border-dusty-blue/30 bg-cream-dark text-navy/80">
                        <UserPlus className="h-3.5 w-3.5" /> Create patient
                      </StatusPill>
                    </div>

                    <form onSubmit={handleSubmit(onCreatePatient)} className="mt-5 grid gap-3 md:grid-cols-2">
                      <input {...register("name", { required: true })} placeholder="Patient name" className="rounded-2xl border border-dusty-blue/30 bg-cream/[0.07] px-4 py-3 text-sm text-navy outline-none placeholder:text-slate-600" />
                      <input {...register("age", { required: true, valueAsNumber: true })} type="number" min={0} max={120} placeholder="Age" className="rounded-2xl border border-dusty-blue/30 bg-cream/[0.07] px-4 py-3 text-sm text-navy outline-none placeholder:text-slate-600" />
                      <select {...register("sex")} className="rounded-2xl border border-dusty-blue/30 bg-cream-dark px-4 py-3 text-sm text-navy outline-none">
                        <option>Female</option>
                        <option>Male</option>
                        <option>Other</option>
                        <option>Not specified</option>
                      </select>
                      <input {...register("previousSeizures", { valueAsNumber: true })} type="number" min={0} placeholder="Past seizures" className="rounded-2xl border border-dusty-blue/30 bg-cream/[0.07] px-4 py-3 text-sm text-navy outline-none placeholder:text-slate-600" />
                      <input {...register("diagnosis", { required: true })} placeholder="Diagnosis / reason" className="rounded-2xl border border-dusty-blue/30 bg-cream/[0.07] px-4 py-3 text-sm text-navy outline-none placeholder:text-slate-600 md:col-span-2" />
                      <input {...register("medication")} placeholder="Medication" className="rounded-2xl border border-dusty-blue/30 bg-cream/[0.07] px-4 py-3 text-sm text-navy outline-none placeholder:text-slate-600 md:col-span-2" />
                      <textarea {...register("notes")} placeholder="Clinical notes" className="min-h-20 rounded-2xl border border-dusty-blue/30 bg-cream/[0.07] px-4 py-3 text-sm text-navy outline-none placeholder:text-slate-600 md:col-span-2" />
                      <button type="submit" disabled={formState.isSubmitting} className="rounded-2xl bg-cream px-5 py-3 text-sm font-semibold text-navy transition hover:bg-cyan-100 disabled:opacity-60 md:col-span-2">
                        {formState.isSubmitting ? "Saving locally..." : "Save patient record"}
                      </button>
                    </form>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {(["All", "Low", "Moderate", "High", "Very High"] as Array<RiskLevel | "All">).map((risk) => (
                        <button
                          key={risk}
                          type="button"
                          onClick={() => setFilterRisk(risk)}
                          className={cx(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                            filterRisk === risk ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-800" : "border-dusty-blue/30 bg-cream text-navy/80 hover:bg-cream-dark",
                          )}
                        >
                          {risk}
                        </button>
                      ))}
                    </div>

                    <div className="custom-scrollbar mt-4 max-h-[25rem] space-y-3 overflow-auto pr-1">
                      {filteredPatients.map((patient) => {
                        const patientAnalysis = analyses.find((analysis) => analysis.patientId === patient.id) ?? selectedAnalysis;
                        return (
                          <button
                            type="button"
                            key={patient.id}
                            onClick={() => setSelectedPatientId(patient.id)}
                            className={cx(
                              "w-full rounded-3xl border p-4 text-left transition",
                              selectedPatient?.id === patient.id ? "border-cyan-300/35 bg-dusty-blue/20" : "border-dusty-blue/30 bg-cream hover:bg-cream/[0.075]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-navy">{patient.name}</p>
                                <p className="mt-1 text-xs text-slate-600">{patient.externalId} · {patient.age} yrs · {patient.sex}</p>
                              </div>
                              <RiskBadge risk={patientAnalysis.riskLevel} />
                            </div>
                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-navy/80">{patient.diagnosis}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                              <span className="rounded-full bg-cream-dark px-2.5 py-1"><PillIcon className="mr-1 inline h-3 w-3" />{patient.medication}</span>
                              <span className="rounded-full bg-cream-dark px-2.5 py-1">Past seizures: {patient.previousSeizures}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </GlassCard>
                </div>
              )}
              {activeModule === "#upload" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                  <GlassCard id="upload" className="print-card">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-dusty-dark/80">EEG data module</p>
                        <h3 className="mt-2 text-2xl font-semibold text-navy">Upload, preview, preprocess</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-navy/80">Supports EDF, CSV, MAT, TXT, images (PNG, JPG), and PDF workflows.</p>
                      </div>
                      <StatusPill className="border-blue-300/20 bg-blue-400/10 text-blue-100">
                        <Radio className="h-3.5 w-3.5" /> 256 Hz
                      </StatusPill>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                      <label className="group relative overflow-hidden flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-cyan-300/30 bg-dusty-blue/20 p-6 text-center transition hover:bg-cyan-300/15 min-h-[160px]">
                        {uploadedFile ? (
                          <>
                            {uploadedFile.previewUrl && (
                              <img src={uploadedFile.previewUrl} alt="Uploaded preview" className="absolute inset-0 h-full w-full object-cover opacity-30 group-hover:opacity-40 transition-opacity" />
                            )}
                            <div className="relative z-10 flex flex-col items-center">
                              <FileText className="h-10 w-10 text-cyan-800" />
                              <span className="mt-4 text-sm font-semibold text-navy">{uploadedFile.name}</span>
                              <span className="mt-1 text-xs text-slate-600">Click to change file</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-10 w-10 text-cyan-800" />
                            <span className="mt-4 text-sm font-semibold text-navy">Drop or choose EEG file</span>
                            <span className="mt-1 text-xs text-slate-600">EDF · CSV · MAT · TXT · PNG · JPG · PDF</span>
                          </>
                        )}
                        <input type="file" accept=".edf,.csv,.mat,.txt,.pdf,text/plain,image/*" className="sr-only" onChange={onFileChange} />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ["File", uploadedFile ? uploadedFile.name : "—"],
                          ["Type", uploadedFile ? (uploadedFile.type || "CSV") : "—"],
                          ["Duration", uploadedFile ? `${selectedAnalysis.processingTimeMs > 0 ? selectedAnalysis.processingTimeMs : 820} ms processing` : "—"],
                          ["Amplitude", uploadedFile ? `${selectedAnalysis.featureVector.amplitudeBurst?.toFixed?.(1) ?? selectedAnalysis.riskScore} µV` : "—"],
                          ["Channels", uploadedFile ? selectedAnalysis.affectedChannels.join(", ") : "—"],
                          ["Artifact status", uploadedFile ? "Blink/muscle scan complete" : "—"],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-dusty-blue/30 bg-cream p-4">
                            <p className="text-xs text-slate-600">{label}</p>
                            <p className="mt-1 truncate text-sm font-medium text-navy">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {uploadedFile && (
                      <div className="mt-5 h-72 rounded-3xl border border-dusty-blue/30 bg-cream/80 p-3 animate-in fade-in zoom-in-95 duration-300">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                          <AreaChart data={eegSeries} margin={{ left: -20, right: 8, top: 10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="temporal" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Area type="monotone" dataKey="temporal" name="Temporal" stroke="#a8b8c4" fill="url(#temporal)" strokeWidth={2} />
                            <Line type="monotone" dataKey="frontal" name="Frontal" stroke="#8198aa" dot={false} strokeWidth={1.6} />
                            <Line type="monotone" dataKey="occipital" name="Occipital" stroke="#60A5FA" dot={false} strokeWidth={1.4} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {uploadedFile && (
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={async () => {
                            setExamineStatus("analyzing");
                            try {
                              await runAnalysis();
                            } catch (e) {
                              console.error("Analysis failed", e);
                            }
                            setExamineStatus("complete");
                            setActiveModule("#analysis");
                          }}
                          disabled={examineStatus === "analyzing" || analysisStatus === "running"}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dusty-blue/30 bg-cream px-5 py-3 text-sm font-semibold text-navy hover:bg-cream-dark disabled:opacity-50"
                        >
                          {examineStatus === "analyzing" ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin text-dusty-dark" />
                              Analyzing document...
                            </>
                          ) : (
                            "Examine"
                          )}
                        </button>
                        <button type="button" onClick={() => setUploadedFile(null)} className="rounded-2xl border border-dusty-blue/30 bg-cream-dark px-5 py-3 text-sm font-semibold text-navy hover:bg-dusty-blue/20">
                          Clear upload
                        </button>
                      </div>
                    )}
                  </GlassCard>
                </div>
              )}
              {activeModule === "#analysis" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-500 py-6">
                  {!hasAnalysisResult ? (
                    /* ── Empty state: no file uploaded yet ── */
                    <div className="flex flex-col items-center justify-center rounded-[2.4rem] border-2 border-dashed border-dusty-blue/30 bg-cream/[0.04] py-32 text-center">
                      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-dusty-blue/10 text-dusty-dark/70">
                        <Activity className="h-10 w-10" />
                      </div>
                      <h3 className="mt-6 text-2xl font-semibold text-navy">Upload data to get results</h3>
                      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                        Go to the <strong>EEG Upload</strong> tab, select a CSV signal file, then click
                        &ldquo;Run offline AI analysis&rdquo; to generate your clinical-grade report here.
                      </p>
                      <button
                        onClick={() => setActiveModule("#upload")}
                        className="mt-8 rounded-2xl bg-dusty-dark px-6 py-3 text-sm font-semibold text-white shadow hover:bg-navy transition-colors"
                      >
                        Go to Upload
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-5 xl:grid-cols-2 mb-8">
                        <div className="xl:col-span-2">
                          <GlassCard id="analysis" className="print-card">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm uppercase tracking-[0.24em] text-dusty-dark/80">AI analysis</p>
                                <h3 className="mt-2 text-2xl font-semibold text-navy">Prediction overview</h3>
                                <p className="mt-2 text-sm leading-6 text-navy/80">Latest scan for {selectedPatient?.name ?? "selected patient"}</p>
                              </div>
                              <StatusPill className={cx(selectedAnalysis.prediction === "Seizure" ? "border-rose-300/25 bg-rose-400/15 text-rose-100" : "border-emerald-300/25 bg-emerald-400/15 text-emerald-800")}>
                                {selectedAnalysis.prediction === "Seizure" ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {selectedAnalysis.prediction}
                              </StatusPill>
                            </div>

                            <div className="mt-6 grid gap-5 md:grid-cols-[0.86fr_1.14fr] xl:grid-cols-1 2xl:grid-cols-[0.86fr_1.14fr]">
                              <RiskGauge riskScore={selectedAnalysis.riskScore} riskLevel={selectedAnalysis.riskLevel} />
                              <div className="space-y-5">
                                <MetricMeter label="Seizure probability" value={selectedAnalysis.seizureProbability} color="#a8b8c4" />
                                <MetricMeter label="Model confidence" value={selectedAnalysis.confidence} color="#7c3aed" />
                                <MetricMeter label="Affected-channel intensity" value={selectedAnalysis.explanation.saliency[0]?.intensity ?? 62} color="#2563eb" />
                                <div className="rounded-3xl border border-dusty-blue/30 bg-cream p-4">
                                  <p className="text-xs uppercase tracking-[0.22em] text-slate-600">Natural language explanation</p>
                                  <p className="mt-2 text-sm leading-6 text-navy/80">{selectedAnalysis.explanation.summary}</p>
                                </div>
                              </div>
                            </div>
                          </GlassCard>
                        </div>
                      </div>

                      <h2 className="text-2xl font-bold text-navy mb-2">Signal Visualization</h2>
                      <p className="text-slate-600 mb-6">Reconstructed from Figure 3 of the uploaded document.</p>

                      <div className="rounded-3xl border border-dusty-blue/30 bg-cream p-6 shadow-sm">
                        <h3 className="text-sm font-semibold text-navy mb-4">Original Signal vs Intrinsic Mode Functions (IMFs)</h3>
                        <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ReLineChart data={dynamicSignalData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="time" hide />
                              <YAxis stroke="#94a3b8" fontSize={12} />
                              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Line type="monotone" dataKey="original" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Original Signal" />
                              <Line type="monotone" dataKey="imf1" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="IMF 1 (High Freq)" />
                              <Line type="monotone" dataKey="imf2" stroke="#10b981" strokeWidth={1.5} dot={false} name="IMF 2 (Low Freq)" />
                            </ReLineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className="mt-6 rounded-3xl border border-dusty-blue/30 bg-cream-dark/50 p-6 shadow-sm">
                        <h4 className="font-semibold text-navy mb-2 flex items-center gap-2">
                          <Activity className="h-5 w-5 text-dusty-dark" /> Signal Interpretation & Diagnostics
                        </h4>
                        <p className="text-sm text-slate-700 leading-relaxed mb-4">
                          This graph decomposes the complex raw EEG signal (blue) into its fundamental Intrinsic Mode Functions (IMFs). By separating the signal, we can isolate specific frequency bands and identify underlying issues.
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="bg-cream rounded-2xl p-4 border border-dusty-blue/30">
                            <h5 className="text-xs font-bold text-navy/80 uppercase tracking-wider mb-2">Observed Problems</h5>
                            <ul className="text-sm text-slate-600 space-y-2">
                              <li className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span><strong>High-frequency noise (IMF 1):</strong> Shows irregular spikes which indicate muscle artifacts or early-stage ictal activity.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-rose-500 font-bold">•</span>
                                <span><strong>Baseline wandering (IMF 2):</strong> Low-frequency drifts suggest patient movement or electrode instability.</span>
                              </li>
                            </ul>
                          </div>
                          <div className="bg-cream rounded-2xl p-4 border border-dusty-blue/30">
                            <h5 className="text-xs font-bold text-navy/80 uppercase tracking-wider mb-2">Required Mitigations</h5>
                            <ul className="text-sm text-slate-600 space-y-2">
                              <li className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">✓</span>
                                <span><strong>Reduce:</strong> Apply a low-pass filter (e.g., 30Hz cutoff) to suppress the high-frequency muscular artifacts in the raw signal.</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-emerald-500 font-bold">✓</span>
                                <span><strong>Control:</strong> Implement a high-pass filter (0.5Hz) to stabilize baseline wandering and improve overall signal clarity.</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              {activeModule === "#risk" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                  <GlassCard id="risk" className="print-card">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-dusty-dark/80">Risk assessment</p>
                        <h3 className="mt-2 text-2xl font-semibold text-navy">Trend analysis and clinical factors</h3>
                        <p className="mt-2 text-sm leading-6 text-navy/80">Risk combines previous seizures, EEG patterns, frequency, duration, medication context, age, and longitudinal trend.</p>
                      </div>
                      <StatusPill className="border-violet-300/20 bg-violet-400/10 text-violet-100">
                        <LineChartIcon className="h-3.5 w-3.5" /> Daily · Weekly · Monthly
                      </StatusPill>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="h-72 rounded-3xl border border-dusty-blue/30 bg-cream/80 p-3">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                          <ReLineChart data={trendData.length ? trendData : [{ session: "S1", risk: 24, probability: 18, confidence: 92 }]} margin={{ left: -16, right: 8, top: 10, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                            <XAxis dataKey="session" stroke="#64748b" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Line type="monotone" dataKey="risk" stroke="#8198aa" strokeWidth={2.2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="probability" stroke="#a8b8c4" strokeWidth={2.2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="confidence" stroke="#60A5FA" strokeWidth={1.6} dot={false} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="h-72 rounded-3xl border border-dusty-blue/30 bg-cream/80 p-3">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                          <PieChart>
                            <Pie data={riskDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
                              {riskDistribution.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {[
                        ["Previous seizures", selectedPatient?.previousSeizures ?? 0, "Historical burden"],
                        ["EEG pattern", selectedAnalysis.riskScore, selectedAnalysis.severity],
                        ["Medication", selectedPatient?.medication ?? "Not recorded", "Adherence review"],
                      ].map(([label, value, detail]) => (
                        <div key={String(label)} className="rounded-3xl border border-dusty-blue/30 bg-cream p-4">
                          <p className="text-xs text-slate-600">{label as string}</p>
                          <p className="mt-2 text-xl font-semibold text-navy">{String(value)}</p>
                          <p className="mt-1 text-xs text-slate-600">{detail as string}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  <div className="mt-6 rounded-3xl border border-dusty-blue/30 bg-emerald-50/50 p-6 shadow-sm">
                    <h4 className="font-semibold text-navy mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Clinical Recommendations Based on Signals
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed mb-4">
                      Based on the elevated high-frequency energy in IMF 1 and the high risk score derived from the analyzed EEG signals, the following actions are recommended:
                    </p>
                    <div className="space-y-4">
                      <div className="bg-cream rounded-2xl p-4 border border-dusty-blue/30 flex gap-3">
                        <div className="mt-0.5"><Activity className="h-5 w-5 text-blue-500" /></div>
                        <div>
                          <h5 className="text-sm font-bold text-navy">Medication Adjustment</h5>
                          <p className="text-sm text-slate-600 mt-1">Due to the persistent high-frequency spikes indicating potential ictal activity, review and consider adjusting the current anti-epileptic drug (AED) dosage.</p>
                        </div>
                      </div>
                      <div className="bg-cream rounded-2xl p-4 border border-dusty-blue/30 flex gap-3">
                        <div className="mt-0.5"><LineChartIcon className="h-5 w-5 text-purple-500" /></div>
                        <div>
                          <h5 className="text-sm font-bold text-navy">Longitudinal Monitoring</h5>
                          <p className="text-sm text-slate-600 mt-1">The increasing trend in seizure probability requires close observation. Schedule a 24-hour ambulatory EEG to capture subclinical events.</p>
                        </div>
                      </div>
                      <div className="bg-cream rounded-2xl p-4 border border-dusty-blue/30 flex gap-3">
                        <div className="mt-0.5"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
                        <div>
                          <h5 className="text-sm font-bold text-navy">Signal Artifact Mitigation</h5>
                          <p className="text-sm text-slate-600 mt-1">Ensure proper electrode placement and impedance checking in future recordings to minimize baseline wandering (IMF 2).</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeModule === "#history" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                  <GlassCard id="history" className="print-card">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-dusty-dark/80">History module</p>
                        <h3 className="mt-2 text-2xl font-semibold text-navy">Timeline, reports, risk changes</h3>
                      </div>
                      <History className="h-6 w-6 text-dusty-dark" />
                    </div>
                    <div className="mt-5 overflow-hidden rounded-3xl border border-dusty-blue/30">
                      <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr] bg-cream/[0.06] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        <span>Patient</span>
                        <span>Prediction</span>
                        <span>Risk</span>
                        <span>Date</span>
                      </div>
                      <div className="custom-scrollbar max-h-80 overflow-auto">
                        {analyses.map((analysis) => (
                          <button
                            type="button"
                            key={analysis.id}
                            onClick={() => setSelectedPatientId(analysis.patientId)}
                            className="grid w-full grid-cols-[1fr_0.7fr_0.7fr_0.7fr] items-center border-t border-dusty-blue/30 px-4 py-3 text-left text-sm text-navy/80 transition hover:bg-cream"
                          >
                            <span className="truncate font-medium text-navy">{analysis.patientName}</span>
                            <span>{analysis.prediction}</span>
                            <span><RiskBadge risk={analysis.riskLevel} /></span>
                            <span className="text-xs text-slate-600">{formatDate(analysis.createdAt)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 h-64 rounded-3xl border border-dusty-blue/30 bg-cream/80 p-3">
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <AreaChart data={predictionTimeline} margin={{ left: -16, right: 10, top: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="timelineRisk" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.42} />
                              <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(0,0,0,0.06)" vertical={false} />
                          <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Area type="monotone" dataKey="risk" stroke="#8198aa" fill="url(#timelineRisk)" strokeWidth={2} />
                          <Line type="monotone" dataKey="probability" stroke="#a8b8c4" dot={false} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </div>
              )}
              {activeModule === "#reports" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="print-card bg-cream rounded-3xl shadow-sm border border-dusty-blue/30 overflow-hidden text-navy mx-auto max-w-4xl relative">
                    {/* Header Strip */}
                    <div className="h-4 bg-dusty-dark w-full"></div>

                    {/* Formal Header */}
                    <div className="p-8 pb-4 border-b border-dusty-blue/30 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 text-navy mb-1">
                          <Activity className="h-6 w-6" />
                          <h2 className="text-2xl font-bold tracking-tight">NeuroExplain Clinical</h2>
                        </div>
                        <p className="text-sm text-slate-500 font-medium">Department of Neurology & Clinical Neurophysiology</p>
                        <p className="text-sm text-slate-500">Automated EEG Analysis Report (AAR)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-navy">Report ID: <span className="font-mono font-normal">{reports.find(r => r.createdAt === selectedAnalysis.createdAt)?.reportNumber ?? `NXR-${new Date().getFullYear()}-${String(selectedAnalysis.id).padStart(5, '0')}`}</span></p>
                        <p className="text-sm text-slate-600">Date: {formatDate(selectedAnalysis.createdAt)}</p>
                        <div className="mt-2 inline-flex px-3 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full border border-red-200 uppercase tracking-widest">
                          CONFIDENTIAL
                        </div>
                      </div>
                    </div>

                    {/* Patient Information */}
                    <div className="p-8 py-6 bg-cream-dark border-b border-dusty-blue/30">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Patient Demographics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <p className="text-xs text-slate-500">Patient Name</p>
                          <p className="font-semibold text-navy">{selectedPatient?.name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Patient ID</p>
                          <p className="font-mono text-sm font-medium text-navy">{selectedPatient?.externalId}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Age / Sex</p>
                          <p className="font-semibold text-navy">{selectedPatient?.age} / {selectedPatient?.sex?.charAt(0).toUpperCase()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Study Type</p>
                          <p className="font-semibold text-navy">Routine EEG</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 grid md:grid-cols-3 gap-8">
                      {/* Left Column - Readings */}
                      <div className="md:col-span-1 space-y-6 border-r border-dusty-blue/30 pr-8">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">AI Assessment</h3>
                          <div className="mb-4">
                            <RiskBadge risk={selectedAnalysis.riskLevel} />
                          </div>

                          <div className="space-y-4">
                            <div className="bg-cream-dark p-3 rounded-xl border border-dusty-blue/30">
                              <p className="text-xs text-slate-500 mb-1">Primary Prediction</p>
                              <p className="font-bold text-navy text-lg">{selectedAnalysis.prediction}</p>
                            </div>

                            <div className="bg-cream-dark p-3 rounded-xl border border-dusty-blue/30">
                              <p className="text-xs text-slate-500 mb-1">Seizure Probability</p>
                              <div className="flex items-end gap-2">
                                <p className="font-bold text-navy text-lg">{selectedAnalysis.seizureProbability}%</p>
                                <p className="text-xs text-slate-400 mb-1">Model Conf: {selectedAnalysis.confidence}%</p>
                              </div>
                              <div className="w-full bg-dusty-blue/20 h-1.5 mt-2 rounded-full overflow-hidden">
                                <div className="bg-cream-dark0 h-full" style={{ width: `${selectedAnalysis.seizureProbability}%` }}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Technical Parameters</h3>
                          <ul className="text-sm space-y-2 text-slate-700">
                            <li className="flex justify-between border-b border-slate-100 pb-1">
                              <span className="text-slate-500">Duration</span>
                              <span className="font-medium">23m 45s</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-1">
                              <span className="text-slate-500">Channels</span>
                              <span className="font-medium">19 (10-20 system)</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-1">
                              <span className="text-slate-500">Sampling Rate</span>
                              <span className="font-medium">256 Hz</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-100 pb-1">
                              <span className="text-slate-500">Impedance</span>
                              <span className="font-medium text-emerald-600">&lt; 5 kΩ</span>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Right Column - Findings and Solutions */}
                      <div className="md:col-span-2 space-y-8">
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-navy mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> 1. Clinical Findings (Problems)
                          </h3>
                          <div className="prose prose-slate prose-sm max-w-none text-slate-700 space-y-3">
                            <p className="leading-relaxed">
                              {selectedAnalysis.explanation.summary}
                            </p>
                            <ul className="list-disc pl-5 space-y-1 mt-2">
                              {selectedAnalysis.affectedChannels.length > 0 && (
                                <li><strong>Affected Regions:</strong> Significant deviations detected primarily in {selectedAnalysis.affectedChannels.join(", ")}.</li>
                              )}
                              <li><strong>Signal Architecture:</strong> Computed spike rate is {selectedAnalysis.featureVector.spikeRate?.toFixed(2) ?? 0}, combined with an asymmetry index of {selectedAnalysis.featureVector.asymmetryIndex?.toFixed(2) ?? 0}.</li>
                              <li><strong>Severity Assessment:</strong> Algorithm concludes the activity shows {selectedAnalysis.severity.toLowerCase()}.</li>
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-700 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> 2. AI Recommendations (Solutions)
                          </h3>
                          <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 text-navy/80 text-sm leading-relaxed space-y-3">
                            <p>Based on the detected epileptiform activity in the left temporal lobe and the elevated seizure probability score ({selectedAnalysis.seizureProbability}%), the following actions are suggested for physician review:</p>
                            <ol className="list-decimal pl-4 space-y-2 font-medium">
                              {selectedAnalysis.recommendations.map((rec, i) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ol>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700 mb-3 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" /> 3. Physician Review & Notes
                          </h3>
                          <textarea
                            id="doctor-note"
                            value={doctorNote}
                            onChange={(event) => setDoctorNote(event.target.value)}
                            placeholder="Enter clinical interpretation, differential diagnosis, and final recommendations here..."
                            className="min-h-32 w-full rounded-xl border border-dusty-blue/30 bg-cream px-4 py-3 text-sm text-navy outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer / Signature Block */}
                    <div className="p-8 pt-0 mt-4">
                      <div className="border-t border-dusty-blue/30 pt-8 flex justify-between items-end">
                        <div className="text-xs text-slate-500 max-w-sm">
                          <p className="font-semibold text-slate-700 mb-1">Disclaimer</p>
                          <p>This report was generated using NeuroExplain AI v2.4. AI-assisted analysis provides decision support only and does not replace professional neurological diagnosis.</p>
                        </div>
                        <div className="text-center">
                          <div className="w-48 border-b-2 border-slate-300 mb-2"></div>
                          <p className="text-sm font-semibold text-navy">Attending Neurologist</p>
                          <p className="text-xs text-slate-500">M.D. / Ph.D.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Print Controls (Hidden on Print) */}
                  <div className="no-print mt-6 flex justify-center gap-4">
                    <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-dusty-dark px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-navy transition">
                      <Printer className="h-4 w-4" /> Export as Formal PDF
                    </button>
                    <button type="button" onClick={exportReport} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dusty-blue/30 bg-cream px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-cream-dark transition">
                      <Download className="h-4 w-4" /> Download Raw JSON
                    </button>
                  </div>

                  {/* Previous Reports (Hidden on Print) */}
                  <div className="no-print mt-12 max-w-4xl mx-auto">
                    <h4 className="text-sm font-semibold text-navy mb-4">Previous Reports History</h4>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                      {reports.slice(0, 4).map((report) => (
                        <div key={report.id} className="flex flex-col gap-1 rounded-2xl border border-dusty-blue/30 bg-cream/50 p-4 text-sm hover:bg-cream transition cursor-pointer">
                          <span className="font-medium text-navy">{report.reportNumber}</span>
                          <span className="text-xs text-slate-500">{formatDate(report.createdAt)}</span>
                          <span className={`text-xs font-semibold mt-2 inline-block px-2 py-0.5 rounded-full w-fit ${report.status === 'Signed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {report.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {activeModule === "#settings" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                  <GlassCard id="login" className="print-card">
                    <div className="flex items-center gap-3">
                      <Lock className="h-6 w-6 text-emerald-600" />
                      <h3 className="text-xl font-semibold text-navy">Local authentication</h3>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-navy/80">Offline role-based workspace for admins, doctors, and researchers. Demo password hint: offline-demo.</p>
                    <div className="mt-5 grid gap-3">
                      {(["doctor", "researcher", "admin"] as Role[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setRole(option)}
                          className={cx(
                            "rounded-2xl border p-4 text-left transition",
                            role === option ? "border-cyan-300/35 bg-dusty-blue/20" : "border-dusty-blue/30 bg-cream hover:bg-cream-dark",
                          )}
                        >
                          <span className="block text-sm font-semibold capitalize text-navy">{option}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-600">{roleDescriptions[option]}</span>
                        </button>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}
              {activeModule === "#help" && (
                <div className="mt-6 grid gap-5 xl:grid-cols-2 animate-in fade-in zoom-in-95 duration-300">
                  <GlassCard id="research" className="print-card">
                    <div className="flex items-center gap-3">
                      <Microscope className="h-6 w-6 text-dusty-dark" />
                      <h3 className="text-xl font-semibold text-navy">Research analytics</h3>
                    </div>
                    <div className="mt-5 h-60 rounded-3xl border border-dusty-blue/30 bg-cream/80 p-3">
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <ReLineChart data={rocData} margin={{ left: -16, right: 10, top: 10, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(0,0,0,0.06)" />
                          <XAxis dataKey="fpr" stroke="#64748b" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Line type="monotone" dataKey="tpr" stroke="#a8b8c4" strokeWidth={2.5} dot />
                        </ReLineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">ROC curve, confusion matrix, annotations, model comparison, and dataset explorer are prepared for research demonstrations.</p>
                  </GlassCard>
                  <GlassCard className="print-card">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-6 w-6 text-dusty-dark" />
                      <h3 className="text-xl font-semibold text-navy">Confusion matrix</h3>
                    </div>
                    <div className="mt-5">
                      <MiniMatrix />
                    </div>
                    <div className="mt-5 h-32 rounded-3xl border border-dusty-blue/30 bg-cream/80 p-3">
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <RadialBarChart innerRadius="45%" outerRadius="95%" data={[{ name: "AUC", value: 94, fill: "#06B6D4" }]} startAngle={180} endAngle={-180}>
                          <RadialBar dataKey="value" cornerRadius={12} background />
                          <Tooltip contentStyle={tooltipStyle} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </div>
              )}
              {activeModule === "#lecture" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <BookOpen className="h-8 w-8 text-dusty-dark" />
                    <h2 className="text-2xl font-bold text-navy">AI Educational Lecture: {selectedPatient?.name ?? "Case Study"}</h2>
                  </div>

                  <div className="rounded-3xl border border-dusty-blue/30 bg-cream p-8 shadow-sm max-w-none">
                    <h3 className="text-lg font-bold text-navy mb-4">Understanding the Model's Methodology</h3>
                    <p className="text-slate-700 leading-relaxed mb-6">The AI agent uses <strong>Empirical Mode Decomposition (EMD)</strong> combined with statistical feature extraction. In this specific case, the model analyzed the uploaded dataset and computed a raw feature vector, which was standardized against a global baseline of 36 distinct recordings.</p>

                    <h4 className="font-semibold text-navy mb-2">1. Machine Learning Inference</h4>
                    <p className="text-slate-700 leading-relaxed mb-4">A Random Forest classifier, autonomously trained using K-Means clustering on the 36-dataset archive, processed this CSV signal. The prediction yielded a <strong>{selectedAnalysis.seizureProbability}% confidence</strong> for the {selectedAnalysis.prediction} class, primarily driven by these real-time mathematical features:</p>
                    <ul className="list-disc pl-5 mb-6 text-slate-700 space-y-2">
                      <li><strong>Signal Spike Rate:</strong> Evaluated at {selectedAnalysis.featureVector.spikeRate?.toFixed(2) ?? 0}, indicating the prevalence of high-frequency sharp waves.</li>
                      <li><strong>Asymmetry Index:</strong> Measured at {selectedAnalysis.featureVector.asymmetryIndex?.toFixed(2) ?? 0}, heavily influencing the lateralization detection.</li>
                      <li><strong>Line Noise Factor:</strong> Registered at {selectedAnalysis.featureVector.lineNoise?.toFixed(2) ?? 0}, identifying the density of zero-crossings across the dataset.</li>
                    </ul>

                    <h4 className="font-semibold text-navy mb-2">2. Clinical Synthesis</h4>
                    <p className="text-slate-700 leading-relaxed mb-6">Because this specific dataset yielded a risk score of <strong>{selectedAnalysis.riskScore}</strong> (classified as {selectedAnalysis.riskLevel} risk), the AI correctly identified {selectedAnalysis.prediction === "Seizure" ? "high-frequency oscillations and spikes consistent with ictal states" : "relatively stable inter-ictal baselines without pronounced paroxysmal activity"}. The probability of seizure was calculated as {selectedAnalysis.seizureProbability}% based on the integration of these features with the patient's age ({selectedPatient?.age}) and history of {selectedPatient?.previousSeizures} previous seizures.</p>

                    <div className="bg-cream-dark border border-dusty-blue/30 rounded-xl p-5 mt-6">
                      <p className="text-sm text-slate-700 m-0"><strong>Key Takeaway:</strong> By dynamically extracting exact statistical moments from {selectedAnalysis.fileName} and passing them through a trained classifier, the system avoids static thresholding and adapts purely to the uploaded EEG data, culminating in the <strong>{selectedAnalysis.prediction}</strong> prediction.</p>
                    </div>
                  </div>
                </div>
              )}
              {activeModule === "#learning" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300 flex flex-col h-[600px]">
                  <h2 className="text-2xl font-bold text-navy mb-2">Interactive Learning & Chat</h2>
                  <p className="text-slate-600 mb-4">Ask questions about the document, the reconstructed signals, or the methodology.</p>

                  <div className="flex-1 rounded-3xl border border-dusty-blue/30 bg-cream flex flex-col shadow-sm overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === "user" ? "bg-dusty-dark text-white" : "bg-cream-dark border border-slate-100 text-navy/80"}`}>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-cream-dark">
                      <form onSubmit={handleSendMessage} className="relative">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="E.g., Why was sample entropy used instead of approximate entropy?"
                          className="w-full rounded-2xl border border-dusty-blue/30 bg-cream px-5 py-4 pr-14 text-sm text-navy outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim()}
                          className="absolute right-2 top-2 bottom-2 rounded-xl bg-dusty-dark w-10 flex items-center justify-center text-white disabled:opacity-50 transition hover:bg-navy"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send h-4 w-4"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-dusty-blue/30 bg-cream-dark p-8 shadow-[0_0_80px_rgba(6,182,212,0.15)] glow-border"
            >
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-navy">Local Login</h2>
                <button
                  onClick={() => setIsLoginModalOpen(false)}
                  className="rounded-full p-2 hover:bg-cream-dark transition"
                  type="button"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                {loginError && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                    <span className="font-semibold text-red-300">Error:</span> {loginError}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-navy/80" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full rounded-2xl border border-dusty-blue/30 bg-cream-dark px-4 py-3 text-navy outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50"
                    placeholder="doctor@neuro.local"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-navy/80" htmlFor="password">Password Check</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full rounded-2xl border border-dusty-blue/30 bg-cream-dark px-4 py-3 text-navy outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50"
                    placeholder="offline-demo"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-dusty-dark py-3.5 font-semibold text-navy transition hover:bg-cyan-400 disabled:opacity-50"
                >
                  {isLoggingIn ? "Logging in..." : "Access Dashboard"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div></main>
  );
}
