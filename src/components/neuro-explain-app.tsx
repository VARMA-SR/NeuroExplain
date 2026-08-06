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
  Bot,
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
  Low: { color: "#22c55e", className: "bg-emerald-400/15 text-emerald-200 border-emerald-300/25", glow: "shadow-emerald-500/20" },
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
  { label: "Research", href: "#research" },
];

const dashboardModules = [
  { label: "Patients", icon: Users, href: "#patients" },
  { label: "EEG Upload", icon: UploadCloud, href: "#upload" },
  { label: "AI Analysis", icon: Brain, href: "#analysis" },
  { label: "Risk", icon: Gauge, href: "#risk" },
  { label: "History", icon: History, href: "#history" },
  { label: "Reports", icon: FileText, href: "#reports" },
  { label: "Settings", icon: Settings, href: "#settings" },
  { label: "Help", icon: HelpCircle, href: "#help" },
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
  { title: "Upload EEG", icon: UploadCloud, detail: "EDF, CSV, MAT, TXT" },
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
      <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-200/80">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">{text}</p>
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/10">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
        <Sparkles className="h-4 w-4 text-purple-200/70" />
      </div>
      <p className="mt-5 text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
    </div>
  );
}

function MetricMeter({ label, value, color = "#06b6d4" }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
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

function NeuralBackground({ frameValue, scaleVal, xVal, yVal }: { frameValue: MotionValue<number>; scaleVal: MotionValue<number>; xVal: MotionValue<string>; yVal: MotionValue<string>; }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const lastDrawnFrameRef = useRef(-1);
  const totalFrames = 300;

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cap DPR at 1.25 to prevent fill-rate bottlenecks on high DPI / 4K displays
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scaledWidth = Math.round(width * dpr);
    const scaledHeight = Math.round(height * dpr);

    if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;
    }
  };

  // Preload queue manager with 3 concurrent streams and coarse-to-fine prioritization
  useEffect(() => {
    const images: HTMLImageElement[] = [];
    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      images.push(img);
    }
    imagesRef.current = images;

    // Load keyframes (every 6th frame) first to give initial scrolling coverage quickly, then fill details
    const loadQueue: number[] = [];
    for (let i = 1; i <= totalFrames; i += 6) {
      loadQueue.push(i);
    }
    for (let i = 1; i <= totalFrames; i++) {
      if ((i - 1) % 6 !== 0) {
        loadQueue.push(i);
      }
    }

    let queueIndex = 0;
    const maxConcurrency = 8;
    let activeConnections = 0;

    const startNextLoad = () => {
      if (queueIndex >= loadQueue.length) return;

      const frameNum = loadQueue[queueIndex];
      queueIndex++;
      activeConnections++;

      const img = images[frameNum - 1];
      const numStr = String(frameNum).padStart(3, "0");

      img.onload = img.onerror = () => {
        activeConnections--;

        // Redraw current scroll position frame to update the canvas with the newly loaded image
        drawFrame(frameValue.get(), true);

        startNextLoad();
      };

      img.src = `/frames.jpg/ezgif-frame-${numStr}.jpg`;
    };

    // Spin up concurrent load pipelines
    for (let i = 0; i < maxConcurrency; i++) {
      startNextLoad();
    }

    resizeCanvas();

    const handleResize = () => {
      resizeCanvas();
      // Force draw frame with new canvas bounds
      lastDrawnFrameRef.current = -1; drawFrame(Math.floor(frameValue.get()));
    };

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Utility to find closest loaded frame image outwards from target (avoids blank flicker)
  const getNearestLoadedImage = (index: number): HTMLImageElement | null => {
    const images = imagesRef.current;
    if (images.length === 0) return null;

    if (images[index]?.complete && images[index]?.naturalWidth > 0) {
      return images[index];
    }

    const maxSearch = Math.min(15, images.length);
    for (let step = 1; step <= maxSearch; step++) {
      const prev = index - step;
      if (prev >= 0 && images[prev]?.complete && images[prev]?.naturalWidth > 0) {
        return images[prev];
      }
      const next = index + step;
      if (next < images.length && images[next]?.complete && images[next]?.naturalWidth > 0) {
        return images[next];
      }
    }

    return images[0]?.complete ? images[0] : null;
  };

  // Draw the given frame to the canvas using a high quality center-cover scaling with fractional alpha blending
  const drawFrame = (currentFrameValue: number, force = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!force && currentFrameValue === lastDrawnFrameRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    lastDrawnFrameRef.current = currentFrameValue;

    // Quality optimization: use high quality smoothing configuration
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "low"; // Reduced to prevent fill-rate bottlenecks on high DPI during blend

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const baseFrame = Math.floor(currentFrameValue);
    const nextFrame = Math.min(baseFrame + 1, totalFrames - 1);
    const alpha = currentFrameValue - baseFrame;

    const img1 = getNearestLoadedImage(baseFrame);
    const img2 = getNearestLoadedImage(nextFrame);

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const drawSingleImage = (img: HTMLImageElement, globalAlpha: number) => {
      const imgWidth = img.width;
      const imgHeight = img.height;
      const imgRatio = imgWidth / imgHeight;
      const canvasRatio = canvasWidth / canvasHeight;

      let drawWidth = canvasWidth;
      let drawHeight = canvasHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (imgRatio > canvasRatio) {
        drawWidth = canvasHeight * imgRatio;
        offsetX = (canvasWidth - drawWidth) / 2;
      } else {
        drawHeight = canvasWidth / imgRatio;
        offsetY = (canvasHeight - drawHeight) / 2;
      }

      ctx.globalAlpha = globalAlpha;
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };

    if (img1 && alpha <= 0.12) {
      drawSingleImage(img1, 1);
    } else if (img2 && alpha >= 0.88) {
      drawSingleImage(img2, 1);
    } else {
      if (img1) drawSingleImage(img1, 1);
      if (img2 && img2 !== img1) drawSingleImage(img2, alpha);
    }
  };


  const rafRef = useRef<number | null>(null);

  useMotionValueEvent(frameValue, "change", () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      drawFrame(frameValue.get());
      rafRef.current = null;
    });
  });

  useEffect(() => {
    drawFrame(0);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);


  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050816]">
      <div className="neural-grid absolute inset-0 opacity-20 z-10" />
      <motion.div style={{ scale: scaleVal, x: xVal, y: yVal, width: '100%', height: '100%' }} className="origin-center will-change-transform">
        <canvas
          ref={canvasRef}
          className="w-full h-full opacity-[0.42]"
          style={{ transform: "translateZ(0)" }}
        />
      </motion.div>
    </div>
  );
}

