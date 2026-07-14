import { GoogleGenAI, ApiError } from "@google/genai";
import { v4 as uuid } from "uuid";
import { ExamMode, Flashcard } from "./types";
import { chunkText } from "./chunking";

let client: GoogleGenAI | null = null;

export function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Missing GEMINI_API_KEY. Add it to your .env.local file to generate flashcards."
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

const MODEL = "gemini-2.5-flash";
// Gemini 2.5 Flash's real ceiling is 65,535 output tokens — comfortably enough
// for a full, comprehensive deck (even ~200 cards) in a single call. Capped
// below the hard max to leave headroom rather than chasing the exact limit.
const MAX_OUTPUT_TOKENS = 24000;
// Most single lecture/chapter uploads land well under this — those go through
// as ONE call. Only genuinely huge uploads (a whole course bundled together)
// fall back to a few large chunks run in parallel.
const SINGLE_CALL_CHAR_LIMIT = 28000;

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
    return `[{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "...", "category": "..."}]`;
  }
  return `[{"question": "...", "answer": "...", "category": "..."}]`;
}

// Used for the common single-call path: the whole document is in context at
// once, so atomic fact coverage AND cross-topic connections can be asked for
// together — no separate synthesis pass needed when nothing got split up.
function buildFullPrompt(mode: ExamMode, studentName: string): string {
  return `You are an outstanding exam-prep tutor building a flashcard deck for a student named ${studentName}, based strictly on their own lecture slides below.

COVERAGE — this is your most important job:
Go through the material systematically. For every distinct definition, fact, example, number, list item, category, process, or claim, check which of these angles genuinely apply, and write a SEPARATE card for each one that does:
- Define it plainly
- Explain or discuss why it matters, or how it works (mechanism, cause-and-effect, significance)
- Differentiate it from a closely related concept mentioned elsewhere in the material
- Classify it into named types or categories, with an example of each
- Compare it to a related concept — even from a completely different section — with respect to specific dimensions (e.g. mechanism, duration, source, outcome)
- List and briefly define each item, if the material presents a set or list
- State the specific conditions, circumstances, or thresholds under which it applies
- Discuss benefits, limitations, or trade-offs, if the material presents them

You are seeing the ENTIRE document at once, so actively look for connections, comparisons, and classifications that span different sections — those cross-topic questions matter as much as the direct fact-recall ones.

Do not collapse multiple distinct points into one vague card. As a rough guide, aim for roughly one card per 2-3 sentences of substantive content below — but never invent a card that isn't actually grounded in the material just to hit a number.

SPECIFICITY:
Answers must keep every concrete number, percentage, named example, named person, and technical term exactly as given in the source. A vague paraphrase that drops specific details is a worse answer than one that keeps them.

${modeInstructions(mode)}

Also give every card a short "category" field (1-3 words, e.g. "Definitions", "Mechanisms", "Comparisons") grouping it by topic within this material.

Respond with ONLY a raw JSON array matching this shape:
${jsonShape(mode)}`;
}

// Used only in the large-document fallback path, where the model sees one
// chunk at a time and needs to be told explicitly not to invent connections
// to material it can't see.
function buildChunkPrompt(mode: ExamMode, studentName: string): string {
  return `You are an outstanding exam-prep tutor building a flashcard deck for a student named ${studentName}, based strictly on a SECTION of their own lecture slides below (the full document is longer than this section).

COVERAGE — this is your most important job:
Go through this section systematically. For every distinct definition, fact, example, number, list item, category, process, or claim, check which of these angles genuinely apply, and write a SEPARATE card for each one that does:
- Define it plainly
- Explain or discuss why it matters, or how it works
- Differentiate it from a closely related concept mentioned nearby
- Classify it into named types or categories, with an example of each
- Compare it to a related concept with respect to specific dimensions
- List and briefly define each item, if this section presents a set or list
- State the specific conditions or thresholds under which it applies
- Discuss benefits, limitations, or trade-offs, if this section presents them

Do not collapse multiple distinct points into one vague card. As a rough guide, aim for roughly one card per 2-3 sentences of substantive content below.

SPECIFICITY:
Answers must keep every concrete number, percentage, named example, named person, and technical term exactly as given in the source.

${modeInstructions(mode)}

Also give every card a short "category" field (1-3 words). Respond with ONLY a raw JSON array matching this shape:
${jsonShape(mode)}`;
}

