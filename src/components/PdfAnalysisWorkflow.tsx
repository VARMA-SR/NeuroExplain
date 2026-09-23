"use client";

import React, { useState, useEffect, useRef } from "react";
import { FileText, CheckCircle2, ChevronRight, Activity, BarChart2, BookOpen, MessageSquare, X, PlayCircle, Loader2, Send } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from "recharts";

type PdfAnalysisWorkflowProps = {
  uploadedFile: { name: string; size: number; type: string };
  onClose: () => void;
};

// Mock data for the reconstructed signal (Step 4)
const generateMockSignal = () => {
  const data = [];
  for (let i = 0; i < 100; i++) {
    data.push({
      time: i,
      original: Math.sin(i * 0.1) * 50 + Math.sin(i * 0.5) * 20 + Math.random() * 10,
      imf1: Math.sin(i * 0.5) * 20 + Math.random() * 10,
      imf2: Math.sin(i * 0.1) * 50,
    });
  }
  return data;
};

const mockSignalData = generateMockSignal();

export default function PdfAnalysisWorkflow({ uploadedFile, onClose }: PdfAnalysisWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(2); // Start at Step 2 (Processing)
  const [processingTasks, setProcessingTasks] = useState([
    { id: 1, label: "Extracting text and research descriptions...", status: "pending" },
    { id: 2, label: "Identifying EEG graphs and figures...", status: "pending" },
    { id: 3, label: "Classifying seizure/non-seizure categories...", status: "pending" },
    { id: 4, label: "Extracting IMF components & measurements...", status: "pending" },
    { id: 5, label: "Parsing tables and mathematical formulas...", status: "pending" },
  ]);

  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: "I have fully analyzed the document. You can explore the extracted signals or ask me any questions about the methodology, IMFs, or classifications mentioned in the text." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Simulate Step 2 processing
  useEffect(() => {
    if (currentStep !== 2) return;

    let taskIndex = 0;
    const interval = setInterval(() => {
      setProcessingTasks(prev => {
        const next = [...prev];
        if (taskIndex > 0 && taskIndex <= next.length) {
          next[taskIndex - 1].status = "complete";
        }
        if (taskIndex < next.length) {
          next[taskIndex].status = "processing";
        }
        return next;
      });

      taskIndex++;

      if (taskIndex > processingTasks.length) {
        clearInterval(interval);
        setTimeout(() => setCurrentStep(3), 800); // Move to Step 3 automatically
      }
    }, 800);

    return () => clearInterval(interval);
  }, [currentStep, processingTasks.length]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatMessages(prev => [...prev, { role: "user", text: chatInput }]);
    setChatInput("");

    // Mock response
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: "ai",
        text: "Based on the extracted text on page 4, the Empirical Mode Decomposition (EMD) algorithm decomposes the non-linear EEG signal into finite Intrinsic Mode Functions (IMFs). The high-frequency components often correlate with seizure onset zones."
      }]);
    }, 1000);
  };

  const renderContent = () => {
    switch (currentStep) {
      case 2:
        return (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 rounded-full bg-cyan-100 flex items-center justify-center mb-8">
              <Loader2 className="h-8 w-8 text-cyan-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-8">AI Document Processing</h2>
            <div className="w-full max-w-md space-y-4">
              {processingTasks.map(task => (
                <div key={task.id} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50">
                  {task.status === "complete" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  ) : task.status === "processing" ? (
                    <Loader2 className="h-5 w-5 text-cyan-500 animate-spin flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                  )}
                  <span className={`text-sm ${task.status === "pending" ? "text-slate-400" : "text-slate-700 font-medium"}`}>
                    {task.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="animate-in fade-in zoom-in-95 duration-500 py-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Document Analysis Overview</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-6 w-6 text-indigo-600" />
                  <h3 className="font-semibold text-slate-900 text-lg">Extracted Metadata</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Document Title</p>
                    <p className="text-slate-900 font-medium">{uploadedFile.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Identified Methodologies</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">EMD</span>
                      <span className="px-2 py-1 rounded-md bg-violet-50 text-violet-700 text-xs font-medium">Random Forest</span>
                      <span className="px-2 py-1 rounded-md bg-cyan-50 text-cyan-700 text-xs font-medium">Feature Extraction</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <h3 className="font-semibold text-slate-900 text-lg">Content Validated</h3>
                </div>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 14 Pages of text parsed successfully</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 3 EEG trace figures reconstructed</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 2 Data tables transformed into matrices</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Seizure vs. Non-seizure classes mapped</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="animate-in fade-in zoom-in-95 duration-500 py-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Signal Visualization</h2>
            <p className="text-slate-600 mb-6">Reconstructed from Figure 3 (Page 5) of the uploaded document.</p>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Original Signal vs Intrinsic Mode Functions (IMFs)</h3>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockSignalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" hide />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="original" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Original Signal" />
                    <Line type="monotone" dataKey="imf1" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="IMF 1 (High Freq)" />
                    <Line type="monotone" dataKey="imf2" stroke="#10b981" strokeWidth={1.5} dot={false} name="IMF 2 (Low Freq)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="animate-in fade-in zoom-in-95 duration-500 py-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Signal and Measurement Analysis</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {[
                { label: "IMF1 Mean Energy", value: "45.2 dB", docRef: "Table 2, Pg 7" },
                { label: "Sample Entropy", value: "1.84", docRef: "Calculated from Fig 3" },
                { label: "Dominant Frequency", value: "14.5 Hz", docRef: "Section 3.1" },
                { label: "Variance", value: "124.6", docRef: "Table 1, Pg 6" },
                { label: "Skewness", value: "0.12", docRef: "Calculated from Fig 3" },
                { label: "Classification", value: "Ictal", docRef: "Derived" },
              ].map((stat, idx) => (
                <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition">
                  <p className="text-xs uppercase tracking-wider text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="mt-2 text-xs text-indigo-600 bg-indigo-50 inline-block px-2 py-1 rounded-md font-medium">Source: {stat.docRef}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="animate-in fade-in zoom-in-95 duration-500 py-6">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <h2 className="text-2xl font-bold text-slate-900">AI Educational Lecture</h2>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm max-w-none">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Understanding the Document&apos;s Methodology</h3>
              <p className="text-slate-700 leading-relaxed mb-6">The uploaded research paper relies heavily on <strong>Empirical Mode Decomposition (EMD)</strong>. Unlike Fourier Transforms, which assume signals are stationary and linear, EMD is highly effective for non-stationary, non-linear signals like human EEG data.</p>

              <h4 className="font-semibold text-slate-900 mb-2">1. What is an IMF?</h4>
              <p className="text-slate-700 leading-relaxed mb-4">An Intrinsic Mode Function (IMF) is a component of a signal that satisfies two conditions:</p>
              <ul className="list-disc pl-5 mb-6 text-slate-700 space-y-2">
                <li>The number of extrema and zero-crossings must either equal or differ at most by one.</li>
                <li>The mean value of the envelope defined by the local maxima and minima is zero.</li>
              </ul>

              <h4 className="font-semibold text-slate-900 mb-2">2. Application to Seizures</h4>
              <p className="text-slate-700 leading-relaxed mb-6">During a seizure (ictal state), the EEG signal exhibits high-frequency oscillations and spikes. The document demonstrates that the first few IMFs capture these high-frequency components, and their <strong>Energy</strong> and <strong>Entropy</strong> rise significantly compared to normal (inter-ictal) states.</p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-6">
                <p className="text-sm text-slate-700 m-0"><strong>Key Takeaway:</strong> By feeding these specific IMF statistical measurements into a Random Forest classifier (as shown in Step 5), the system achieves the high accuracy reported in Table 3 of the document.</p>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="animate-in fade-in zoom-in-95 duration-500 py-6 flex flex-col h-[600px]">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Interactive Learning & Chat</h2>
            <p className="text-slate-600 mb-4">Ask questions about the document, the reconstructed signals, or the methodology.</p>

            <div className="flex-1 rounded-3xl border border-slate-200 bg-white flex flex-col shadow-sm overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-50 border border-slate-100 text-slate-800"}`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <form onSubmit={handleSendMessage} className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="E.g., Why was sample entropy used instead of approximate entropy?"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 pr-14 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="absolute right-2 top-2 bottom-2 rounded-xl bg-indigo-600 w-10 flex items-center justify-center text-white disabled:opacity-50 transition hover:bg-indigo-700"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex bg-slate-50 overflow-hidden animate-in fade-in duration-300">
      {/* Sidebar Navigation */}
      <div className="w-72 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-bold text-slate-900">PDF Workflow</h1>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <FileText className="h-5 w-5 text-slate-400" />
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-900 truncate">{uploadedFile.name}</p>
              <p className="text-xs text-slate-500">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {[
            { step: 2, icon: Activity, label: "AI Processing" },
            { step: 3, icon: FileText, label: "Document Analysis" },
            { step: 4, icon: BarChart2, label: "Signal Visualization" },
            { step: 5, icon: Activity, label: "Measurement Analysis" },
            { step: 6, icon: BookOpen, label: "AI Lecture" },
            { step: 7, icon: MessageSquare, label: "Interactive Learning" },
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            const isLocked = currentStep < item.step && currentStep === 2; // Lock future steps while processing

            return (
              <button
                key={item.step}
                disabled={isLocked}
                onClick={() => setCurrentStep(item.step)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : isLocked
                      ? "opacity-50 cursor-not-allowed text-slate-400"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? "bg-indigo-100 text-indigo-600" : isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <item.icon className="h-4 w-4" />}
                </div>
                <span className="text-sm flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-4 w-4 text-indigo-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative bg-slate-50/50">
        <div className="max-w-5xl mx-auto p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
