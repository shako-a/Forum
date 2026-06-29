import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

// We only use two tiers: Haiku for cheap/high-volume work (summaries), Sonnet
// for quality answers (Ask AI). Opus is intentionally not wired up.
export const AI_MODELS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
} as const;

export type AiModelKey = keyof typeof AI_MODELS;

// USD per 1,000,000 tokens (input / output). Because "$X per million tokens"
// equals "X micro-USD per token", cost in micro-USD is just
// tokensIn*inPerM + tokensOut*outPerM — clean integer math, no rounding drift.
const PRICING: Record<AiModelKey, { in: number; out: number }> = {
  haiku: { in: 1, out: 5 },
  sonnet: { in: 3, out: 15 },
};

export function isAiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export type AiResult = { text: string; tokensIn: number; tokensOut: number; costMicroUsd: number };

/**
 * Calls Claude and records the usage (tokens + cost) in AiUsage for admin
 * tracking. Throws if AI isn't configured — callers should check isAiConfigured
 * first and show a friendly message.
 */
export async function runAi(opts: {
  modelKey: AiModelKey;
  kind: "summary" | "ask";
  system: string;
  prompt: string;
  maxTokens?: number;
  userId?: string | null;
}): Promise<AiResult> {
  if (!isAiConfigured()) throw new Error("AI is not configured (missing ANTHROPIC_API_KEY).");

  const model = AI_MODELS[opts.modelKey];
  const msg = await getClient().messages.create({
    model,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  const tokensIn = msg.usage.input_tokens;
  const tokensOut = msg.usage.output_tokens;
  const price = PRICING[opts.modelKey];
  const costMicroUsd = Math.round(tokensIn * price.in + tokensOut * price.out);

  // Best-effort logging: never fail the user's request if the insert hiccups.
  try {
    await db.aiUsage.create({
      data: { userId: opts.userId ?? null, kind: opts.kind, model, tokensIn, tokensOut, costMicroUsd },
    });
  } catch {
    // ignore
  }

  return { text, tokensIn, tokensOut, costMicroUsd };
}
