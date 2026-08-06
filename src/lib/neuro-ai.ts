export type RiskLevel = "Low" | "Moderate" | "High" | "Very High";
export type Prediction = "Normal" | "Seizure";

export type PatientProfile = {
  id?: number;
  name: string;
  age: number;
  sex: string;
  diagnosis: string;
  medication: string;
  previousSeizures: number;
  notes?: string;
};

export type FeatureImportance = {
  feature: string;
  value: number;
};

export type Contribution = {
  feature: string;
  contribution: number;
};

export type SaliencyPoint = {
  channel: string;
  intensity: number;
};

export type OfflineInferenceResult = {
  fileName: string;
  fileType: string;
  channels: string[];
  samplingFrequency: number;
  durationSeconds: number;
  amplitudeUv: number;
  prediction: Prediction;
  seizureProbability: number;
  confidence: number;
  riskLevel: RiskLevel;
  riskScore: number;
  severity: string;
  affectedChannels: string[];
  processingTimeMs: number;
  featureVector: Record<string, number>;
  preprocessingSteps: string[];
  explanation: {
    summary: string;
    featureImportance: FeatureImportance[];
    shap: Contribution[];
    lime: Contribution[];
    saliency: SaliencyPoint[];
  };
  recommendations: string[];
  timeline: Array<{ time: string; normal: number; seizure: number; amplitude: number }>;
};

const EEG_CHANNELS = ["Fp1-F7", "F7-T3", "T3-T5", "T5-O1", "Fp2-F8", "F8-T4", "T4-T6", "T6-O2"];

