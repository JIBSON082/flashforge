// Pure text-splitting helpers — no SDK imports here, so this file is safe to
// use from client components as well as API routes.

// Gemini's free tier has a generous per-minute token budget, so chunks can be
// larger than they'd need to be on a tighter tier — fewer, bigger requests
// means fewer paced round-trips and better cross-idea context per call.
export function chunkText(text: string, maxChars = 7000): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= maxChars) return [cleaned];

  const paragraphs = cleaned.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const para of paragraphs) {
    // A single paragraph longer than the whole budget (e.g. text with no
    // paragraph breaks at all) needs its own split, or it would silently
    // never get broken up regardless of size.
    if (para.length > maxChars) {
      pushCurrent();
      const sentences = para.split(/(?<=[.!?])\s+/);
      let piece = "";
      for (const sentence of sentences) {
        if ((piece + " " + sentence).length > maxChars && piece.length > 0) {
          chunks.push(piece.trim());
          piece = sentence;
        } else {
          piece = piece ? piece + " " + sentence : sentence;
        }
      }
      if (piece.trim()) chunks.push(piece.trim());
      continue;
    }

    if ((current + "\n\n" + para).length > maxChars && current.length > 0) {
      pushCurrent();
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  pushCurrent();

  // Safety cap: never split into more than 14 pieces (keeps total generation
  // time and token spend reasonable even for a huge upload).
  return chunks.slice(0, 14);
}

// A light skim across every chunk, used for the cross-topic "synthesis" pass
// so it can see the whole document's shape without resending it in full.
export function buildSynthesisContext(
  chunks: string[],
  capPerChunk = 700,
  totalCap = 4200
): string {
  const skimmed = chunks.map((c) => c.slice(0, capPerChunk)).join("\n\n---\n\n");
  return skimmed.length > totalCap ? skimmed.slice(0, totalCap) : skimmed;
}
