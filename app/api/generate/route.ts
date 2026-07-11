import { NextRequest, NextResponse } from "next/server";
import { generateDeck } from "@/lib/groq";
import { ExamMode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, mode, studentName } = body as {
      text?: string;
      mode?: ExamMode;
      studentName?: string;
    };

    if (!text || text.trim().length < 20) {
      return NextResponse.json({ error: "No slide content to work with." }, { status: 400 });
    }
    if (!mode || !["MCQ", "SAQ", "THEORY"].includes(mode)) {
      return NextResponse.json({ error: "Invalid exam mode." }, { status: 400 });
    }

    const cards = await generateDeck(text, mode, studentName?.trim() || "there");

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "Couldn't generate cards from that content. Try a different file." },
        { status: 422 }
      );
    }

    return NextResponse.json({ cards });
  } catch (err: any) {
    console.error("Generate error:", err);
    const message =
      err?.message?.includes("GROQ_API_KEY")
        ? err.message
        : "Something went wrong generating your deck. Try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