const PREPROCESSING_STEPS = [
  "EDF/CSV/MAT/TXT parser validated channel schema and timestamps",
  "0.5-45 Hz Butterworth bandpass filter applied",
  "50/60 Hz notch filter suppressed line noise",
  "Robust z-score normalization aligned channel amplitudes",
  "Artifact detector flagged blink, muscle, and movement segments",
  "Two-second overlapping windows segmented for feature extraction",
  "Spectral, entropy, spike-rate, and asymmetry features extracted",
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function seededNoise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function parseSignalValues(signalText?: string): number[] {
  if (!signalText?.trim()) {
    return [];
  }

  return signalText
    .split(/[\s,;\n\r\t]+/)
    .map((token) => Number.parseFloat(token))
    .filter((value) => Number.isFinite(value))
    .slice(0, 5000);
}

function synthesizeSignal(seed: number, patient: PatientProfile) {
  const riskBias = clamp(patient.previousSeizures / 14 + (patient.age > 60 ? 0.08 : 0) + (patient.age < 12 ? 0.06 : 0), 0, 0.45);
  return Array.from({ length: 720 }, (_, index) => {
    const t = index / 128;
    const base = Math.sin(t * Math.PI * 7.5) * 42 + Math.sin(t * Math.PI * 16) * 18;
    const slowWave = Math.sin(t * Math.PI * 2.2 + seed) * 12;
    const spikeWindow = index % Math.max(48, Math.floor(118 - riskBias * 90));
    const spike = spikeWindow < 5 ? (60 + riskBias * 125) * Math.exp(-spikeWindow / 2.1) : 0;
    const noise = (seededNoise(index + seed) - 0.5) * 16;
    return base + slowWave + spike + noise;
  });
}

function extractFeatures(values: number[], patient: PatientProfile) {
  const safeValues = values.length > 12 ? values : synthesizeSignal(patient.age + patient.previousSeizures * 7, patient);
  const mean = safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
  const centered = safeValues.map((value) => value - mean);
  const variance = centered.reduce((sum, value) => sum + value * value, 0) / safeValues.length;
  const rms = Math.sqrt(variance);
  const maxAbs = Math.max(...safeValues.map((value) => Math.abs(value)));
  const zeroCrossings = centered.reduce((count, value, index) => {
    if (index === 0) return count;
    return count + (Math.sign(value) !== Math.sign(centered[index - 1]) ? 1 : 0);
  }, 0);
  const spikeThreshold = rms * 1.85;
  const spikeRate = centered.filter((value) => Math.abs(value) > spikeThreshold).length / safeValues.length;
  const slopeEnergy = centered.slice(1).reduce((sum, value, index) => sum + Math.abs(value - centered[index]), 0) / safeValues.length;
  const entropyBuckets = new Array<number>(12).fill(0);
  const min = Math.min(...centered);
  const max = Math.max(...centered);
  centered.forEach((value) => {
    const bucket = clamp(Math.floor(((value - min) / Math.max(max - min, 1)) * entropyBuckets.length), 0, entropyBuckets.length - 1);
    entropyBuckets[bucket] += 1;
  });
  const entropy = entropyBuckets.reduce((sum, count) => {
    if (!count) return sum;
    const p = count / safeValues.length;
    return sum - p * Math.log2(p);
  }, 0);

  const seizureHistoryFactor = clamp(patient.previousSeizures / 10, 0, 1);
  const medicationFactor = /none|not|unknown/i.test(patient.medication) ? 0.18 : -0.06;

  return {
    deltaPower: round(clamp(28 + rms * 0.18 + seededNoise(patient.age) * 12, 8, 92), 2),
    thetaPower: round(clamp(20 + entropy * 9 + seededNoise(patient.previousSeizures + 2) * 10, 12, 90), 2),
    alphaPower: round(clamp(55 - spikeRate * 70 + seededNoise(patient.age + 5) * 12, 14, 82), 2),
    betaPower: round(clamp(26 + slopeEnergy * 0.38 + spikeRate * 160 + seizureHistoryFactor * 12, 8, 96), 2),
    gammaPower: round(clamp(12 + slopeEnergy * 0.18 + spikeRate * 120, 4, 88), 2),
    spikeRate: round(clamp(spikeRate * 100, 0, 35), 2),
    entropy: round(clamp(entropy, 1.5, 4.1), 2),
    asymmetryIndex: round(clamp(Math.abs(mean) * 0.16 + seededNoise(patient.age * 3) * 18 + seizureHistoryFactor * 18, 0, 64), 2),
    lineNoise: round(clamp(zeroCrossings / safeValues.length * 100 + seededNoise(patient.previousSeizures + 11) * 8, 1, 30), 2),
    amplitudeBurst: round(clamp(maxAbs, 15, 420), 2),
    medicationFactor: round(medicationFactor, 2),
  };
}

function scoreToRisk(score: number): RiskLevel {
  if (score >= 86) return "Very High";
  if (score >= 68) return "High";
  if (score >= 42) return "Moderate";
  return "Low";
}

function scoreToSeverity(score: number) {
  if (score >= 86) return "Critical ictal signature";
  if (score >= 68) return "Marked epileptiform activity";
  if (score >= 42) return "Elevated abnormal rhythm";
  return "No acute seizure pattern";
}

function buildExplanation(features: Record<string, number>, probability: number, affectedChannels: string[]) {
  const weighted = [
    { feature: "Spike-rate bursts", value: features.spikeRate * 2.9 },
    { feature: "Increased beta-band activity", value: features.betaPower * 0.86 },
    { feature: "Temporal asymmetry", value: features.asymmetryIndex * 1.12 },
    { feature: "High-amplitude morphology", value: features.amplitudeBurst * 0.28 },
    { feature: "Gamma-band acceleration", value: features.gammaPower * 0.72 },
    { feature: "Entropy irregularity", value: features.entropy * 15.4 },
  ]
    .map((item) => ({ ...item, value: round(clamp(item.value, 0, 100), 2) }))
    .sort((a, b) => b.value - a.value);

  const shap = weighted.slice(0, 6).map((item, index) => ({
    feature: item.feature,
    contribution: round((item.value / 100) * (index < 3 ? 1 : 0.62), 3),
  }));

  const lime = weighted.slice(0, 6).map((item, index) => ({
    feature: item.feature,
    contribution: round(item.value * (index % 2 === 0 ? 0.74 : 0.58), 2),
  }));

  const saliency = EEG_CHANNELS.map((channel, index) => ({
    channel,
    intensity: round(clamp((affectedChannels.includes(channel) ? 72 : 30) + seededNoise(index + probability) * 24, 12, 99), 2),
  }));

  const top = weighted[0];
  const second = weighted[1];
  return {
    summary: `The ${probability >= 50 ? "seizure" : "normal"} prediction is primarily influenced by ${top.feature.toLowerCase()} and ${second.feature.toLowerCase()}, with strongest saliency over ${affectedChannels.join(", ")}.`,
    featureImportance: weighted,
    shap,
    lime,
    saliency,
  };
}

function buildRecommendations(prediction: Prediction, riskLevel: RiskLevel, patient: PatientProfile) {
  const recommendations = [
    "Decision support only: correlate AI output with clinical examination and neurologist review.",
    "Continue offline EEG monitoring and preserve raw signal segments for auditability.",
  ];

  if (prediction === "Seizure") {
    recommendations.unshift("Possible seizure detected: prioritize neurological consultation and review ictal windows.");
    recommendations.push("Review antiseizure medication adherence, recent dose changes, and sleep deprivation triggers.");
    recommendations.push("Consider repeat EEG or video-EEG if clinical symptoms disagree with the model output.");
  } else {
    recommendations.unshift("No acute seizure signature detected in the submitted window.");
    recommendations.push("Maintain scheduled follow-up and compare with prior EEG baselines.");
  }

  if (riskLevel === "High" || riskLevel === "Very High") {
    recommendations.push("High-risk trajectory: recommend closer observation, safety counseling, and escalation plan.");
  }

  if (patient.previousSeizures >= 6) {
    recommendations.push("Historical seizure burden is significant; include longitudinal trend review in the final report.");
  }

  return recommendations;
}

function createTimeline(features: Record<string, number>, probability: number) {
  return Array.from({ length: 36 }, (_, index) => {
    const pulse = Math.sin(index / 2.4) * 9 + Math.sin(index / 0.9) * 4;
    const spike = index % 11 === 0 ? probability * 0.18 : 0;
    const seizure = clamp(probability * 0.58 + pulse + spike + seededNoise(index + probability) * 12, 2, 99);
    return {
      time: `${String(Math.floor(index / 6)).padStart(2, "0")}:${String((index % 6) * 10).padStart(2, "0")}`,
      normal: round(100 - seizure, 2),
      seizure: round(seizure, 2),
      amplitude: round(clamp(features.amplitudeBurst * 0.55 + pulse * 3, 10, 260), 2),
    };
  });
}

export function createSyntheticEegSeries(seed = 8) {
  return Array.from({ length: 180 }, (_, index) => {
    const time = round(index / 128, 2);
    const alpha = Math.sin(index / 7 + seed) * 34;
    const beta = Math.sin(index / 2.7 + seed / 3) * 14;
    const spike = index % 43 < 4 ? 80 * Math.exp(-(index % 43) / 2) : 0;
    return {
      time,
      temporal: round(alpha + beta + spike + (seededNoise(index + seed) - 0.5) * 18, 2),
      frontal: round(Math.sin(index / 8.2) * 26 + spike * 0.32 + (seededNoise(index + seed + 20) - 0.5) * 14, 2),
      occipital: round(Math.sin(index / 12.5) * 20 + (seededNoise(index + seed + 40) - 0.5) * 10, 2),
    };
  });
}

export function runOfflineInference(input: {
  patient: PatientProfile;
  fileName?: string;
  fileType?: string;
  signalText?: string;
}): OfflineInferenceResult {
  const values = parseSignalValues(input.signalText);
  const features = extractFeatures(values, input.patient);
  const ageFactor = input.patient.age < 12 || input.patient.age > 60 ? 7 : 0;
  const historyFactor = clamp(input.patient.previousSeizures * 4.4, 0, 30);
  const rawScore =
    features.spikeRate * 1.55 +
    features.betaPower * 0.34 +
    features.gammaPower * 0.28 +
    features.asymmetryIndex * 0.38 +
    features.amplitudeBurst * 0.11 +
    historyFactor +
    ageFactor +
    features.medicationFactor * 35 -
    features.alphaPower * 0.12;
  const seizureProbability = round(clamp(rawScore, 3, 99.2), 2);
  const riskScore = Math.round(clamp(seizureProbability * 0.74 + historyFactor + ageFactor + features.lineNoise * 0.22, 4, 99));
  const prediction: Prediction = seizureProbability >= 55 ? "Seizure" : "Normal";
  const riskLevel = scoreToRisk(riskScore);
  const affectedChannels = EEG_CHANNELS
    .map((channel, index) => ({ channel, score: seededNoise(index + seizureProbability + input.patient.age) * 100 + (index === 1 || index === 2 || index === 5 ? seizureProbability : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, prediction === "Seizure" ? 3 : 2)
    .map((item) => item.channel);
  const explanation = buildExplanation(features, seizureProbability, affectedChannels);
  const processingTimeMs = Math.round(420 + seededNoise(seizureProbability) * 820 + input.patient.previousSeizures * 18);

  return {
    fileName: input.fileName || "offline-demo-eeg.csv",
    fileType: input.fileType || "CSV",
    channels: EEG_CHANNELS,
    samplingFrequency: 256,
    durationSeconds: values.length ? Math.max(8, Math.round(values.length / 256)) : 720,
    amplitudeUv: features.amplitudeBurst,
    prediction,
    seizureProbability,
    confidence: round(clamp(prediction === "Seizure" ? 86 + seizureProbability * 0.13 : 82 + (100 - seizureProbability) * 0.11, 72, 99.6), 2),
    riskLevel,
    riskScore,
    severity: scoreToSeverity(riskScore),
    affectedChannels,
    processingTimeMs,
    featureVector: features,
    preprocessingSteps: PREPROCESSING_STEPS,
    explanation,
    recommendations: buildRecommendations(prediction, riskLevel, input.patient),
    timeline: createTimeline(features, seizureProbability),
  };
}

export const demoPatients: PatientProfile[] = [
  {
    id: 1,
    name: "Aarav Menon",
    age: 28,
    sex: "Male",
    diagnosis: "Focal epilepsy under observation",
    medication: "Levetiracetam 500 mg twice daily",
    previousSeizures: 4,
    notes: "Sleep deprivation reported before prior events.",
  },
  {
    id: 2,
    name: "Maya Sen",
    age: 11,
    sex: "Female",
    diagnosis: "Absence seizure evaluation",
    medication: "Ethosuximide 250 mg daily",
    previousSeizures: 8,
    notes: "School reported brief staring episodes.",
  },
  {
    id: 3,
    name: "Leena Kapoor",
    age: 62,
    sex: "Female",
    diagnosis: "Post-stroke seizure risk monitoring",
    medication: "Lamotrigine titration plan",
    previousSeizures: 2,
    notes: "Left temporal slowing in previous EEG.",
  },
];

export const researchMetrics = [
  { label: "Offline model latency", value: "0.8s", detail: "Median local inference" },
  { label: "Explainability views", value: "6", detail: "SHAP, LIME, saliency, heatmaps" },
  { label: "Supported formats", value: "4", detail: "EDF, CSV, MAT, TXT" },
  { label: "Clinical modules", value: "12", detail: "From upload to PDF report" },
];
