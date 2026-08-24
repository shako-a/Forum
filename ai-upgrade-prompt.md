# Forum AI upgrade — build instructions

## Context

This is a Next.js (App Router) + Prisma + Postgres forum ("GeoGlobally") for Georgians living abroad, mainly in the US. UI is bilingual (Georgian `ka` is primary, English `en` secondary; dictionaries in `src/i18n/dictionaries/ka.json` and `en.json`). Prisma client is generated into `src/generated/prisma`. Deployed on DigitalOcean.

An AI layer already exists — study it before writing anything, and preserve its conventions:

- `src/lib/ai.ts` — `runAi()` wrapper around `@anthropic-ai/sdk`. Two models wired: `haiku` (claude-haiku-4-5) for cheap work, `sonnet` (claude-sonnet-4-6) for quality answers. Computes cost in **micro-USD** (tokensIn × $in/M + tokensOut × $out/M) and logs every call to the `AiUsage` table.
- `src/lib/ai-credits.ts` — per-user monthly allowances in micro-USD, accrued gradually over the calendar month with 50% rollover, derived on read (no cron). `checkCredits()` gates a call, `chargeCredits()` deducts the real cost afterwards. Do not change this accounting model.
- `src/app/actions/ai.ts` — two server actions: `summarizePost` (Haiku, summary cached on the Post row) and `askAi` (Sonnet, **single-turn**, no history, no tools, no retrieval).
- `src/components/AskAiChat.tsx` + `src/app/[lang]/ask/page.tsx` — the chat UI; turns exist only in client state today.
- `src/lib/perks.ts` — `hasAiAccess()` gates AI to Donor/Pro tiers (or an `askAi` feature key).
- Prisma models that matter: `Post`, `Reply`, `Business` (a real business directory with categories and state), `AiUsage`, `AiBalance`, `AiPackage`.

**Non-negotiable constraints for everything below:**

1. Every new cost — output/input tokens, web searches, embedding calls — must flow through the existing micro-USD accounting and end in `chargeCredits()`. Web search costs $10 per 1,000 searches → charge 10,000 micro-USD per search on top of token costs.
2. Everything stays gated behind `getCurrentUser()` + `hasAiAccess()` + `checkCredits()`, exactly like the current actions.
3. All user-facing strings go into both `ka.json` and `en.json`. The assistant itself must answer in the language of the user's message (Georgian or English), as the current system prompt already instructs.
4. Degrade gracefully: missing `ANTHROPIC_API_KEY` (and, below, missing `VOYAGE_API_KEY`) must produce friendly errors or feature fallbacks, never crashes.
5. Keep the existing code style: server actions in `src/app/actions/`, `server-only` libs in `src/lib/`, small client components.

Build in the phases below, in order. Each phase should compile, migrate, and work on its own before moving to the next.

---

## Phase 1 — Persistent conversations + multi-turn history

Today `askAi` receives one question with no context. Make the assistant conversational and durable:

- New Prisma models:
  - `AiConversation` — id, userId, title (first ~60 chars of first question), createdAt, updatedAt.
  - `AiMessage` — id, conversationId, role (`user` | `assistant`), content, model, tokensIn, tokensOut, costMicroUsd, createdAt, plus feedback fields added in Phase 6.
- `askAi(conversationId | null, question)` — creates a conversation on first message, appends both turns, and sends the **last 8 turns** (capped, oldest trimmed first) as proper `messages` history to the API.
- Update `AskAiChat.tsx`: load the active conversation's messages on mount, support starting a new conversation, list the user's recent conversations (sidebar or dropdown — keep it simple).
- Retention: add a `AI_CONVERSATION_RETENTION_DAYS` env (default 365); add a `deleteConversation` action so users can delete their own conversations.
- Privacy: add one sentence to the privacy page (both languages) stating that AI assistant conversations are stored to provide history and improve the service.

This table is also the data source for FAQ analytics in Phase 7 — that's why messages store cost/model metadata.

## Phase 2 — Web search tool

- Add Anthropic's server-side web search tool (`web_search_20250305`) to the `askAi` call, `max_uses: 5`.
- Extend `runAi` (or add `runAiWithTools`) to report `server_tool_use` usage; charge 10,000 micro-USD per search performed in addition to token cost.
- Extend the system prompt: when the user asks about current US procedures, fees, deadlines, or news, search the web — English sources are fine — and answer in the user's language, citing source URLs at the end.
- Render links in the chat answers (the UI currently renders plain text).

## Phase 3 — Glossary + prompt caching

- Create `src/lib/ai-glossary.ts` exporting a Georgian↔English glossary of US-specific terms (EZPass, DMV, misdemeanor, plea, W-2, deductible, small claims court, etc. — seed ~40 entries; make it a simple const array so admins can extend it in code for now). Include it in the system prompt so translations of official terms are consistent.
- Restructure the `askAi` system prompt into content blocks and add `cache_control: { type: "ephemeral" }` on the large static block (persona + glossary + tool instructions), so repeat calls read it at 0.1× price. Mind the per-model minimum cacheable prompt size; if the static block is below the minimum, pad it with the KB preamble from Phase 4 rather than caching nothing.
- Cache-write and cache-read tokens have their own prices (1.25× and 0.1× input) — reflect them in the micro-USD cost calculation in `runAi` using the `usage.cache_creation_input_tokens` / `usage.cache_read_input_tokens` fields.

