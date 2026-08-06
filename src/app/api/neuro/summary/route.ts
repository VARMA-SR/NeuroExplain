import { getDashboardSummary } from "@/lib/neuro-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("NeuroExplain summary failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Unable to load offline dashboard summary.",
      },
      { status: 500 },
    );
  }
}
