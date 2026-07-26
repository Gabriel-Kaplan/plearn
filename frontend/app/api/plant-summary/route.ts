import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:0.5b";

type SummaryRequest = {
  name: string;
  type: string;
  score: number;
  tags: string[];
  factors: { label: string; direction: "positive" | "negative" }[];
};

function buildPrompt(p: SummaryRequest): string {
  const positives = p.factors.filter(f => f.direction === "positive").map(f => f.label);
  const negatives = p.factors.filter(f => f.direction === "negative").map(f => f.label);

  return [
    "Example:",
    "FACTS: Aloe vera, succulent, score 91. Boosted: drought tolerance, low maintenance. Held back: none.",
    "SENTENCE: Aloe vera scores 91 mainly thanks to its drought tolerance and low maintenance needs.",
    "",
    "Now do the same for these facts. Write ONLY the sentence — no labels, no \"FACTS:\", no restating the input format.",
    "",
    `FACTS: ${p.name}, ${p.type}, score ${p.score}.` +
      (positives.length ? ` Boosted: ${positives.join(", ")}.` : "") +
      (negatives.length ? ` Held back: ${negatives.join(", ")}.` : " Held back: none.") +
      (p.tags.length ? ` Also: ${p.tags.join(", ")}.` : ""),
    "SENTENCE:",
  ].join("\n");
}

// Tiny local models sometimes ignore "one sentence", or get cut off by the
// token budget before finishing one — keep the first complete sentence, or
// fall back to trimming at the last whole word rather than mid-word.
function firstSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").replace(/^(SENTENCE|FACTS)\s*:\s*/i, "").trim();
  const match = cleaned.match(/^.*?[.!?](?=\s|$)/);
  if (match) return match[0];
  const truncated = cleaned.slice(0, 220);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 100 ? truncated.slice(0, lastSpace) + "…" : truncated;
}

export async function POST(req: NextRequest) {
  let body: SummaryRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: buildPrompt(body),
        stream: false,
        options: { num_predict: 90, temperature: 0.2 },
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return NextResponse.json({ summary: null });
    const data = await res.json();
    const raw: string = data.response ?? "";
    const summary = raw ? firstSentence(raw) : null;
    return NextResponse.json({ summary });
  } catch {
    clearTimeout(timeout);
    // Ollama not running, model not pulled, or timed out — fail quietly, the
    // UI just won't show this section rather than erroring the whole panel.
    return NextResponse.json({ summary: null });
  }
}