function RiskGauge({ riskScore, riskLevel }: { riskScore: number; riskLevel: RiskLevel }) {
  const color = riskMeta[riskLevel].color;
  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className="relative grid h-44 w-44 place-items-center rounded-full shadow-2xl"
        style={{ background: `conic-gradient(${color} ${riskScore * 3.6}deg, rgba(255,255,255,0.09) 0deg)` }}
      >
        <div className="grid h-32 w-32 place-items-center rounded-full border border-white/10 bg-[#091026] text-center">
          <div>
            <p className="text-4xl font-semibold text-white">{riskScore}</p>
            <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Risk</p>
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
    { label: "TN", value: 94, className: "bg-emerald-400/20 text-emerald-100" },
    { label: "FP", value: 6, className: "bg-amber-400/20 text-amber-100" },
    { label: "FN", value: 4, className: "bg-orange-400/20 text-orange-100" },
    { label: "TP", value: 96, className: "bg-cyan-400/20 text-cyan-100" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {cells.map((cell) => (
        <div key={cell.label} className={cx("rounded-2xl border border-white/10 p-4 text-center", cell.className)}>
          <p className="text-xs text-slate-300">{cell.label}</p>
          <p className="mt-1 text-2xl font-semibold">{cell.value}</p>
        </div>
      ))}
    </div>
  );
}

