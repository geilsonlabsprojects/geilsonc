import { findModel, modelKey, MODELS, PROVIDER_ENV_KEY, type ModelInfo } from "@/lib/ai";

/**
 * "Auto" model routing.
 *
 * This talks to two *dedicated* keys (GROQ_ROUTER_API_KEY / MISTRAL_ROUTER_API_KEY) that
 * are separate from GROQ_API_KEY / MISTRAL_API_KEY (the ones used to actually answer a
 * Groq/Mistral chat). Their only job is a single, cheap classification call: read the
 * user's prompt and decide which real model in MODELS should answer it. Nothing here
 * ever streams a final answer to the user — attemptModel() in chat.ts does that, using
 * whatever model this function returns.
 */

/** Full candidate pool "auto" is allowed to route into, across every provider the hub
 * knows how to call — not just the Hub-included ("lovable") models. Billing stays
 * predictable regardless of which one gets picked: credits/cost are always charged from
 * the "auto" entry itself (see chat.ts), never from the resolved model. */
const AUTO_POOL = [
  "lovable:openai/gpt-5.6-luna",
  "lovable:google/gemini-3.7-flash",
  "lovable:openai/gpt-5.6-terra",
  "lovable:google/gemini-3.1-pro-preview",
  "lovable:openai/gpt-5.6-sol",
  "google:gemini-2.0-flash",
  "google:gemini-2.5-pro",
  "groq:llama-3.1-8b-instant",
  "groq:llama-3.3-70b-versatile",
  "mistral:mistral-small-latest",
  "mistral:mistral-large-latest",
  "hf:meta-llama/Llama-3.3-70B-Instruct",
  "hf:deepseek-ai/DeepSeek-V3-0324",
  "openrouter:deepseek/deepseek-chat-v3.1",
] as const;

const DEFAULT_KEY = "lovable:google/gemini-3.7-flash";

/** Only offer the router a provider it can actually reach right now. "lovable" always
 * qualifies: its own models carry their own cross-provider .fallbacks chain already, so
 * even a missing LOVABLE_API_KEY degrades gracefully further down in chat.ts. Every other
 * provider here only qualifies when its *answering* server key is configured — a picked
 * candidate with no working key would otherwise dead-end with no fallback of its own. */
function availableCandidates(): string[] {
  return AUTO_POOL.filter((key) => {
    const provider = key.split(":")[0] as keyof typeof PROVIDER_ENV_KEY;
    if (provider === "lovable") return true;
    const envName = PROVIDER_ENV_KEY[provider];
    return Boolean(envName && process.env[envName]);
  });
}

function buildMenu(candidates: string[]): string {
  return candidates.map((key) => `- ${key} — ${findModel(key).hint}`).join("\n");
}

function buildSystemPrompt(candidates: string[]): string {
  return `Você é um roteador de modelos de IA. Leia a pergunta do usuário e escolha, dentre a lista abaixo, o modelo mais adequado para respondê-la (considere complexidade, se é código, raciocínio profundo, ou algo simples/rápido). A lista inclui modelos de vários provedores diferentes — escolha o que melhor se encaixa, não só os do "Hub".

Modelos disponíveis:
${buildMenu(candidates)}

Responda SOMENTE com um JSON válido no formato exato {"model":"<chave-da-lista>"}. Nenhum texto antes ou depois.`;
}

interface RouterAttempt {
  model: ModelInfo | undefined;
}

function parseRouterReply(text: string, candidates: string[]): ModelInfo | null {
  const match = text.match(/\{[^}]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { model?: string };
    if (!parsed.model) return null;
    const key = parsed.model.trim();
    if (!candidates.includes(key)) return null;
    return findModel(key);
  } catch {
    return null;
  }
}

async function callGroqRouter(prompt: string, candidates: string[]): Promise<RouterAttempt> {
  const key = process.env["GROQ_ROUTER_API_KEY"];
  if (!key) return { model: undefined };
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 60,
        messages: [
          { role: "system", content: buildSystemPrompt(candidates) },
          { role: "user", content: prompt.slice(0, 2000) },
        ],
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { model: undefined };
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    return { model: parseRouterReply(text, candidates) ?? undefined };
  } catch {
    return { model: undefined };
  }
}

async function callMistralRouter(prompt: string, candidates: string[]): Promise<RouterAttempt> {
  const key = process.env["MISTRAL_ROUTER_API_KEY"];
  if (!key) return { model: undefined };
  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-small-latest",
        temperature: 0,
        max_tokens: 60,
        messages: [
          { role: "system", content: buildSystemPrompt(candidates) },
          { role: "user", content: prompt.slice(0, 2000) },
        ],
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { model: undefined };
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    return { model: parseRouterReply(text, candidates) ?? undefined };
  } catch {
    return { model: undefined };
  }
}

/** Pulls the plain text out of the last user message, whatever its shape (string, or a
 * multimodal array of {type:"text"|"image_url", ...} parts). Also reports whether an
 * image was attached, since neither router model can see images. */
export function extractLastUserText(messages: Array<{ role: string; content: unknown }>): {
  text: string;
  hasImage: boolean;
} {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return { text: "", hasImage: false };
  if (typeof last.content === "string") return { text: last.content, hasImage: false };
  if (Array.isArray(last.content)) {
    const parts = last.content as Array<{ type?: string; text?: string }>;
    const text = parts
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join(" ");
    const hasImage = parts.some((p) => p.type === "image_url");
    return { text, hasImage };
  }
  return { text: "", hasImage: false };
}

/**
 * Resolves "auto" into a concrete model by asking a cheap router LLM to read the prompt.
 * Falls back, in order: Groq router → Mistral router → a fixed default. An attached
 * image always short-circuits straight to the default (vision-capable) model, since
 * the router calls above only exchange text.
 */
export async function pickAutoModel(
  messages: Array<{ role: string; content: unknown }>,
): Promise<ModelInfo> {
  const { text, hasImage } = extractLastUserText(messages);
  if (hasImage || !text.trim()) return findModel(DEFAULT_KEY);

  const candidates = availableCandidates();
  if (candidates.length === 0) return findModel(DEFAULT_KEY);

  const groq = await callGroqRouter(text, candidates);
  if (groq.model) return groq.model;

  const mistral = await callMistralRouter(text, candidates);
  if (mistral.model) return mistral.model;

  return findModel(DEFAULT_KEY);
}

// Re-exported for tests/tools that want to sanity-check the candidate pool against MODELS.
export function isKnownAutoCandidate(key: string): boolean {
  return MODELS.some((m) => modelKey(m) === key);
}
