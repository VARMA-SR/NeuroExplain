import { createPatient, getDashboardSummary } from "@/lib/neuro-store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PatientBody = {
  name?: string;
  age?: number | string;
  sex?: string;
  diagnosis?: string;
  medication?: string;
  previousSeizures?: number | string;
  notes?: string;
};

export async function GET() {
  try {
    const summary = await getDashboardSummary();
    return NextResponse.json({ ok: true, patients: summary.patients });
  } catch (error) {
    console.error("NeuroExplain patients failed", error);
    return NextResponse.json({ ok: false, error: "Unable to load patients." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PatientBody;
    const name = body.name?.trim();
    const diagnosis = body.diagnosis?.trim();
    const sex = body.sex?.trim() || "Not specified";
    const medication = body.medication?.trim() || "Not recorded";
    const age = Number(body.age);
    const previousSeizures = Number(body.previousSeizures ?? 0);

    if (!name || !diagnosis || !Number.isFinite(age) || age < 0 || age > 120) {
      return NextResponse.json(
        { ok: false, error: "Name, diagnosis, and a valid age are required." },
        { status: 400 },
      );
    }

    const patient = await createPatient({
      name,
      age,
      sex,
      diagnosis,
      medication,
      previousSeizures: Number.isFinite(previousSeizures) ? previousSeizures : 0,
      notes: body.notes?.trim(),
    });

    return NextResponse.json({ ok: true, patient });
  } catch (error) {
    console.error("NeuroExplain patient creation failed", error);
    return NextResponse.json({ ok: false, error: "Unable to create patient." }, { status: 500 });
  }
}
