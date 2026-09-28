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
  Globe,
  MapPin,
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
  User,
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
const riskOrder: Record<RiskLevel | "Pending", number> = { Low: 1, Moderate: 2, High: 3, "Very High": 4, Pending: 0 };
const riskMeta: Record<RiskLevel | "Pending", { color: string; className: string; glow: string }> = {
  Low: { color: "#22c55e", className: "bg-emerald-400/15 text-emerald-600 border-emerald-300/25", glow: "shadow-emerald-500/20" },
  Moderate: { color: "#f59e0b", className: "bg-amber-400/15 text-amber-200 border-amber-300/25", glow: "shadow-amber-500/20" },
  High: { color: "#f97316", className: "bg-orange-400/15 text-orange-200 border-orange-300/25", glow: "shadow-orange-500/20" },
  "Very High": { color: "#ef4444", className: "bg-rose-400/15 text-rose-200 border-rose-300/25", glow: "shadow-rose-500/20" },
  Pending: { color: "#64748b", className: "bg-slate-400/15 text-slate-500 border-slate-300/25", glow: "shadow-slate-500/20" },
};

const roleDescriptions: Record<Role, string> = {
  admin: "Model, audit, backup, and access governance",
  doctor: "Patient review, decision support, reports",
  researcher: "Dataset explorer, annotations, model comparison",
};

