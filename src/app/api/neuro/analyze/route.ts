import { createAnalysis } from "@/lib/neuro-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AnalyzeBody = {
  patientId?: number | string;
  fileName?: string;
  fileType?: string;
  signalText?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AnalyzeBody;
    const patientId = Number(body.patientId);

    if (!Number.isFinite(patientId) || patientId <= 0) {
      return NextResponse.json({ ok: false, error: "A valid patientId is required." }, { status: 400 });
    }

    const payload = await createAnalysis({
      patientId,
      fileName: body.fileName,
      fileType: body.fileType,
      signalText: body.signalText,
    });

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    console.error("NeuroExplain analysis failed", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unable to complete offline EEG analysis.",
      },
      { status: 500 },
    );
  }
}