## Phase 4 — Knowledge base + RAG over forum threads

- Enable pgvector: migration with `CREATE EXTENSION IF NOT EXISTS vector;` (available on DigitalOcean managed Postgres).
- New models:
  - `KbDoc` — id, slug, titleKa/titleEn, body (markdown, Georgian preferred), sourceUrl?, isActive, updatedAt, origin (`curated` | `faq` | `thread`).
  - `KbChunk` — id, docId?, postId? (a chunk can come from a KbDoc or a forum Post thread), content, embedding `Unsupported("vector(1024)")`, updatedAt. Prisma can't query vector columns natively — use `$queryRaw` for similarity search (cosine distance, top 5, with a distance threshold).
- Embeddings: use Voyage AI (`voyageai` npm package, `VOYAGE_API_KEY` env), model `voyage-3.5` (multilingual — must handle Georgian). If the key is missing, fall back to Postgres full-text search over `KbChunk.content` so RAG still works, just less well.
- Ingestion:
  - Admin action to (re)index a `KbDoc`: chunk ~800 tokens with overlap, embed, upsert chunks.
  - Admin action to index a forum thread (Post + top replies) into chunks, and a bulk action "index all posts with ≥N replies".
- Retrieval in `askAi`: embed the user's question, fetch top chunks, insert them as a clearly delimited context block ("Reference material from the forum and knowledge base — prefer this over general knowledge, and say when it answers the question") above the question. Log which chunks were used (ids on the AiMessage row, simple string array) so Phase 7 can measure KB coverage.
- Admin UI: a new `/admin/kb` page (follow the pattern of existing admin pages, e.g. labels/categories) to create, edit, deactivate, and reindex KbDocs.

## Phase 5 — Business directory tool

- Add a client-side tool `find_businesses` to the `askAi` tool list: input `{ category?: string, state?: string, query?: string }`; the handler queries the existing `Business` table (active/confirmed businesses only), returns up to 5 matches with name, category, state, and the forum profile URL (`/business/[slug]`), plus average review stars if cheap to include.
- Implement a proper tool-use loop in `runAiWithTools`: execute tool calls, feed `tool_result` back, cap at 4 iterations, sum usage/cost across all iterations into one micro-USD charge.
- System prompt addition: when the user needs a professional (accountant, lawyer, mechanic…), call `find_businesses` first and present real directory listings with links; only fall back to general advice when the directory has no match — and say so.

## Phase 6 — Feedback (thumbs up / down)

- Add `feedback` (`up` | `down` | null) and `feedbackAt` to `AiMessage`; server action `rateAiMessage(messageId, up|down)` (owner-only).
- Small thumbs UI on each assistant message in `AskAiChat.tsx` (subtle, after the answer).
- Show aggregate feedback (up/down counts, worst-rated recent answers with their questions) on the existing `/admin/ai-usage` page.

## Phase 7 — FAQ analytics → knowledge base loop

Yes, conversations are collected (Phase 1) — turn them into a curation loop:

- New admin page `/admin/ai-faq`:
  - "Analyze recent questions" button: takes the last 30/90 days of `AiMessage` user questions, runs them through Haiku in batches with a prompt that assigns each to a short topic label (in Georgian) and returns topic counts, and stores results in an `AiFaqTopic` table (label, count, periodStart, periodEnd, sampleQuestions JSON — max 5 anonymized samples, strip usernames/emails via simple regex before storing).
  - Table view: topics sorted by frequency, with sample questions, average feedback for answers in that topic (join via message ids), and whether KB chunks were used.
  - A "Draft KB doc" button per topic: generates a draft `KbDoc` (Sonnet, in Georgian, using the sample questions and best-rated existing answers as input) with `origin: "faq"` and `isActive: false`, so an admin reviews and edits before activating and indexing it.
- The analysis itself costs money — log it to `AiUsage` with `userId: null` and a distinct `kind` (e.g. `faq-analysis`) so admin usage is visible but charged to no user.

---

## Testing / acceptance

- Unit-test the pure parts where the codebase already does (mirror the approach used for `project()` in `ai-credits.ts`): history trimming, chunking, cost math including cache and search charges, tool-loop iteration cap.
- Manually verify each phase: multi-turn memory works; a Georgian question about a current US fee triggers search and cites sources; repeat questions show cache-read tokens in `AiUsage`-level costs; a question answered by a KB doc quotes it; "მჭირდება ბუღალტერი" (I need an accountant) returns real directory listings; thumbs persist; FAQ analysis produces sensible Georgian topic labels.
- Run existing lint/build (`npm run build`) after every phase; never leave a phase with a failing build.

Ask me before adding any new paid external service beyond the Anthropic API and Voyage AI embeddings.
