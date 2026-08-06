import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "NeuroExplain | Offline Explainable EEG Seizure Detection",
  description:
    "An offline AI-powered EEG seizure detection, risk assessment, monitoring, and explainable clinical decision support platform.",
  applicationName: "NeuroExplain",
  keywords: ["EEG", "Epilepsy", "Seizure Detection", "Explainable AI", "Clinical Decision Support", "Offline Healthcare AI"],
};

export const viewport: Viewport = {
  themeColor: "#050816",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-[#050816] text-slate-100 antialiased selection:bg-cyan-400/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