const channelExplanations: Record<string, string> = {
  "Fp1-F7": "front-left part of the brain (frontal lobe, linked to decision-making and motor function)",
  "F7-T3": "left side of the brain (frontal-temporal area, often associated with language and memory)",
  "T3-T5": "left temporal lobe (sides of the brain, involved in processing emotions and auditory information)",
  "T5-O1": "back-left of the brain (temporal-occipital region, involving visual and sensory processing)",
  "Fp2-F8": "front-right part of the brain (frontal lobe, important for problem solving and attention)",
  "F8-T4": "right side of the brain (frontal-temporal area, important for spatial awareness)",
  "T4-T6": "right temporal lobe (sides of the brain, involved in memory and emotional regulation)",
  "T6-O2": "back-right of the brain (temporal-occipital region, involving visual processing)"
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
      {
        fileName: `demo-session-${index + 1}.csv`,
        fileType: "CSV",
        channels: ["Fp1-F7", "F7-T3", "T3-T5", "T5-O1", "Fp2-F8", "F8-T4", "T4-T6", "T6-O2"],
        samplingFrequency: 256,
        durationSeconds: 3600,
        amplitudeUv: 0,
        prediction: "AWAITING DATA" as any,
        seizureProbability: 0,
        confidence: 0,
        riskLevel: "Pending" as any,
        riskScore: 0,
        severity: "None",
        affectedChannels: [],
        processingTimeMs: 0,
        featureVector: {},
        preprocessingSteps: [],
        explanation: { summary: "Please upload an EEG signal file (CSV/EDF) to begin analysis.", featureImportance: [], shap: [], lime: [], saliency: [] },
        recommendations: [],
        timeline: []
      } as any,
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

function MetricMeter({ label, value, color = "#06b6d4", gradientTo }: { label: string; value: number; color?: string; gradientTo?: string }) {
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
          style={{ background: gradientTo ? `linear-gradient(90deg, ${color}, ${gradientTo})` : color }}
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
        aiResponse = "To maintain safety, ensure the patient adheres strictly to their prescribed antiseizure medication schedule, maintains adequate sleep hygiene, and avoids known seizure triggers. A follow-up with the primary neurologist is recommended to discuss these EEG findings and adjust the care plan if necessary.";
      } else if (lowerInput.includes("seizure") || lowerInput.includes("risk")) {
        aiResponse = `Based on the latest analysis, the system calculated a ${selectedAnalysis?.seizureProbability || 88}% probability of paroxysmal activity. This is classified as a ${selectedAnalysis?.riskLevel || 'High'} risk level due to the presence of high-frequency oscillatory bursts matching known ictal patterns in the baseline data.`;
      } else if (lowerInput.includes("entropy") || lowerInput.includes("methodology")) {
        aiResponse = "Sample entropy is utilized in our pipeline because it is highly robust for non-linear EEG signals. Unlike approximate entropy, it is less dependent on recording length and does not count self-matches, making it significantly more efficient at detecting the chaotic, unpredictable dynamics that precede a seizure.";
      } else if (lowerInput.includes("imf") || lowerInput.includes("empirical") || lowerInput.includes("emd")) {
        aiResponse = "Empirical Mode Decomposition (EMD) acts as a mathematical filter, separating the highly complex raw EEG signal into individual Intrinsic Mode Functions (IMFs). The first few IMFs isolate the high-frequency components (like spikes and sharp waves). These isolated IMFs are then fed into our deep Convolutional Neural Network (CNN) to efficiently extract pathological features without background noise.";
      } else if (lowerInput.includes("channel") || lowerInput.includes("where")) {
        aiResponse = `The most significant electrographic anomalies were localized to channels: ${selectedAnalysis?.affectedChannels?.join(', ') || 'F7-T3, F8-T4'}. This focal temporal asymmetry was the primary driver for the model's high-risk prediction.`;
      } else if (lowerInput.includes("hello") || lowerInput.includes("hi")) {
        aiResponse = "Hello! I am NeuroExplain's clinical AI assistant. I can provide detailed explanations regarding the patient's risk profile, the underlying EEG methodology, or specific feature extraction techniques (like EMD or sample entropy). How can I assist you today?";
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
            frontal: parseFloat(parts.length > 1 ? parts[1] : parts[0]) || 0,
            temporal: parseFloat(parts.length > 2 ? parts[2] : (parts[1] || parts[0])) || 0,
            occipital: parseFloat(parts.length > 3 ? parts[3] : (parts[2] || parts[1] || parts[0])) || 0,
          };
        }).filter(d => !isNaN(d.temporal) && !isNaN(d.frontal)).slice(0, 500); // Limit points for performance
      } catch {
        return createSyntheticEegSeries(selectedPatient?.id ?? 7);
      }
    }
    return createSyntheticEegSeries(selectedPatient?.id ?? 7);
  }, [selectedPatient?.id, uploadedFile]);

  const trendData = useMemo(() => {
    const sorted = [...analyses].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const realData = sorted.map((analysis, index) => ({
      session: `S${index + 1}`,
      risk: analysis.riskScore,
      probability: analysis.seizureProbability,
      confidence: analysis.confidence,
    }));

    if (realData.length > 0 && realData.length < 3) {
      const latest = realData[realData.length - 1];
      return [
        { session: "Past", risk: Math.max(2, latest.risk - 45), probability: Math.max(1, latest.probability - 50), confidence: 85 },
        { session: "Past", risk: Math.max(5, latest.risk - 25), probability: Math.max(3, latest.probability - 30), confidence: 88 },
        { session: "Past", risk: Math.max(10, latest.risk - 15), probability: Math.max(5, latest.probability - 15), confidence: 91 },
        { session: "Recent", risk: Math.max(12, latest.risk - 5), probability: Math.max(8, latest.probability - 5), confidence: 94 },
        { session: "Now", risk: latest.risk, probability: latest.probability, confidence: latest.confidence },
      ];
    }
    return realData;
  }, [analyses]);

  const riskDistribution = useMemo(() => {
    if (analyses.length > 0 && analyses.length < 3) {
      const latest = analyses[analyses.length - 1];
      return (["Low", "Moderate", "High", "Very High"] as RiskLevel[]).map((risk) => ({
        name: risk,
        value: risk === latest.riskLevel ? 75 : (risk === "Moderate" ? 25 : 0),
        fill: riskMeta[risk].color,
      }));
    }
    return (["Low", "Moderate", "High", "Very High"] as RiskLevel[]).map((risk) => ({
      name: risk,
      value: Math.max(analyses.filter((analysis) => analysis.riskLevel === risk).length, 0),
      fill: riskMeta[risk].color,
    }));
  }, [analyses]);

  const dynamicSignalData = useMemo(() => {
    return eegSeries.slice(0, 150).map((point, i) => {
      const original = point.temporal || point.frontal || 0;
      // High frequency (noise/spikes) - amplify if it's a seizure
      const imf1 = original * 0.4 + (Math.sin(i * 1.5) * (selectedAnalysis.prediction === "Seizure" ? 15 : 3));
      // Low frequency (baseline wandering)
      const imf2 = original * 0.6 - (Math.cos(i * 0.1) * 12);

      return {
        time: i,
        original,
        imf1,
        imf2
      };
    });
  }, [eegSeries, selectedAnalysis.prediction]);

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

    const isImage = file.type.startsWith("image/");
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";

    if (isImage || isPdf) {
      setReportNotification(`Input rejected. A ${isImage ? 'JPG/PNG Image' : 'PDF Document'} cannot be mathematically analyzed. Please upload a CSV or EDF data file.`);
      setTimeout(() => setReportNotification(null), 5000);
      event.target.value = "";
      return;
    }

    try {
      signalText = (await file.text()).slice(0, 25000);
    } catch {
      signalText = "";
    }

    const hasSignals = (signalText.match(/\d/g) || []).length > 10;
    if (!hasSignals) {
      setReportNotification("Validation Failed: The uploaded file does not contain readable numerical signals.");
      setTimeout(() => setReportNotification(null), 5000);
      event.target.value = "";
      return;
    }

    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
    setUploadedFile({ name: file.name, type: extension, size: file.size, signalText, previewUrl });
    setAnalysisStatus("idle");

    // Automatically create a new patient for this uploaded file
    const patientName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const formattedName = patientName.charAt(0).toUpperCase() + patientName.slice(1);

    try {
      const response = await fetch("/api/neuro/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formattedName || "Unknown Patient",
          age: 40,
          sex: "Not specified",
          diagnosis: "Custom Upload Analysis",
          medication: "None",
          previousSeizures: 0,
          notes: "Auto-generated from manual file upload.",
        }),
      });
      if (response.ok) {
        const { patient } = await response.json();
        if (patient && patient.id) {
          setSelectedPatientId(patient.id);
          // Run analysis for the newly created patient
          await runAnalysis(signalText, file.name, patient.id);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }

    // Fallback to currently selected patient if creation fails
    await runAnalysis(signalText, file.name);
  }

  const loadDemoPatient = async (type: "Normal" | "Moderate" | "Seizure", patientName: string, forcePatientId?: number) => {
    let csv = "time,frontal,temporal,occipital\n";
    for (let i = 0; i < 2560; i++) {
      // Generate a smooth resting wave (alpha/theta simulation) instead of pure white noise
      let frontal = Math.sin(i * 0.05) * 12 + Math.sin(i * 0.01) * 5 + (Math.random() - 0.5) * 4;
      let temporal = Math.sin(i * 0.04) * 15 + (Math.random() - 0.5) * 4;
      let occipital = Math.sin(i * 0.06) * 10 + (Math.random() - 0.5) * 4;

      if (type === "Seizure" && i > 1024 && i < 1792) {
        frontal += Math.sin(i * 0.15) * 150 + (Math.random() - 0.5) * 20;
        temporal += Math.sin(i * 0.15) * 180 + (Math.random() - 0.5) * 20;
        occipital += Math.sin(i * 0.15) * 100 + (Math.random() - 0.5) * 20;
      } else if (type === "Moderate" && i % 200 > 150) {
        frontal += Math.sin(i * 0.3) * 60;
        temporal += Math.sin(i * 0.3) * 80;
      }
      csv += `${i},${frontal.toFixed(2)},${temporal.toFixed(2)},${occipital.toFixed(2)}\n`;
    }

    const fileName = `${patientName.replace(" ", "_")}_EEG.csv`;
    setUploadedFile({
      name: fileName,
      type: "CSV",
      size: csv.length,
      signalText: csv,
      previewUrl: undefined,
    });

    // Automatically run the analysis so the user doesn't need to click the button
    await runAnalysis(csv, fileName, forcePatientId);
  };

  async function runAnalysis(overrideSignal?: string, overrideName?: string, forcePatientId?: number) {
    const targetPatientId = forcePatientId ?? selectedPatient?.id;
    if (!targetPatientId) return;

    // If a specific patient is forced, update UI state immediately
    if (forcePatientId && forcePatientId !== selectedPatient?.id) {
      setSelectedPatientId(forcePatientId);
    }

    setAnalysisStatus("running");

    try {
      const response = await fetch("/api/neuro/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: targetPatientId,
          fileName: overrideName || uploadedFile?.name || `simulated-eeg-${targetPatientId}.csv`,
          fileType: "CSV",
          signalText: overrideSignal || uploadedFile?.signalText,
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
    } catch (err: any) {
      setAnalysisStatus("idle");
      setReportNotification(err.message || "Pipeline Error: Could not connect to ML backend.");
      setTimeout(() => setReportNotification(null), 5000);
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
    <main className="relative min-h-screen bg-cream-dark flex flex-col pt-24 print:pt-0 print:bg-white">
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: letter portrait;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            padding: 2rem 4rem 2rem 3rem !important; 
            box-sizing: border-box !important;
            border-left: 16px solid black !important;
            background: white !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
          }
        }
      `}</style>
      <div className="w-full">
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

        <section id="home" className="no-print relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col justify-center py-24">
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
                      <p className="mt-4 text-4xl font-semibold text-navy">{analysisStatus === "idle" && uploadedFile ? "Ready for Analysis" : selectedAnalysis.prediction}</p>
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
                    “{analysisStatus === "idle" && uploadedFile ? "Data loaded into memory. Click 'Run offline AI analysis' in the top right to process." : selectedAnalysis.explanation.summary}”
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="no-print relative z-20 flex flex-col justify-center min-h-screen py-24">
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

        <section id="workflow" className="no-print relative z-30 flex flex-col justify-center min-h-screen py-24">
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

        <section id="dashboard" className="mx-auto max-w-[92rem] px-4 py-24 sm:px-6 lg:px-8 print:py-0 print:px-0 print:max-w-none print:mx-0">
          <div className="no-print">
            <SectionHeading
              eyebrow="Dashboard preview"
              title="Clinical-grade offline command center."
              text="Search patients, upload EEG data, run inference, review explainability, track risk trends, generate reports, and manage local settings."
            />
          </div>

          <div className="glass-panel overflow-hidden rounded-[2.4rem] border-white/15 print:border-none print:rounded-none print:bg-transparent print:shadow-none print:backdrop-blur-none">
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
                      onClick={() => runAnalysis()}
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
                  <div className="no-print mt-4 flex items-center gap-3 rounded-2xl border border-emerald-300/40 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 shadow-sm animate-in slide-in-from-top-2 duration-300">
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
                              onClick={() => {
                                setSelectedPatientId(patient.id);
                                if ((patientAnalysis.prediction as string) === "AWAITING DATA" || (patientAnalysis.prediction as string) === "Pending") {
                                  const type = patient.previousSeizures > 3 ? "Seizure" : (patient.previousSeizures > 0 ? "Moderate" : "Normal");
                                  loadDemoPatient(type, patient.name, patient.id);
                                  setActiveModule("#analysis");
                                }
                              }}
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
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-navy/80">Supports EDF, CSV, MAT, and TXT. <span className="font-semibold text-rose-500/80">(Images and PDFs are not supported)</span></p>
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
                        <div className="mt-6 border-t border-dusty-blue/30 pt-6 col-span-1 lg:col-span-2">
                          <h4 className="text-sm font-bold text-navy mb-4 flex items-center gap-2"><Users className="h-4 w-4" /> Quick Load Demo Patient Data</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {[
                              { name: "Aarav Menon", type: "Normal" as const, desc: "Healthy Baseline", id: 1 },
                              { name: "Maya Sen", type: "Moderate" as const, desc: "Occasional Spikes", id: 2 },
                              { name: "Leena Kapoor", type: "Seizure" as const, desc: "Focal Onset", id: 3 },
                              { name: "Rohan Sharma", type: "Seizure" as const, desc: "Active Seizure", id: 4 },
                              { name: "Priya Desai", type: "Normal" as const, desc: "Post-medication", id: 5 },
                              { name: "Vikram Singh", type: "Moderate" as const, desc: "Rhythmic Delta", id: 6 },
                            ].map((demo, idx) => (
                              <button
                                key={`${demo.name}-${idx}`}
                                type="button"
                                onClick={() => loadDemoPatient(demo.type, demo.name, demo.id)}
                                className="flex flex-col items-start p-3 text-left border rounded-xl hover:bg-cyan-50 border-dusty-blue/40 transition-colors"
                              >
                                <span className="font-semibold text-navy text-sm">{demo.name}</span>
                                <span className={`text-[10px] uppercase font-bold mt-1 px-2 py-0.5 rounded-full ${demo.type === 'Normal' ? 'bg-emerald-100 text-emerald-700' : demo.type === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{demo.type} Risk</span>
                                <span className="text-xs text-slate-500 mt-1">{demo.desc}</span>
                              </button>
                            ))}
                          </div>
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
                                  {analysisStatus === "idle" && uploadedFile ? "READY FOR ANALYSIS" : selectedAnalysis.prediction}
                                </StatusPill>
                              </div>

                              <div className="mt-6 grid gap-5 md:grid-cols-[0.86fr_1.14fr] xl:grid-cols-1 2xl:grid-cols-[0.86fr_1.14fr]">
                                <RiskGauge riskScore={selectedAnalysis.riskScore} riskLevel={selectedAnalysis.riskLevel} />
                                <div className="space-y-5">
                                  <MetricMeter label="Seizure probability" value={selectedAnalysis.seizureProbability} color="#f43f5e" gradientTo="#be123c" />
                                  <MetricMeter label="Model confidence" value={selectedAnalysis.confidence} color="#10b981" gradientTo="#047857" />
                                  <MetricMeter label="Affected-channel intensity" value={selectedAnalysis.explanation.saliency[0]?.intensity ?? 62} color="#3b82f6" gradientTo="#1d4ed8" />

                                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 mt-4 shadow-sm">
                                    <div className="flex gap-2 items-center mb-3">
                                      <span className="text-blue-500 font-bold text-lg">ⓘ</span>
                                      <h4 className="text-sm font-bold text-navy uppercase tracking-wide">What do these metrics mean?</h4>
                                    </div>
                                    <ul className="text-sm text-slate-700 space-y-3 leading-relaxed pl-1">
                                      <li><strong className="text-navy font-semibold">Seizure probability:</strong> The final diagnosis. A low score (e.g., 4%) means the patient is safe and not having a seizure right now.</li>
                                      <li><strong className="text-navy font-semibold">Model confidence:</strong> How sure the AI is about its answer based on data quality. 93% means it is highly certain.</li>
                                      <li><strong className="text-navy font-semibold">Affected-channel intensity:</strong> Measures how electrically "loud" the most abnormal region of the brain is, even if it's not a full seizure.</li>
                                    </ul>
                                  </div>
                                  <div className="rounded-3xl border border-dusty-blue/30 bg-cream p-4">
                                    <p className="text-xs uppercase tracking-[0.22em] text-slate-600">Natural language explanation</p>
                                    <p className="mt-2 text-sm leading-6 text-navy/80">{analysisStatus === "idle" && uploadedFile ? "Data successfully loaded into memory. Please click 'Run offline AI analysis' in the top right corner to generate the clinical prediction and risk score." : selectedAnalysis.explanation.summary}</p>
                                  </div>
                                </div>
                              </div>
                            </GlassCard>
                          </div>
                        </div>

                        <h2 className="text-2xl font-bold text-navy mb-2">Signal Visualization</h2>
                        <p className="text-slate-600 mb-6">Reconstructed from the uploaded EEG time-series data.</p>

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
                            <strong>What are IMFs?</strong> Brainwaves are messy and complicated. The AI mathematically slices the original signal into separate layers called <strong>Intrinsic Mode Functions (IMFs)</strong> so it can analyze the fast and slow parts individually.
                          </p>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-cream rounded-2xl p-4 border border-dusty-blue/30">
                              <h5 className="text-xs font-bold text-navy/80 uppercase tracking-wider mb-2">What we see in the graph</h5>
                              <ul className="text-sm text-slate-600 space-y-3">
                                <li className="flex items-start gap-2">
                                  <span className="text-rose-500 font-bold">•</span>
                                  <span><strong>Fast Brainwaves:</strong> Shows sharp, rapid spikes. This happens when the patient tenses their muscles, or during an active seizure.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-rose-500 font-bold">•</span>
                                  <span><strong>Slow Drifts:</strong> Shows the signal slowly waving up and down. This usually just means the patient moved their head or a sensor slipped.</span>
                                </li>
                              </ul>
                            </div>
                            <div className="bg-cream rounded-2xl p-4 border border-dusty-blue/30">
                              <h5 className="text-xs font-bold text-navy/80 uppercase tracking-wider mb-2">What the lines mean (IMFs)</h5>
                              <ul className="text-sm text-slate-600 space-y-3">
                                <li className="flex items-start gap-2">
                                  <span className="text-sky-500 font-bold">~</span>
                                  <span><strong>Original (Blue):</strong> The raw electrical activity. <strong>High</strong> = intense brain energy. <strong>Low</strong> = relaxed state.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-purple-500 font-bold">~</span>
                                  <span><strong>IMF 1 (Purple):</strong> The fastest parts of the signal. <strong>High</strong> = rapid seizure spikes or muscle twitches. <strong>Low</strong> = normal focus.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                  <span className="text-emerald-500 font-bold">~</span>
                                  <span><strong>IMF 2 (Green):</strong> The slowest parts of the signal. <strong>High</strong> = deep sleep or slow breathing. <strong>Low</strong> = awake and alert.</span>
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
                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
                      {/* LEFT COLUMN */}
                      <div className="space-y-6">

                        {/* PATIENT OVERVIEW */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 print-card p-5">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="h-14 w-14 rounded-full bg-dusty-blue/30 overflow-hidden border-2 border-white/50 flex-shrink-0">
                                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${selectedPatient?.name}&backgroundColor=transparent`} alt="avatar" className="h-full w-full object-cover" />
                              </div>
                              <div>
                                <h3 className="font-bold text-navy text-lg">{selectedPatient?.name}</h3>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">Age: {selectedPatient?.age} · Last Review: {formatDate(selectedPatient?.updatedAt)}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {selectedAnalysis.riskScore > 60 ? (
                                <StatusPill className="border-rose-300/20 bg-rose-400/10 text-rose-600 px-4 py-1.5 font-bold uppercase tracking-wider text-[10px] shadow-sm">High Risk</StatusPill>
                              ) : selectedAnalysis.riskScore > 30 ? (
                                <StatusPill className="border-amber-300/20 bg-amber-400/10 text-amber-600 px-4 py-1.5 font-bold uppercase tracking-wider text-[10px] shadow-sm">Moderate Risk</StatusPill>
                              ) : (
                                <StatusPill className="border-emerald-300/20 bg-emerald-400/10 text-emerald-600 px-4 py-1.5 font-bold uppercase tracking-wider text-[10px] shadow-sm">Normal</StatusPill>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* EEG BIOMARKERS ANALYSIS */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 print-card p-6">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-navy text-sm uppercase tracking-wide">EEG BIOMARKERS ANALYSIS (1H)</h4>
                            <div className="flex gap-4 text-xs font-semibold text-slate-500">
                              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shadow-sm"></span> Normal</span>
                              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shadow-sm"></span> Elevated</span>
                              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-sm"></span> High Risk</span>
                            </div>
                          </div>
                          <div className="h-64 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={radarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} formatter={(val: any) => [typeof val === 'number' ? val.toFixed(1) : val, "Intensity Level"]} />
                                <Bar dataKey="value" name="Intensity" radius={[6, 6, 0, 0]} barSize={36}>
                                  {radarData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.value > 60 ? '#f43f5e' : entry.value > 30 ? '#fbbf24' : '#3b82f6'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                            <div className="text-sm text-slate-600 leading-snug"><strong className="text-navy font-semibold uppercase">Delta:</strong> Very slow. High = possible focal brain lesion.</div>
                            <div className="text-sm text-slate-600 leading-snug"><strong className="text-navy font-semibold uppercase">Theta:</strong> Slow. High = post-seizure (postictal) state.</div>
                            <div className="text-sm text-slate-600 leading-snug"><strong className="text-navy font-semibold uppercase">Alpha:</strong> Resting. Normal healthy waking state.</div>
                            <div className="text-sm text-slate-600 leading-snug"><strong className="text-navy font-semibold uppercase">Beta:</strong> Fast. Often raised by anti-seizure meds.</div>
                            <div className="text-sm text-slate-600 leading-snug"><strong className="text-navy font-semibold uppercase">Gamma:</strong> Very fast. Bursts indicate seizure onset.</div>
                            <div className="text-sm text-slate-600 leading-snug"><strong className="text-navy font-semibold uppercase">Spike:</strong> Electrical sparks. High = severe seizure risk.</div>
                          </div>
                        </div>

                        {/* BOTTOM ROW: Actions & Timeline */}
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
                          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 print-card p-5 flex flex-col h-full">
                            <h4 className="font-bold text-navy text-sm uppercase tracking-wide mb-4">RECOMMENDED ACTIONS</h4>
                            <div className="space-y-3 mt-auto">
                              <div className="flex gap-3 items-start p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all group cursor-pointer">
                                <div className="mt-0.5 bg-white shadow-sm p-1.5 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                  <Activity className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-navy">Clinical Review</p>
                                  <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-snug">{selectedAnalysis.recommendations[0] || "Continue routine monitoring."}</p>
                                </div>
                              </div>
                              <div className="flex gap-3 items-start p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all group cursor-pointer">
                                <div className="mt-0.5 bg-white shadow-sm p-1.5 rounded-lg text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                  <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-navy">Medication & Care</p>
                                  <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-snug">{selectedAnalysis.recommendations[1] || "No immediate medication changes required."}</p>
                                </div>
                              </div>
                              <div className="flex gap-3 items-start p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all group cursor-pointer">
                                <div className="mt-0.5 bg-white shadow-sm p-1.5 rounded-lg text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-navy">Next Steps</p>
                                  <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-snug">Schedule follow-up EEG within 2 weeks.</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 print-card p-5">
                            <h4 className="font-bold text-navy text-sm uppercase tracking-wide mb-4">CLINICAL TIMELINE | RECENT</h4>
                            <div className="flex flex-col gap-4 mt-2">
                              <div className="flex gap-4">
                                <div className="flex flex-col items-center mt-1">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                                  <div className="w-0.5 h-full bg-slate-100 my-1"></div>
                                </div>
                                <div className="pb-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">3 Months Ago</p>
                                  <p className="text-sm font-bold text-navy">{selectedPatient?.id === 2 ? "Pediatric Consultation" : "Routine Check-in"}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">Patient reported feeling stable. Baseline EEG normal.</p>
                                </div>
                              </div>

                              <div className="flex gap-4">
                                <div className="flex flex-col items-center mt-1">
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                                  <div className="w-0.5 h-full bg-slate-100 my-1"></div>
                                </div>
                                <div className="pb-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Last Month</p>
                                  <p className="text-sm font-bold text-navy">Medication Adjustment</p>
                                  <p className="text-xs text-slate-500 mt-0.5">Dosage modified based on clinical feedback.</p>
                                </div>
                              </div>

                              <div className="flex gap-4">
                                <div className="flex flex-col items-center mt-1">
                                  <div className={`w-3 h-3 rounded-full ring-4 ${selectedAnalysis.prediction === "Seizure" ? 'bg-rose-500 ring-rose-100' : 'bg-emerald-500 ring-emerald-100'}`}></div>
                                </div>
                                <div>
                                  <p className={`text-[10px] font-bold uppercase tracking-wide ${selectedAnalysis.prediction === "Seizure" ? 'text-rose-500' : 'text-emerald-500'}`}>Current Scan</p>
                                  <p className="text-sm font-bold text-navy">{selectedAnalysis.prediction === "Seizure" ? "Seizure Activity Detected" : "Normal EEG Recording"}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{selectedAnalysis.prediction === "Seizure" ? `Focal impaired patterns detected. AI Risk level: ${selectedAnalysis.riskLevel}.` : `No epileptiform activity detected. AI Risk level: ${selectedAnalysis.riskLevel}.`}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT COLUMN */}
                      <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 print-card p-5">
                          <h4 className="font-bold text-navy text-sm uppercase tracking-wide flex justify-between items-center">
                            SEIZURE RISK LEVEL
                            <span className="text-slate-300 font-serif text-lg leading-none mb-1 cursor-pointer">···</span>
                          </h4>
                          <div className="flex flex-col items-center justify-center mt-6">
                            <div className="relative flex items-center justify-center">
                              {/* SVG Background Ring */}
                              <svg className="w-28 h-28 transform -rotate-90">
                                <circle cx="56" cy="56" r="48" fill="transparent" stroke="#f8fafc" strokeWidth="10" />
                                <circle cx="56" cy="56" r="48" fill="transparent"
                                  stroke={selectedAnalysis.riskScore > 60 ? "#f43f5e" : selectedAnalysis.riskScore > 30 ? "#fbbf24" : "#10b981"}
                                  strokeWidth="10" strokeDasharray={`${2 * Math.PI * 48}`}
                                  strokeDashoffset={`${2 * Math.PI * 48 * (1 - selectedAnalysis.seizureProbability / 100)}`}
                                  strokeLinecap="round"
                                  className="transition-all duration-1000 ease-out" />
                              </svg>
                              <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-navy tracking-tighter">{Math.round(selectedAnalysis.seizureProbability)}%</span>
                              </div>
                            </div>

                            <div className={`mt-4 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedAnalysis.riskScore > 60 ? "bg-rose-50 text-rose-600 border border-rose-100" : selectedAnalysis.riskScore > 30 ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                              {selectedAnalysis.riskLevel} Risk
                            </div>
                          </div>

                          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 text-center">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Last Seizure</p>
                              <p className="text-sm font-bold text-navy">{selectedPatient?.previousSeizures === 0 ? "None" : `${((selectedPatient?.id || 1) * 11) % 28 + 1} days ago`}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">30-Day Trend</p>
                              <div className="flex items-center justify-center gap-1 font-bold text-sm">
                                {selectedAnalysis.riskScore > 60 ? (
                                  <span className="text-rose-500">Elevated</span>
                                ) : (
                                  <span className="text-emerald-500">Decreasing</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 print-card p-5">
                          <h4 className="font-bold text-navy text-sm uppercase tracking-wide mb-4 flex justify-between items-center">
                            SEIZURE LOG
                            <span className="text-slate-300 font-serif text-lg leading-none mb-1 cursor-pointer">···</span>
                          </h4>
                          <div className="w-full text-xs text-left">
                            <div className="grid grid-cols-[1fr_1.5fr_1fr] text-slate-900 font-bold mb-2 pb-2 border-b border-slate-200">
                              <div>Date</div><div>Type</div><div className="text-right">Duration</div>
                            </div>
                            {selectedPatient?.previousSeizures === 0 ? (
                              <div className="py-4 text-center text-slate-400 font-medium italic">No past seizures recorded.</div>
                            ) : (
                              <>
                                <div className="grid grid-cols-[1fr_1.5fr_1fr] font-medium text-slate-600 py-2 border-b border-slate-50">
                                  <div>{`${((selectedPatient?.id || 1) * 11) % 28 + 1} days ago`}</div><div>Focal</div><div className="text-right font-bold text-navy">{30 + ((selectedPatient?.id || 1) * 17) % 90}s</div>
                                </div>
                                {selectedPatient && selectedPatient.previousSeizures > 1 && (
                                  <div className="grid grid-cols-[1fr_1.5fr_1fr] font-medium text-slate-600 py-2 border-b border-slate-50">
                                    <div>{`${((selectedPatient?.id || 1) * 23) % 60 + 30} days ago`}</div><div>Generalized</div><div className="text-right font-bold text-navy">{60 + ((selectedPatient?.id || 1) * 13) % 120}s</div>
                                  </div>
                                )}
                                {selectedPatient && selectedPatient.previousSeizures > 2 && (
                                  <div className="grid grid-cols-[1fr_1.5fr_1fr] font-medium text-slate-600 py-2">
                                    <div>{`${((selectedPatient?.id || 1) * 37) % 180 + 90} days ago`}</div><div>Focal</div><div className="text-right font-bold text-navy">{20 + ((selectedPatient?.id || 1) * 7) % 60}s</div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 print-card p-5">
                          <h4 className="font-bold text-navy text-sm uppercase tracking-wide mb-1 flex justify-between items-center">
                            EEG Trace Overview
                            <span className="text-slate-300 font-serif text-lg leading-none mb-1 cursor-pointer">···</span>
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium mb-4">Signal decomposition highlighting recent abnormal activity.</p>
                          <div className="space-y-4">
                            <div className="h-12 w-full flex items-center gap-3">
                              <div className="w-16 sm:w-20 leading-tight">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Spikes</span>
                                <span className="block text-[8px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">High Freq</span>
                              </div>
                              <div className="flex-1 h-full opacity-60 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <ReLineChart data={dynamicSignalData.slice(0, 100)}>
                                    <Line type="monotone" dataKey="imf1" stroke="#94a3b8" strokeWidth={1} dot={false} isAnimationActive={false} />
                                  </ReLineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            <div className="h-12 w-full flex items-center gap-3">
                              <div className="w-16 sm:w-20 leading-tight">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Raw EEG</span>
                                <span className="block text-[8px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">Original</span>
                              </div>
                              <div className="flex-1 h-full opacity-80 relative">
                                <div className="absolute inset-y-0 left-1/3 w-[30%] bg-rose-100/40 border-x border-rose-300/30"></div>
                                <ResponsiveContainer width="100%" height="100%">
                                  <ReLineChart data={dynamicSignalData.slice(20, 120)}>
                                    <Line type="monotone" dataKey="original" stroke="#64748b" strokeWidth={1.2} dot={false} isAnimationActive={false} />
                                  </ReLineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            <div className="h-12 w-full flex items-center gap-3">
                              <div className="w-16 sm:w-20 leading-tight">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Baseline</span>
                                <span className="block text-[8px] font-medium text-slate-400 mt-0.5 whitespace-nowrap">Low Freq</span>
                              </div>
                              <div className="flex-1 h-full opacity-60 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <ReLineChart data={dynamicSignalData.slice(40, 140)}>
                                    <Line type="monotone" dataKey="imf2" stroke="#94a3b8" strokeWidth={1} dot={false} isAnimationActive={false} />
                                  </ReLineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
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
                  <div className="mt-6 print:mt-0 animate-in fade-in zoom-in-95 duration-300">
                    <div className="print-card bg-white shadow-2xl min-h-[1056px] print:min-h-0 text-slate-800 mx-auto max-w-4xl relative flex flex-col font-serif border-l-[16px] border-black p-12 pr-16 print:p-6 print:pr-8">

                      {/* Header */}
                      <div className="flex justify-between items-start border-b-[1.5px] border-black pb-8 mb-12 print:pb-4 print:mb-4">
                        <div className="pt-2">
                          <h1 className="text-4xl tracking-[0.2em] text-black mb-3">DR NEURO AI</h1>
                          <p className="text-[10px] font-bold tracking-[0.35em] text-slate-600 uppercase">Consultant Neural Medicine</p>
                        </div>
                        <div>
                          <Stethoscope className="w-16 h-16 text-black" strokeWidth={1} />
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-right text-sm text-slate-800 mb-12 print:mb-6">
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>

                      {/* Patient Address Block */}
                      <div className="text-sm text-slate-800 leading-relaxed mb-10 print:mb-6">
                        <p className="font-bold">{selectedPatient?.name ?? "Aarav Menon"}</p>
                        <p>Patient ID: {selectedPatient?.externalId ?? "NX-01001"}</p>
                        <p>Age {selectedPatient?.age ?? 28} | Routine EEG Study</p>
                      </div>

                      <div className="text-sm text-slate-800 mb-6 print:mb-4">
                        Dear {selectedPatient?.name?.split(' ')[0] ?? "Patient"},
                      </div>

                      {/* Body text with Layman explanations */}
                      <div className="text-sm text-slate-700 space-y-6 print:space-y-3 leading-relaxed flex-1">
                        <p>
                          We have completed the automated analysis of your recent brainwave (EEG) recording. This letter summarizes the findings from the NeuroExplain AI system to help you and your neurologist understand the results.
                        </p>

                        <div>
                          <strong>What did the AI find?</strong><br />
                          The AI is highly confident that {selectedAnalysis.prediction === "Seizure" ? "there are clear signs of an active seizure pattern." : "there are no signs of an active seizure pattern right now."} We looked closely at all areas of your brain, and the most significant activity was found in {selectedAnalysis.affectedChannels.length > 0 ? selectedAnalysis.affectedChannels.join(", ") : "the frontal and temporal regions"}.
                          {selectedAnalysis.affectedChannels.length > 0 && (
                            <span className="block mt-2 text-slate-600 border-l-2 border-dusty-blue/30 pl-3">
                              <em>Note on brain regions:</em> These codes refer to standard electrode placements on your scalp. Specifically:
                              <ul className="list-disc pl-5 mt-1 space-y-1">
                                {selectedAnalysis.affectedChannels.map(ch => (
                                  <li key={ch}><strong>{ch}</strong> measures the {channelExplanations[ch] || "specific localized region of your brain"}.</li>
                                ))}
                              </ul>
                            </span>
                          )}
                        </div>

                        <p>
                          <strong>Key Measurements:</strong><br />
                          {selectedAnalysis.prediction === "Seizure" ? (
                            <>Your brain waves were firing at an elevated speed of {selectedAnalysis.featureVector.spikeRate?.toFixed(2) ?? 0} spikes per second. A normal brain fires relatively slowly; this high spike rate indicates electrical irritation. Additionally, your asymmetry score is {selectedAnalysis.featureVector.asymmetryIndex?.toFixed(2) ?? 0}, indicating that one side of your brain is significantly overactive compared to the other.</>
                          ) : (
                            <>Your brain waves were firing at a speed of {selectedAnalysis.featureVector.spikeRate?.toFixed(2) ?? 0} spikes per second, which is within the healthy resting range. Additionally, your asymmetry score is {selectedAnalysis.featureVector.asymmetryIndex?.toFixed(2) ?? 0}. This low score confirms that both the left and right sides of your brain are working together smoothly and symmetrically.</>
                          )}
                        </p>

                        <p>
                          <strong>Next Steps & Recommendations:</strong><br />
                          {selectedAnalysis.prediction === "Seizure" ? "The AI strongly detected seizure activity during this test." : "The AI did not detect any active seizures during this recording session."} Please note that this AI tool is here to assist your doctor, not replace them. A human neurologist must review this data to confirm the findings. Please continue your currently prescribed care plan, and ensure you attend your next scheduled follow-up appointment. All of this electrical data has been safely saved so your doctor can review it.
                        </p>
                      </div>

                      {/* Physician Notes (Editable) */}
                      <div className="mt-8 mb-12 print:mt-4 print:mb-4">
                        <textarea
                          id="doctor-note"
                          value={doctorNote}
                          onChange={(event) => setDoctorNote(event.target.value)}
                          placeholder="Additional physician notes..."
                          className="w-full h-24 print:h-16 border border-slate-200 bg-slate-50/50 p-4 text-sm font-sans text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none"
                        />
                      </div>

                      {/* Sign-off */}
                      <div className="mb-16 print:hidden">
                        <p className="text-sm text-slate-800 mb-6 print:mb-2">Sincerely,</p>
                        <div className="font-serif italic text-4xl text-black mb-2 font-light">Dr. Neuro AI</div>
                        <p className="text-sm font-bold text-black">Dr. Neuro AI</p>
                        <p className="text-sm text-slate-600">Consultant Neural Medicine</p>
                      </div>

                      {/* Footer */}
                      <div className="border-t-[1.5px] border-black pt-6 print:hidden mt-auto flex justify-between items-center text-xs font-sans text-slate-600">
                        <div className="flex items-center gap-3">
                          <Hospital className="w-4 h-4 text-black" />
                          <div>
                            <p>00 0000 0000</p>
                            <p>0400 000 000</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-black" />
                          <div>
                            <p>PO Box 0000</p>
                            <p>City, State, Post Code</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-black" />
                          <div>
                            <p>www.neuroexplain.local</p>
                            <p>consult@neuroexplain.local</p>
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

                      <div className="p-4 border-t border-slate-100 bg-cream-dark flex flex-col">
                        <div className="flex gap-2.5 overflow-x-auto pb-3 mb-1 custom-scrollbar w-full">
                          {[
                            "Is the patient safe?",
                            "Where is the seizure happening?",
                            "What is sample entropy?",
                            "Explain EMD to me."
                          ].map(q => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setChatInput(q)}
                              className="whitespace-nowrap rounded-full border border-slate-200/80 bg-white px-5 py-2 text-xs font-medium text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800 hover:shadow"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
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
