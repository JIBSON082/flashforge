import Groq, { APIError } from "groq-sdk";
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
// This model's hard ceiling on Groq is 8,192 output tokens per request — use all of it
// so a content-dense chunk doesn't get cut off mid-deck.
const MAX_OUTPUT_TOKENS = 8192;

// Split slide text into content-aware chunks so the model can give full
// attention to every point in a chunk instead of skimming a huge wall of text.
// Chunks are sized generously (~1,500 words) so related ideas — the kind that
// spawn "differentiate X from Y" cards — usually land in the same chunk.
export function chunkText(text: string, maxChars = 6000): string[] {
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
    return `[{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "...", "category": "..."}]`;
  }
  return `[{"question": "...", "answer": "...", "category": "..."}]`;
}

// The core lever for comprehensiveness: don't just ask the model to "cover everything" —
// give it a concrete checklist of question angles to run against every point, the way a
// thorough student building their own exam deck would.
function buildSystemPrompt(mode: ExamMode, studentName: string): string {
  return `You are an outstanding exam-prep tutor building a flashcard deck for a student named ${studentName}, based strictly on their own lecture slides below.

COVERAGE — this is your most important job:
Go through the material systematically. For every distinct definition, fact, example, number, list item, category, process, or claim, check which of these angles genuinely apply, and write a SEPARATE card for each one that does:
- Define it plainly
- Explain or discuss why it matters, or how it works (mechanism, cause-and-effect, significance)
- Differentiate it from a closely related concept mentioned nearby in the material
- Classify it into named types or categories, with an example of each
- Compare it to a related concept with respect to specific dimensions (e.g. mechanism, duration, source, outcome)
- List and briefly define each item, if the material presents a set or list
- State the specific conditions, circumstances, or thresholds under which it applies
- Trace a sequence or chronological/historical progression, if the material presents one
- Discuss benefits, limitations, or trade-offs, if the material presents them

Do not collapse multiple distinct points into one vague card. A slide with 5 bullet points is at least 5 cards, often more once comparisons and classifications are added on top. As a rough guide, aim for roughly one card per 2-3 sentences of substantive content below — but never invent a card that isn't actually grounded in the material just to hit a number.

SPECIFICITY:
Answers must keep every concrete number, percentage, named example, named person, and technical term exactly as given in the source. A vague paraphrase that drops specific details is a worse answer than one that keeps them.

${modeInstructions(mode)}

Also give every card a short "category" field (1-3 words, e.g. "Definitions", "Mechanisms", "History") grouping it by topic within this material.

Respond with ONLY a raw JSON array matching this shape, no markdown code fences, no commentary before or after:
${jsonShape(mode)}`;
}

// Second pass: chunking means the model never sees two far-apart sections at once, so it
// can miss the connective, cross-topic questions (comparisons, classifications spanning
// sections) that make a deck feel truly comprehensive. This pass sees a skim of the whole
// document at once and is asked ONLY for those connecting cards.
function buildSynthesisPrompt(mode: ExamMode, studentName: string): string {
  return `You've already built plenty of individual fact-recall flashcards on this material for a student named ${studentName}. Your ONLY job now is to write CONNECTING cards that a thorough exam would include but single-fact cards miss:
- Direct comparisons between two or more related concepts, processes, or categories from DIFFERENT parts of the material (e.g. "Compare X and Y with respect to...")
- Classifications or groupings that span multiple points
- Cause-and-effect or "why" relationships that connect ideas from different sections
- Chronological or "trace the development of" questions, if the material has a timeline or progression

${modeInstructions(mode)}

Write between 5 and 12 cards. Every single card must genuinely connect two or more separate points from the material — do not restate a single isolated fact. If the material only supports a smaller number of genuine connections, write fewer rather than padding with weak ones. Give every card a short "category" field, e.g. "Comparisons".

Respond with ONLY a raw JSON array matching this shape, no markdown code fences, no commentary before or after:
${jsonShape(mode)}`;
}

function buildSynthesisContext(chunks: string[], capPerChunk = 1400, totalCap = 14000): string {
  const skimmed = chunks.map((c) => c.slice(0, capPerChunk)).join("\n\n---\n\n");
  return skimmed.length > totalCap ? skimmed.slice(0, totalCap) : skimmed;
}