function buildSynthesisPrompt(mode: ExamMode, studentName: string): string {
  return `You've already built individual fact-recall flashcards on this material for a student named ${studentName}, working section by section. Your ONLY job now is to write CONNECTING cards using the skimmed overview below — comparisons, classifications, or cause-and-effect relationships that span DIFFERENT sections.

${modeInstructions(mode)}

Write between 4 and 8 cards. Every card must genuinely connect two or more separate points — do not restate a single isolated fact. Give every card a short "category" field, e.g. "Comparisons".

Respond with ONLY a raw JSON array matching this shape:
${jsonShape(mode)}`;
}

function extractJsonArray(raw: string): unknown[] {
  const text = raw.trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model response did not contain a JSON array.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

function toFlashcard(item: any, mode: ExamMode): Flashcard {
  const category = typeof item.category === "string" ? item.category.trim() : undefined;

  if (mode === "MCQ") {
    return {
      id: uuid(),
      type: "MCQ",
      question: String(item.question ?? "").trim(),
      options: Array.isArray(item.options) ? item.options.map(String) : [],
      correctIndex: Number(item.correctIndex ?? 0),
      explanation: String(item.explanation ?? "").trim(),
      category,
    };
  }
  return {
    id: uuid(),
    type: mode,
    question: String(item.question ?? "").trim(),
    answer: String(item.answer ?? "").trim(),
    category,
  } as Flashcard;
}

export function describeError(err: unknown): string {
  if (err instanceof Error && err.message.includes("GEMINI_API_KEY")) {
    return err.message;
  }
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) {
      return "Gemini rejected the API key. Check that GEMINI_API_KEY is set correctly in your deployment's environment variables, then redeploy — env var changes don't apply until you redeploy.";
    }
    if (err.status === 429) {
      return "Gemini's rate limit was hit. Wait a minute and try again.";
    }
    if (err.status === 404) {
      return "Gemini couldn't find the requested model (404) — it may have been renamed or retired. Check ai.google.dev/gemini-api/docs/models for the current model name.";
    }
    return `Gemini API error (${err.status ?? "unknown"}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong generating your deck. Try again.";
}

async function generateFromPrompt(
  systemInstruction: string,
  userContent: string,
  mode: ExamMode
): Promise<Flashcard[]> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userContent,
    config: {
      systemInstruction,
      temperature: 0.4,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No text response from model.");

  const parsed = extractJsonArray(text);
  return parsed.map((item: any) => toFlashcard(item, mode)).filter((c) => c.question);
}

async function generateChunk(chunk: string, mode: ExamMode, studentName: string): Promise<Flashcard[]> {
  return generateFromPrompt(
    buildChunkPrompt(mode, studentName),
    `Slide content (one section of a larger document):\n\n${chunk}`,
    mode
  );
}

async function generateSynthesis(
  context: string,
  mode: ExamMode,
  studentName: string
): Promise<Flashcard[]> {
  return generateFromPrompt(
    buildSynthesisPrompt(mode, studentName),
    `Skimmed overview of the full material:\n\n${context}`,
    mode
  );
}

export async function generateDeck(
  fullText: string,
  mode: ExamMode,
  studentName: string
): Promise<Flashcard[]> {
  // Common case: the whole document fits comfortably in one call, and the
  // model gets to see everything at once — better comparisons, one round
  // trip, genuinely fast.
  if (fullText.length <= SINGLE_CALL_CHAR_LIMIT) {
    return generateFromPrompt(
      buildFullPrompt(mode, studentName),
      `Slide content to turn into flashcards:\n\n${fullText}`,
      mode
    );
  }

  // Fallback for unusually large uploads: split into a few large chunks and
  // run them together. A handful of concurrent calls is trivially inside
  // Gemini's free-tier request-per-minute budget — no pacing needed.
  const chunks = chunkText(fullText, SINGLE_CALL_CHAR_LIMIT);
  const skim = chunks.map((c) => c.slice(0, 900)).join("\n\n---\n\n").slice(0, 6000);

  const settled = await Promise.allSettled([
    ...chunks.map((c) => generateChunk(c, mode, studentName)),
    generateSynthesis(skim, mode, studentName),
  ]);

  const results: Flashcard[] = [];
  let lastError: unknown = null;
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") results.push(...outcome.value);
    else lastError = outcome.reason;
  }

  if (results.length === 0 && lastError) {
    throw new Error(describeError(lastError));
  }
  return results;
}
