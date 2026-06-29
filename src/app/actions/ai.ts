"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/dal";
import { hasAiAccess } from "@/lib/perks";
import { isAiConfigured, runAi } from "@/lib/ai";
import { pmPlainText } from "@/lib/prosemirror";

type AiActionResult = { ok: true; text: string; cached?: boolean } | { ok: false; error: string };

// Summarize a discussion thread. Haiku (cheap) + cached on the post; we only
// regenerate when there's newer activity than the cached summary.
export async function summarizePost(postId: string): Promise<AiActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  if (!hasAiAccess(user)) return { ok: false, error: "tier" };
  if (!isAiConfigured()) return { ok: false, error: "unconfigured" };

  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      body: true,
      lastActivity: true,
      aiSummary: true,
      aiSummaryAt: true,
      hidden: true,
      replies: {
        where: { deletedAt: null, hidden: false },
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { body: true },
      },
    },
  });
  if (!post || post.hidden) return { ok: false, error: "notfound" };

  // Serve the cache unless the thread changed since we summarized it.
  if (post.aiSummary && post.aiSummaryAt && post.aiSummaryAt >= post.lastActivity) {
    return { ok: true, text: post.aiSummary, cached: true };
  }

  const opening = pmPlainText(post.body).slice(0, 6000);
  const comments = post.replies
    .map((r, i) => `Comment ${i + 1}: ${pmPlainText(r.body)}`)
    .join("\n")
    .slice(0, 8000);

  const prompt = `Title: ${post.title}\n\nOriginal post:\n${opening}\n\nComments:\n${comments || "(no comments yet)"}`;
  const system =
    "You summarize forum discussions for a Georgian community forum. Write a concise, neutral summary " +
    "(4–6 sentences max) covering the main question, the key points or advice raised, and any consensus or " +
    "disagreement. Reply in the same language as the discussion. Do not invent facts not present in the thread.";

  try {
    const { text } = await runAi({
      modelKey: "haiku",
      kind: "summary",
      system,
      prompt,
      maxTokens: 600,
      userId: user.id,
    });
    if (!text) return { ok: false, error: "empty" };
    await db.post.update({
      where: { id: post.id },
      data: { aiSummary: text, aiSummaryAt: new Date() },
    });
    return { ok: true, text };
  } catch {
    return { ok: false, error: "failed" };
  }
}

// General Q&A assistant (Sonnet). No forum retrieval yet — answers from general
// knowledge about life abroad (jobs, housing, legal basics, etc.).
export async function askAi(question: string): Promise<AiActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "auth" };
  if (!hasAiAccess(user)) return { ok: false, error: "tier" };
  if (!isAiConfigured()) return { ok: false, error: "unconfigured" };

  const q = question.trim().slice(0, 2000);
  if (q.length < 3) return { ok: false, error: "empty" };

  const system =
    "You are the AI assistant for GeoGlobally, a forum for Georgians living abroad (mainly in the US). " +
    "Help with practical questions about jobs, housing, immigration/visas, and everyday life abroad. " +
    "Be concise, practical, and warm. Reply in the same language as the question (Georgian or English). " +
    "For legal, medical, or financial matters, add a brief note to verify with a professional. " +
    "If you are unsure, say so rather than inventing specifics.";

  try {
    const { text } = await runAi({
      modelKey: "sonnet",
      kind: "ask",
      system,
      prompt: q,
      maxTokens: 1024,
      userId: user.id,
    });
    if (!text) return { ok: false, error: "empty" };
    return { ok: true, text };
  } catch {
    return { ok: false, error: "failed" };
  }
}
