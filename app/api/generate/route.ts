import { NextRequest, NextResponse } from "next/server";
import { generateDeck, describeError } from "@/lib/gemini";
import { ExamMode } from "@/lib/types";

export const runtime = "nodejs";
// Almost always a single Gemini call now; the rare large-document fallback
// runs a handful of calls in parallel rather than sequentially, so this still
// comfortably finishes well inside any Vercel plan's timeout.
export const maxDuration = 60;

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
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
