import { getDashboardSummary } from "@/lib/neuro-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    const latest = summary.analyses[0];

    return NextResponse.json({
      ok: true,
      report: {
        title: "NeuroExplain Offline EEG Decision Support Report",
        generatedAt: summary.generatedAt,
        latestAnalysis: latest,
        disclaimer: "Decision support only. This report is not a standalone medical diagnosis.",
        exportReady: true,
      },
    });
  } catch (error) {
    console.error("NeuroExplain report failed", error);
    return NextResponse.json({ ok: false, error: "Unable to generate report preview." }, { status: 500 });
  }
}
