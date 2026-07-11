
import Groq from "groq-sdk";
import { v4 as uuid } from "uuid";
import { ExamMode, Flashcard } from "./types";

let client: Groq | null = null;

export function getClient(): Groq {
  if (!client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing GROQ_API_KEY. Add it to your .env.local file to generate flashcards."
      );
    }
    client = new Groq({ apiKey });
  }
  return client;
}

// Free, fast, and strong enough at instruction-following for structured JSON output.
const MODEL = "llama-3.3-70b-versatile";

// Split slide text into content-aware chunks so the model can give full
// attention to every point in a chunk instead of skimming a huge wall of text.
export function chunkText(text: string, maxChars = 4500): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= maxChars) return [cleaned];

  const paragraphs = cleaned.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Safety cap: never send more than 10 chunks (keeps generation fast + affordable)
  return chunks.slice(0, 10);
}

function modeInstructions(mode: ExamMode): string {
  switch (mode) {
    case "MCQ":
      return `Produce multiple-choice questions. Each card must have:
- "question": a clear, exam-style question about ONE specific point
- "options": exactly 4 plausible answer choices (strings, no "A)" prefixes)
- "correctIndex": the 0-based index of the correct option
- "explanation": 1-2 sentences on why that answer is correct, written directly to the student
Distractors must be genuinely plausible, not obviously wrong. Never write "All of the above" or "None of the above".`;
    case "SAQ":
      return `Produce short-answer questions. Each card must have:
- "question": a focused, exam-style question about ONE specific point
- "answer": a tight, model short answer (1-3 sentences) a student could write in a few minutes`;
    case "THEORY":
      return `Produce theory/essay questions. Each card must have:
- "question": an exam-style question that asks the student to explain, compare, or discuss a concept in depth
- "answer": a comprehensive model answer (a short structured essay, 4-8 sentences or a few clearly ordered points) that fully covers what a top-scoring answer would include`;
  }
}

function jsonShape(mode: ExamMode): string {
  if (mode === "MCQ") {
    return `[{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..."}]`;
  }
  return `[{"question": "...", "answer": "..."}]`;
}

function buildSystemPrompt(mode: ExamMode, studentName: string): string {
  return `You are an excellent, encouraging tutor building an exam-prep flashcard deck for a student named ${studentName} from their own lecture slides.

Your #1 rule: cover EVERY distinct point, definition, fact, example, formula, and list item in the given slide content. Do not skip anything, do not summarize multiple unrelated points into one vague card, and do not invent information that isn't supported by the material. If a slide has 5 bullet points, that likely means 5+ separate cards, not one.

${modeInstructions(mode)}

Respond with ONLY a raw JSON array matching this shape, no markdown code fences, no commentary before or after:
${jsonShape(mode)}`;
}

function extractJsonArray(raw: string): unknown[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model response did not contain a JSON array.");
  }
  const jsonSlice = text.slice(start, end + 1);
  return JSON.parse(jsonSlice);
}

async function generateCardsForChunk(
  chunk: string,
  mode: ExamMode,
  studentName: string
): Promise<Flashcard[]> {
  const groq = getClient();
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    max_tokens: 4096,
    messages: [
      { role: "system", content: buildSystemPrompt(mode, studentName) },
      { role: "user", content: `Slide content to turn into flashcards:\n\n${chunk}` },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  if (!text) throw new Error("No text response from model.");

  const parsed = extractJsonArray(text);

  return parsed.map((item: any): Flashcard => {
    if (mode === "MCQ") {
      return {
        id: uuid(),
        type: "MCQ",
        question: String(item.question ?? "").trim(),
        options: Array.isArray(item.options) ? item.options.map(String) : [],
        correctIndex: Number(item.correctIndex ?? 0),
        explanation: String(item.explanation ?? "").trim(),
      };
    }
    return {
      id: uuid(),
      type: mode,
      question: String(item.question ?? "").trim(),
      answer: String(item.answer ?? "").trim(),
    } as Flashcard;
  });
}

export async function generateDeck(
  fullText: string,
  mode: ExamMode,
  studentName: string
): Promise<Flashcard[]> {
  const chunks = chunkText(fullText);
  const results: Flashcard[] = [];

  // Sequential to stay well within free-tier rate limits (30 requests/min on Groq).
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    try {
      const cards = await generateCardsForChunk(chunk, mode, studentName);
      results.push(...cards.filter((c) => c.question));
    } catch (err) {
      // Skip a failed chunk rather than failing the whole deck.
      console.error("Chunk generation failed:", err);
    }
  }

  return results;
}
