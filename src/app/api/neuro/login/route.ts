import { authenticateUser } from "@/lib/neuro-store";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Missing email or password." }, { status: 400 });
    }

    // In this offline demo prototype, the 'password' field is cross-referenced
    // with the 'passwordHint' in the database (e.g. 'offline-demo')
    const user = await authenticateUser(email, password);

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    });

  } catch (error: any) {
    console.error("NeuroExplain login failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || "Authentication failed.",
      },
      { status: 401 }
    );
  }
}