export function NeuroExplainApp() {
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);

  const { scrollYProgress } = useScroll();

  // Non-linear mapping to "slow down" at nodes
  // Node 1: 0.1 (Intro), Node 2: 0.35 (Features), Node 3: 0.6 (Workflow), Node 4: 0.85 (Dashboard)
  const smoothProgress = useSpring(scrollYProgress, { damping: 45, stiffness: 220, mass: 0.2, restDelta: 0.001 });

  const frameValue = useTransform(smoothProgress, [0, 0.13, 0.17, 0.35, 0.4, 0.6, 0.65, 0.85, 0.9, 1], [0, 30, 45, 90, 110, 170, 190, 260, 280, 299]);

  const cameraScale = useTransform(frameValue,
    [0, 15, 30, 60, 90, 130, 170, 210, 260, 285],
    [1, 1.0, 1.25, 1.0, 1.4, 1.0, 1.3, 1.0, 1.15, 1.15]
  );
  const cameraX = useTransform(frameValue,
    [0, 15, 30, 60, 90, 130, 170, 210, 260, 285],
    ["0%", "0%", "6%", "0%", "-10%", "0%", "8%", "0%", "0%", "0%"]
  );
  const cameraY = useTransform(frameValue,
    [0, 15, 30, 60, 90, 130, 170, 210, 260, 285],
    ["0%", "0%", "10%", "0%", "-5%", "0%", "-8%", "0%", "0%", "0%"]
  );

  const introOpacity = useTransform(frameValue, [0, 25, 45], [1, 1, 0]);
  const introY = useTransform(frameValue, [0, 25, 45], [0, 0, -50]);

  const featuresOpacity = useTransform(frameValue, [50, 80, 100, 130], [0, 1, 1, 0]);
  const featuresY = useTransform(frameValue, [50, 80, 100, 130], [40, 0, 0, -40]);

  const workflowOpacity = useTransform(frameValue, [140, 160, 180, 210], [0, 1, 1, 0]);
  const workflowY = useTransform(frameValue, [140, 160, 180, 210], [40, 0, 0, -40]);

  const dashboardOpacity = useTransform(frameValue, [230, 250, 260, 299], [0, 1, 1, 1]);
  const dashboardY = useTransform(frameValue, [230, 250, 260, 299], [100, 0, 0, -450]);

  const dashboardPointerEvents = useTransform(frameValue, (v) => v > 230 ? "auto" : "none");
  const introPointerEvents = useTransform(frameValue, (v) => v < 45 ? "auto" : "none");
  const featuresPointerEvents = useTransform(frameValue, (v) => v > 50 && v < 130 ? "auto" : "none");
  const workflowPointerEvents = useTransform(frameValue, (v) => v > 140 && v < 210 ? "auto" : "none");

  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<Role>("doctor");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(fallbackSummary.patients[0]?.id ?? 1);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [doctorNote, setDoctorNote] = useState("Patient remained stable during acquisition. Please correlate with clinical history.");
  const [filterRisk, setFilterRisk] = useState<RiskLevel | "All">("All");
  const [activeModule, setActiveModule] = useState("#patients");

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
    const progressMap: Record<string, number> = {
      "#about": 0,
      "#home": 0,
      "#features": 0.35,
      "#workflow": 0.6,
      "#dashboard": 0.85,
      "#research": 1.0,
    };

    const targetProgress = progressMap[href];
    if (targetProgress !== undefined) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: maxScroll * targetProgress, behavior: "smooth" });
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

  const eegSeries = useMemo(() => createSyntheticEegSeries(selectedPatient?.id ?? 7), [selectedPatient?.id]);

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
      id: Date.now(),
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
    const canReadText = /\.(csv|txt)$/i.test(file.name) || file.type.startsWith("text/");
    if (canReadText) {
      try {
        signalText = (await file.text()).slice(0, 25000);
      } catch {
        signalText = "";
      }
    }

    setUploadedFile({ name: file.name, type: extension, size: file.size, signalText });
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
    <main className="relative h-[850vh]"><div className="fixed inset-0 overflow-hidden">
      <NeuralBackground frameValue={frameValue} scaleVal={cameraScale} xVal={cameraX} yVal={cameraY} />

      <header className="no-print fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050816]/70 backdrop-blur-2xl">
        <nav className="mx-auto flex w-full items-center justify-between px-4 py-2.5 sm:px-6 lg:px-12" aria-label="Primary navigation">
          <a href="#home" onClick={(e) => handleNavClick(e, "#home")} className="group flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_28px_rgba(6,182,212,0.25)]">
              <Brain className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight text-white mb-0.5">
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
                { label: 'About', icon: <><HelpCircle /><span className="text-[10px] font-medium leading-none tracking-wide text-slate-300">About</span></>, onClick: () => handleNavClick({ preventDefault: () => { } } as any, '#home') },
                { label: 'Features', icon: <><Sparkles /><span className="text-[10px] font-medium leading-none tracking-wide text-slate-300">Features</span></>, onClick: () => handleNavClick({ preventDefault: () => { } } as any, '#features') },
                { label: 'Workflow', icon: <><Workflow /><span className="text-[10px] font-medium leading-none tracking-wide text-slate-300">Workflow</span></>, onClick: () => handleNavClick({ preventDefault: () => { } } as any, '#workflow') },
                { label: 'Dashboard', icon: <><Activity /><span className="text-[10px] font-medium leading-none tracking-wide text-slate-300">Dashboard</span></>, onClick: () => handleNavClick({ preventDefault: () => { } } as any, '#dashboard') },
                { label: 'Research', icon: <><Microscope /><span className="text-[10px] font-medium leading-none tracking-wide text-slate-300">Research</span></>, onClick: () => alert('Research Mode configuration') },
              ]}
              baseItemSize={44}
              magnification={56}
            />
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <StatusPill className="border-emerald-300/20 bg-emerald-400/10 text-emerald-200">
              <HardDrive className="h-3.5 w-3.5" /> Offline Ready
            </StatusPill>
            {currentUser ? (
              <button
                onClick={handleLogout}
                className="rounded-full bg-white/10 px-4.5 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                Log out ({currentUser.name})
              </button>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="rounded-full bg-white px-4.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100"
              >
                Login
              </button>
            )}
          </div>

          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-white lg:hidden"
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
              className="border-t border-white/10 bg-[#050816]/95 px-4 py-4 lg:hidden"
            >
              <div className="mx-auto grid max-w-7xl gap-2">
                {navItems.map((item) => (
                  <a key={item.href} href={item.href} onClick={(e) => handleNavClick(e, item.href)} className="rounded-2xl px-4 py-3 text-sm text-slate-200 hover:bg-white/10">
                    {item.label}
                  </a>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </header>

      <motion.section id="home" style={{ opacity: introOpacity, y: introY, pointerEvents: introPointerEvents as any, willChange: "transform, opacity" }} className="absolute inset-0 z-10 mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pt-40 flex flex-col justify-center">
        <div className="grid items-center gap-12 lg:grid-cols-[1.03fr_0.97fr]">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <h1 className="mt-0 max-w-5xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl lg:text-[5.5rem] drop-shadow-2xl">
              <span className="text-white drop-shadow-[0_2px_20px_rgba(255,255,255,0.1)]">Explainable offline EEG</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-white to-slate-400">seizure intelligence.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400 sm:text-xl md:leading-relaxed">
              NeuroExplain detects epileptic seizure probability, estimates longitudinal risk, visualizes EEG patterns, and explains every prediction with clinician-friendly evidence.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a href="#dashboard" onClick={(e) => handleNavClick(e, "#dashboard")} className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-8 py-3.5 text-sm font-bold text-slate-950 shadow-xl transition-all hover:scale-[1.03] hover:bg-slate-100 hover:shadow-2xl">
                <span className="relative flex items-center gap-2">Launch AI dashboard <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </a>
              <a href="#workflow" onClick={(e) => handleNavClick(e, "#workflow")} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-transparent px-8 py-3.5 text-sm font-semibold text-slate-300 shadow-sm backdrop-blur-md transition hover:border-white/20 hover:bg-white/5 hover:text-white">
                View clinical workflow
              </a>
            </div>
            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {researchMetrics.map((metric) => (
                <div key={metric.label} className="group rounded-2xl border border-white/5 bg-[#0a0f1e]/80 p-5 backdrop-blur-lg transition hover:bg-[#0d1428]/90 hover:border-white/10">
                  <p className="text-3xl font-bold tracking-tight text-white">{metric.value}</p>
                  <p className="mt-1.5 text-sm font-medium text-slate-300">{metric.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }} className="relative">
            <div className="float-slow glow-border rounded-[2.5rem]">
              <div className="glass-panel scanline overflow-hidden rounded-[2.5rem] p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">Live offline inference</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">AI Neurology Console</h2>
                  </div>
                  <StatusPill className="border-emerald-300/20 bg-emerald-300/10 text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Encrypted local
                  </StatusPill>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-[#0b122c]/80 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Prediction</span>
                      <Activity className="h-5 w-5 text-cyan-200" />
                    </div>
                    <p className="mt-4 text-4xl font-semibold text-white">{selectedAnalysis.prediction}</p>
                    <MetricMeter label="Seizure probability" value={selectedAnalysis.seizureProbability} color="#06b6d4" />
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-[#0b122c]/80 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Risk Level</span>
                      <Gauge className="h-5 w-5 text-violet-200" />
                    </div>
                    <p className="mt-4 text-4xl font-semibold text-white">{selectedAnalysis.riskScore}</p>
                    <MetricMeter label={selectedAnalysis.riskLevel} value={selectedAnalysis.riskScore} color={riskMeta[selectedAnalysis.riskLevel].color} />
                  </div>
                </div>
                <div className="mt-5 h-56 rounded-3xl border border-white/10 bg-white/[0.035] p-3">
                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <AreaChart data={eegSeries.slice(0, 90)} margin={{ left: -18, right: 8, top: 12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="heroTemporal" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="time" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="temporal" stroke="#06B6D4" fill="url(#heroTemporal)" strokeWidth={2} />
                      <Line type="monotone" dataKey="frontal" stroke="#7C3AED" dot={false} strokeWidth={1.8} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-50">
                  “{selectedAnalysis.explanation.summary}”
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section id="features" style={{ opacity: featuresOpacity, y: featuresY, pointerEvents: featuresPointerEvents as any, willChange: "transform, opacity" }} className="absolute inset-0 z-10 mx-auto max-w-7xl px-4 pt-40 sm:px-6 lg:px-8 flex flex-col justify-center">
        <SectionHeading
          eyebrow="Platform capabilities"
          title="Built like a premium medical AI operating system."
          text="A modular workflow for patients, EEG uploads, preprocessing, inference, risk, recommendations, reports, search, settings, assistant features, and research mode."
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((feature) => (
            <GlassCard key={feature.title} className="group h-full transition hover:-translate-y-1 hover:border-cyan-300/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-cyan-400/10 text-cyan-100">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{feature.text}</p>
            </GlassCard>
          ))}
        </div>
      </motion.section>

      <motion.section id="workflow" style={{ opacity: workflowOpacity, y: workflowY, pointerEvents: workflowPointerEvents as any, willChange: "transform, opacity" }} className="absolute inset-0 z-10 mx-auto max-w-7xl px-4 pt-40 sm:px-6 lg:px-8 flex flex-col justify-center">
        <SectionHeading
          eyebrow="End-to-end workflow"
          title="From EEG upload to explainable report in one offline loop."
          text="The complete pipeline mirrors a real clinical decision support product while remaining lightweight enough for local demonstrations."
        />
        <GlassCard className="overflow-hidden">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            {workflowSteps.map((step, index) => (
              <div key={step.title} className="relative rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-slate-500">0{index + 1}</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{step.detail}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.section>

      <motion.section id="dashboard" style={{ opacity: dashboardOpacity, y: dashboardY, pointerEvents: dashboardPointerEvents as any, willChange: "transform, opacity" }} className="absolute inset-0 z-10 mx-auto max-w-[92rem] px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Dashboard preview"
          title="Clinical-grade offline command center."
          text="Search patients, upload EEG data, run inference, review explainability, track risk trends, generate reports, and manage local settings."
        />

        <div className="glass-panel overflow-hidden rounded-[2.4rem] border-white/15">
          <div className="grid lg:grid-cols-[17rem_1fr]">
            <aside className="no-print border-b border-white/10 bg-white/[0.035] p-4 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white">
                  <Brain className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-white">NeuroOS</p>
                  <p className="text-xs text-slate-400">v1.0 offline</p>
                </div>
              </div>
              <div className="mt-4">
                <LineSidebar
                  items={dashboardModules}
                  defaultActive={Math.max(0, dashboardModules.findIndex(m => m.href === activeModule))}
                  onItemClick={(_index, item) => setActiveModule(item.href)}
                  accentColor="#06b6d4"
                  itemGap={32}
                  className="mb-4"
                />
              </div>
              <div className="mt-6 rounded-3xl border border-emerald-300/15 bg-emerald-300/10 p-4">
                <ShieldCheck className="h-6 w-6 text-emerald-200" />
                <p className="mt-3 text-sm font-semibold text-white">Security posture</p>
                <p className="mt-1 text-xs leading-5 text-emerald-100/75">Local authentication, role access, audit logs, input validation, encrypted-backup ready.</p>
              </div>
            </aside>

            <div className="min-w-0 p-4 sm:p-6 lg:p-7">
              <div className="no-print mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.055] px-4 py-3">
                  <Search className="h-5 w-5 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search patients, reports, predictions, doctors..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                    <RefreshCw className={cx("h-3.5 w-3.5", isLoading && "animate-spin")} /> {isLoading ? "Syncing local DB" : "Local DB synced"}
                  </StatusPill>
                  <button type="button" className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10 text-slate-200">
                    <Bell className="h-5 w-5" />
                  </button>
                  <a href="#login" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white">
                    <LogIn className="h-4 w-4" /> {role}
                  </a>
                </div>
              </div>

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
                        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">Patient management</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Records, history, medication</h3>
                      </div>
                      <StatusPill className="border-white/10 bg-white/10 text-slate-200">
                        <UserPlus className="h-3.5 w-3.5" /> Create patient
                      </StatusPill>
                    </div>

                    <form onSubmit={handleSubmit(onCreatePatient)} className="mt-5 grid gap-3 md:grid-cols-2">
                      <input {...register("name", { required: true })} placeholder="Patient name" className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                      <input {...register("age", { required: true, valueAsNumber: true })} type="number" min={0} max={120} placeholder="Age" className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                      <select {...register("sex")} className="rounded-2xl border border-white/10 bg-[#10172f] px-4 py-3 text-sm text-white outline-none">
                        <option>Female</option>
                        <option>Male</option>
                        <option>Other</option>
                        <option>Not specified</option>
                      </select>
                      <input {...register("previousSeizures", { valueAsNumber: true })} type="number" min={0} placeholder="Past seizures" className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500" />
                      <input {...register("diagnosis", { required: true })} placeholder="Diagnosis / reason" className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 md:col-span-2" />
                      <input {...register("medication")} placeholder="Medication" className="rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 md:col-span-2" />
                      <textarea {...register("notes")} placeholder="Clinical notes" className="min-h-20 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 md:col-span-2" />
                      <button type="submit" disabled={formState.isSubmitting} className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:opacity-60 md:col-span-2">
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
                            filterRisk === risk ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/10",
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
                              selectedPatient?.id === patient.id ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-white/[0.045] hover:bg-white/[0.075]",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-white">{patient.name}</p>
                                <p className="mt-1 text-xs text-slate-400">{patient.externalId} · {patient.age} yrs · {patient.sex}</p>
                              </div>
                              <RiskBadge risk={patientAnalysis.riskLevel} />
                            </div>
                            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">{patient.diagnosis}</p>
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                              <span className="rounded-full bg-white/10 px-2.5 py-1"><PillIcon className="mr-1 inline h-3 w-3" />{patient.medication}</span>
                              <span className="rounded-full bg-white/10 px-2.5 py-1">Past seizures: {patient.previousSeizures}</span>
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
                        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">EEG data module</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Upload, preview, preprocess</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Supports EDF, CSV, MAT, and TXT workflows. Text signals are parsed locally; binary formats are accepted for metadata and simulated offline inference.</p>
                      </div>
                      <StatusPill className="border-blue-300/20 bg-blue-400/10 text-blue-100">
                        <Radio className="h-3.5 w-3.5" /> 256 Hz
                      </StatusPill>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                      <label className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-cyan-300/30 bg-cyan-300/10 p-6 text-center transition hover:bg-cyan-300/15">
                        <UploadCloud className="h-10 w-10 text-cyan-100" />
                        <span className="mt-4 text-sm font-semibold text-white">Drop or choose EEG file</span>
                        <span className="mt-1 text-xs text-slate-400">EDF · CSV · MAT · TXT</span>
                        <input type="file" accept=".edf,.csv,.mat,.txt,text/plain" className="sr-only" onChange={onFileChange} />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ["File", uploadedFile?.name || selectedAnalysis.fileName],
                          ["Type", uploadedFile?.type || "CSV"],
                          ["Duration", `${selectedAnalysis.processingTimeMs > 0 ? selectedAnalysis.processingTimeMs : 820} ms processing`],
                          ["Amplitude", `${selectedAnalysis.featureVector.amplitudeBurst?.toFixed?.(1) ?? selectedAnalysis.riskScore} µV`],
                          ["Channels", selectedAnalysis.affectedChannels.join(", ")],
                          ["Artifact status", "Blink/muscle scan complete"],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                            <p className="text-xs text-slate-500">{label}</p>
                            <p className="mt-1 truncate text-sm font-medium text-white">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 h-72 rounded-3xl border border-white/10 bg-[#071028]/80 p-3">
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <AreaChart data={eegSeries} margin={{ left: -20, right: 8, top: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="temporal" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Area type="monotone" dataKey="temporal" name="Temporal" stroke="#06B6D4" fill="url(#temporal)" strokeWidth={2} />
                          <Line type="monotone" dataKey="frontal" name="Frontal" stroke="#7C3AED" dot={false} strokeWidth={1.6} />
                          <Line type="monotone" dataKey="occipital" name="Occipital" stroke="#60A5FA" dot={false} strokeWidth={1.4} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={runAnalysis}
                        disabled={analysisStatus === "running"}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {analysisStatus === "running" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                        {analysisStatus === "running" ? "Running local model..." : "Run offline AI analysis"}
                      </button>
                      <button type="button" onClick={() => setUploadedFile(null)} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">
                        Clear upload
                      </button>
                    </div>
                  </GlassCard>
                </div>
              )}
              {activeModule === "#analysis" && (
                <div className="mt-6 grid gap-5 xl:grid-cols-2 animate-in fade-in zoom-in-95 duration-300">
                  <div className="xl:col-span-2">
                    <GlassCard id="analysis" className="print-card">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm uppercase tracking-[0.24em] text-violet-200/80">AI analysis</p>
                          <h3 className="mt-2 text-2xl font-semibold text-white">Prediction overview</h3>
                          <p className="mt-2 text-sm leading-6 text-slate-300">Latest scan for {selectedPatient?.name ?? "selected patient"}</p>
                        </div>
                        <StatusPill className={cx(selectedAnalysis.prediction === "Seizure" ? "border-rose-300/25 bg-rose-400/15 text-rose-100" : "border-emerald-300/25 bg-emerald-400/15 text-emerald-100")}>
                          {selectedAnalysis.prediction === "Seizure" ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {selectedAnalysis.prediction}
                        </StatusPill>
                      </div>

                      <div className="mt-6 grid gap-5 md:grid-cols-[0.86fr_1.14fr] xl:grid-cols-1 2xl:grid-cols-[0.86fr_1.14fr]">
                        <RiskGauge riskScore={selectedAnalysis.riskScore} riskLevel={selectedAnalysis.riskLevel} />
                        <div className="space-y-5">
                          <MetricMeter label="Seizure probability" value={selectedAnalysis.seizureProbability} color="#06b6d4" />
                          <MetricMeter label="Model confidence" value={selectedAnalysis.confidence} color="#7c3aed" />
                          <MetricMeter label="Affected-channel intensity" value={selectedAnalysis.explanation.saliency[0]?.intensity ?? 62} color="#2563eb" />
                          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Natural language explanation</p>
                            <p className="mt-2 text-sm leading-6 text-slate-200">{selectedAnalysis.explanation.summary}</p>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                  <GlassCard className="print-card">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">Explainable AI</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">SHAP · LIME · saliency</h3>
                      </div>
                      <StatusPill className="border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                        <WandSparkles className="h-3.5 w-3.5" /> Transparent model
                      </StatusPill>
                    </div>
                    <div className="mt-5 h-72 rounded-3xl border border-white/10 bg-[#071028]/80 p-3">
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <BarChart data={featureImportance} layout="vertical" margin={{ left: 12, right: 18, top: 10, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                          <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="feature" width={118} stroke="#94a3b8" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Bar dataKey="value" radius={[0, 10, 10, 0]} fill="#06B6D4" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {selectedAnalysis.explanation.shap.slice(0, 4).map((item) => (
                        <div key={item.feature} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                          <p className="text-sm font-medium text-white">{item.feature}</p>
                          <p className="mt-1 text-xs text-slate-400">SHAP contribution {item.contribution}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                  <GlassCard className="print-card">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-violet-200/80">Visual explanation</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Channel heatmap and bands</h3>
                      </div>
                      <Eye className="h-6 w-6 text-violet-200" />
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="h-72 rounded-3xl border border-white/10 bg-[#071028]/80 p-3">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                          <RadarChart data={radarData} outerRadius={88}>
                            <PolarGrid stroke="rgba(255,255,255,0.12)" />
                            <PolarAngleAxis dataKey="metric" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                            <Radar dataKey="value" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.35} />
                            <Tooltip contentStyle={tooltipStyle} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        {selectedAnalysis.explanation.saliency.map((channel) => (
                          <div key={channel.channel} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                            <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                              <span>{channel.channel}</span>
                              <span>{channel.intensity}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/10">
                              <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400" style={{ width: `${channel.intensity}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </GlassCard>
                </div>
              )}
              {activeModule === "#risk" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                  <GlassCard id="risk" className="print-card">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-violet-200/80">Risk assessment</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Trend analysis and clinical factors</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-300">Risk combines previous seizures, EEG patterns, frequency, duration, medication context, age, and longitudinal trend.</p>
                      </div>
                      <StatusPill className="border-violet-300/20 bg-violet-400/10 text-violet-100">
                        <LineChartIcon className="h-3.5 w-3.5" /> Daily · Weekly · Monthly
                      </StatusPill>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                      <div className="h-72 rounded-3xl border border-white/10 bg-[#071028]/80 p-3">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                          <ReLineChart data={trendData.length ? trendData : [{ session: "S1", risk: 24, probability: 18, confidence: 92 }]} margin={{ left: -16, right: 8, top: 10, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                            <XAxis dataKey="session" stroke="#64748b" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Line type="monotone" dataKey="risk" stroke="#7C3AED" strokeWidth={2.2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="probability" stroke="#06B6D4" strokeWidth={2.2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="confidence" stroke="#60A5FA" strokeWidth={1.6} dot={false} />
                          </ReLineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="h-72 rounded-3xl border border-white/10 bg-[#071028]/80 p-3">
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
                        <div key={String(label)} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
                          <p className="text-xs text-slate-500">{label as string}</p>
                          <p className="mt-2 text-xl font-semibold text-white">{String(value)}</p>
                          <p className="mt-1 text-xs text-slate-400">{detail as string}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}
              {activeModule === "#history" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                  <GlassCard id="history" className="print-card">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">History module</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Timeline, reports, risk changes</h3>
                      </div>
                      <History className="h-6 w-6 text-cyan-200" />
                    </div>
                    <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
                      <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr] bg-white/[0.06] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                            className="grid w-full grid-cols-[1fr_0.7fr_0.7fr_0.7fr] items-center border-t border-white/10 px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-white/[0.045]"
                          >
                            <span className="truncate font-medium text-white">{analysis.patientName}</span>
                            <span>{analysis.prediction}</span>
                            <span><RiskBadge risk={analysis.riskLevel} /></span>
                            <span className="text-xs text-slate-400">{formatDate(analysis.createdAt)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-5 h-64 rounded-3xl border border-white/10 bg-[#071028]/80 p-3">
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <AreaChart data={predictionTimeline} margin={{ left: -16, right: 10, top: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="timelineRisk" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.42} />
                              <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                          <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Area type="monotone" dataKey="risk" stroke="#7C3AED" fill="url(#timelineRisk)" strokeWidth={2} />
                          <Line type="monotone" dataKey="probability" stroke="#06B6D4" dot={false} strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </div>
              )}
              {activeModule === "#reports" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                  <GlassCard id="reports" className="print-card">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.24em] text-violet-200/80">Report generation</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">Clinical PDF-ready output</h3>
                      </div>
                      <BadgeCheck className="h-6 w-6 text-violet-200" />
                    </div>
                    <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">NeuroExplain Report</p>
                          <h4 className="mt-2 text-xl font-semibold text-white">{selectedPatient?.name}</h4>
                          <p className="mt-1 text-sm text-slate-400">{selectedPatient?.externalId} · {formatDate(selectedAnalysis.createdAt)}</p>
                        </div>
                        <RiskBadge risk={selectedAnalysis.riskLevel} />
                      </div>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white/10 p-3">
                          <p className="text-xs text-slate-400">Prediction</p>
                          <p className="mt-1 font-semibold text-white">{selectedAnalysis.prediction}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-3">
                          <p className="text-xs text-slate-400">Confidence</p>
                          <p className="mt-1 font-semibold text-white">{selectedAnalysis.confidence}%</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-3">
                          <p className="text-xs text-slate-400">Probability</p>
                          <p className="mt-1 font-semibold text-white">{selectedAnalysis.seizureProbability}%</p>
                        </div>
                      </div>
                      <p className="mt-5 text-sm leading-6 text-slate-300">{selectedAnalysis.explanation.summary}</p>
                      <div className="mt-5">
                        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400" htmlFor="doctor-note">
                          Doctor notes
                        </label>
                        <textarea
                          id="doctor-note"
                          value={doctorNote}
                          onChange={(event) => setDoctorNote(event.target.value)}
                          className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-[#10172f] px-4 py-3 text-sm text-white outline-none"
                        />
                      </div>
                      <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
                        Decision support only. NeuroExplain does not replace neurologist diagnosis, clinical examination, or emergency protocols.
                      </div>
                    </div>
                    <div className="no-print mt-5 flex flex-col gap-3 sm:flex-row">
                      <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-100">
                        <Printer className="h-4 w-4" /> Export PDF / Print
                      </button>
                      <button type="button" onClick={exportReport} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">
                        <Download className="h-4 w-4" /> Download JSON
                      </button>
                    </div>
                    <div className="mt-5 space-y-3">
                      {reports.slice(0, 4).map((report) => (
                        <div key={report.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-sm">
                          <span className="text-white">{report.reportNumber}</span>
                          <span className="text-slate-400">{report.status}</span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </div>
              )}
              {activeModule === "#settings" && (
                <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                  <GlassCard id="login" className="print-card">
                    <div className="flex items-center gap-3">
                      <Lock className="h-6 w-6 text-emerald-200" />
                      <h3 className="text-xl font-semibold text-white">Local authentication</h3>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">Offline role-based workspace for admins, doctors, and researchers. Demo password hint: offline-demo.</p>
                    <div className="mt-5 grid gap-3">
                      {(["doctor", "researcher", "admin"] as Role[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setRole(option)}
                          className={cx(
                            "rounded-2xl border p-4 text-left transition",
                            role === option ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-white/[0.045] hover:bg-white/10",
                          )}
                        >
                          <span className="block text-sm font-semibold capitalize text-white">{option}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-400">{roleDescriptions[option]}</span>
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
                      <Microscope className="h-6 w-6 text-cyan-200" />
                      <h3 className="text-xl font-semibold text-white">Research analytics</h3>
                    </div>
                    <div className="mt-5 h-60 rounded-3xl border border-white/10 bg-[#071028]/80 p-3">
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <ReLineChart data={rocData} margin={{ left: -16, right: 10, top: 10, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="fpr" stroke="#64748b" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Line type="monotone" dataKey="tpr" stroke="#06B6D4" strokeWidth={2.5} dot />
                        </ReLineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">ROC curve, confusion matrix, annotations, model comparison, and dataset explorer are prepared for research demonstrations.</p>
                  </GlassCard>
                  <GlassCard className="print-card">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-6 w-6 text-violet-200" />
                      <h3 className="text-xl font-semibold text-white">Confusion matrix</h3>
                    </div>
                    <div className="mt-5">
                      <MiniMatrix />
                    </div>
                    <div className="mt-5 h-32 rounded-3xl border border-white/10 bg-[#071028]/80 p-3">
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
            </div>
          </div>
        </div>
      </motion.section>

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
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#050816] p-8 shadow-[0_0_80px_rgba(6,182,212,0.15)] glow-border"
            >
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-semibold text-white">Local Login</h2>
                <button
                  onClick={() => setIsLoginModalOpen(false)}
                  className="rounded-full p-2 hover:bg-white/10 transition"
                  type="button"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                {loginError && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                    <span className="font-semibold text-red-300">Error:</span> {loginError}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50"
                    placeholder="doctor@neuro.local"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="password">Password Check</label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50"
                    placeholder="offline-demo"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-3.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
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