// Strict JSON.parse first; if the model's output got cut off by the output token limit
// (common once we're asking for a lot of cards), salvage every complete {...} object we
// can find instead of throwing the whole chunk's worth of cards away.
function extractJsonArray(raw: string): unknown[] {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = text.indexOf("[");
  if (start === -1) {
    throw new Error("Model response did not contain a JSON array.");
  }
  const jsonSlice = text.slice(start);

  try {
    return JSON.parse(jsonSlice);
  } catch {
    return salvageJsonObjects(jsonSlice);
  }
}

function salvageJsonObjects(jsonSlice: string): unknown[] {
  const objects: unknown[] = [];
  let depth = 0;
  let objStart = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < jsonSlice.length; i++) {
    const ch = jsonSlice[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const candidate = jsonSlice.slice(objStart, i + 1);
        try {
          objects.push(JSON.parse(candidate));
        } catch {
          // Malformed fragment — skip it rather than fail the whole batch.
        }
        objStart = -1;
      }
    }
  }
  return objects;
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

function describeError(err: unknown): string {
  if (err instanceof Error && err.message.includes("GROQ_API_KEY")) {
    return err.message;
  }
  if (err instanceof APIError) {
    if (err.status === 401) {
      return "Groq rejected the API key (401 Unauthorized). Check that GROQ_API_KEY is set correctly in your deployment's environment variables, then redeploy — env var changes don't apply until you redeploy.";
    }
    if (err.status === 429) {
      return "Groq's rate limit was hit (429 Too Many Requests). Wait a minute and try again — the free tier allows about 30 requests/minute.";
    }
    if (err.status === 404) {
      return "Groq couldn't find the requested model (404) — it may have been renamed or retired. Check console.groq.com/docs/models for the current model name.";
    }
    return `Groq API error (${err.status ?? "unknown"}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong generating your deck. Try again.";
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
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: buildSystemPrompt(mode, studentName) },
      { role: "user", content: `Slide content to turn into flashcards:\n\n${chunk}` },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  if (!text) throw new Error("No text response from model.");

  const parsed = extractJsonArray(text);
  return parsed.map((item: any) => toFlashcard(item, mode)).filter((c) => c.question);
}

async function generateSynthesisCards(
  chunks: string[],
  mode: ExamMode,
  studentName: string
): Promise<Flashcard[]> {
  const groq = getClient();
  const context = buildSynthesisContext(chunks);
  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.5,
    max_tokens: MAX_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: buildSynthesisPrompt(mode, studentName) },
      { role: "user", content: `Full material (skimmed across all sections):\n\n${context}` },
    ],
  });

  const text = completion.choices[0]?.message?.content ?? "";
  if (!text) return [];

  const parsed = extractJsonArray(text);
  return parsed.map((item: any) => toFlashcard(item, mode)).filter((c) => c.question);
}

export async function generateDeck(
  fullText: string,
  mode: ExamMode,
  studentName: string
): Promise<Flashcard[]> {
  const chunks = chunkText(fullText);
  const results: Flashcard[] = [];
  let lastError: unknown = null;

  // Sequential to stay well within free-tier rate limits (30 requests/min on Groq).
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    try {
      const cards = await generateCardsForChunk(chunk, mode, studentName);
      results.push(...cards);
    } catch (err) {
      // Skip a failed chunk rather than failing the whole deck immediately —
      // but remember the error in case every attempt fails and we need to explain why.
      lastError = err;
      console.error("Chunk generation failed:", err);
    }
  }

  // Only worth a synthesis pass if the material was actually split into multiple
  // sections — a single short chunk has nothing far-apart left to connect.
  if (chunks.length > 1) {
    try {
      const synthesisCards = await generateSynthesisCards(chunks, mode, studentName);
      results.push(...synthesisCards);
    } catch (err) {
      lastError = err;
      console.error("Synthesis pass failed:", err);
    }
  }

  // If literally every call failed, surface the real reason instead of a generic
  // "couldn't generate cards" message the person can't act on.
  if (results.length === 0 && lastError) {
    throw new Error(describeError(lastError));
  }

  return results;
}
