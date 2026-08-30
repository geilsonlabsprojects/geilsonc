export type ProviderId =
  | "lovable"
  | "hf"
  | "google"
  | "groq"
  | "openrouter"
  | "openai"
  | "anthropic";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /** true when the platform pays for it (no user key needed) */
  free: boolean;
  keyPlaceholder?: string;
}

export const PROVIDERS: ProviderInfo[] = [
  { id: "lovable", label: "Hub (incluso)", free: true },
  { id: "hf", label: "Hugging Face", free: true },
  { id: "google", label: "Google Gemini", free: true },
  { id: "groq", label: "Groq", free: true },
  { id: "openrouter", label: "OpenRouter", free: true },
  { id: "openai", label: "OpenAI (sua chave)", free: false, keyPlaceholder: "sk-..." },
  { id: "anthropic", label: "Anthropic (sua chave)", free: false, keyPlaceholder: "sk-ant-..." },
];

export interface ModelInfo {
  id: string;
  label: string;
  provider: ProviderId;
  hint: string;
  credits: number;
  /** estimated cost per call in USD, used for the admin cost dashboard */
  cost: number;
  vision?: boolean;
}

export const MODELS: ModelInfo[] = [
  // Included in the hub — no key required
  {
    id: "auto",
    label: "Auto (rápido e econômico)",
    provider: "lovable",
    hint: "Escolhe o melhor modelo incluso",
    credits: 2,
    cost: 0.001,
    vision: true,
  },
  {
    id: "google/gemini-3.7-flash",
    label: "Gemini 3.7 Flash",
    provider: "lovable",
    hint: "Rápido e multimodal",
    credits: 2,
    cost: 0.002,
    vision: true,
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    provider: "lovable",
    hint: "Raciocínio profundo",
    credits: 6,
    cost: 0.012,
    vision: true,
  },
  {
    id: "openai/gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    provider: "lovable",
    hint: "Equilibrado da OpenAI",
    credits: 5,
    cost: 0.01,
    vision: true,
  },
  {
    id: "openai/gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    provider: "lovable",
    hint: "Leve e barato",
    credits: 2,
    cost: 0.002,
    vision: true,
  },
  {
    id: "openai/gpt-5.6-sol",
    label: "GPT-5.6 Sol",
    provider: "lovable",
    hint: "Máxima capacidade",
    credits: 10,
    cost: 0.03,
    vision: true,
  },
  // Hugging Face — Inference Providers (chave no servidor)
  {
    id: "deepseek-ai/DeepSeek-V3-0324",
    label: "DeepSeek V3",
    provider: "hf",
    hint: "Hugging Face · forte em código",
    credits: 2,
    cost: 0.001,
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
    provider: "hf",
    hint: "Hugging Face · generalista",
    credits: 3,
    cost: 0.002,
  },
  {
    id: "meta-llama/Llama-3.3-70B-Instruct",
    label: "Llama 3.3 70B",
    provider: "hf",
    hint: "Hugging Face · open source",
    credits: 2,
    cost: 0.001,
  },
  // Google Gemini (GEMINI_API_KEY)
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    hint: "Google · rápido e multimodal",
    credits: 2,
    cost: 0.001,
    vision: true,
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    hint: "Google · raciocínio avançado",
    credits: 6,
    cost: 0.01,
    vision: true,
  },
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash",
    provider: "google",
    hint: "Google · econômico",
    credits: 1,
    cost: 0.0005,
    vision: true,
  },
  // Groq (GROQ_API_KEY)
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    provider: "groq",
    hint: "Groq · ultrarrápido",
    credits: 2,
    cost: 0.001,
  },
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant",
    provider: "groq",
    hint: "Groq · o mais leve",
    credits: 1,
    cost: 0.0002,
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B (Groq)",
    provider: "groq",
    hint: "Groq · qualidade alta",
    credits: 3,
    cost: 0.002,
  },
  // OpenRouter (OPENROUTER_API_KEY)
  {
    id: "deepseek/deepseek-chat-v3.1",
    label: "DeepSeek Chat V3.1",
    provider: "openrouter",
    hint: "OpenRouter · custo baixo",
    credits: 2,
    cost: 0.001,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    provider: "openrouter",
    hint: "OpenRouter · open source",
    credits: 2,
    cost: 0.001,
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "openrouter",
    hint: "OpenRouter · multimodal",
    credits: 3,
    cost: 0.002,
    vision: true,
  },
  // Bring your own key
  {
    id: "gpt-4o",
    label: "GPT-4o (sua chave)",
    provider: "openai",
    hint: "Chave OpenAI própria",
    credits: 1,
    cost: 0,
    vision: true,
  },
  {
    id: "claude-3-5-sonnet-latest",
    label: "Claude 3.5 Sonnet (sua chave)",
    provider: "anthropic",
    hint: "Chave Anthropic própria",
    credits: 1,
    cost: 0,
  },
];

export const IMAGE_MODELS = [
  {
    id: "google/gemini-3.1-flash-image",
    label: "Nano Banana 2",
    hint: "Rápido e detalhado",
    credits: 10,
    cost: 0.03,
  },
  {
    id: "google/gemini-3-pro-image",
    label: "Gemini 3 Pro Image",
    hint: "Máxima qualidade",
    credits: 18,
    cost: 0.08,
  },
] as const;

/** Unique key for a model, since some ids exist on more than one provider. */
export function modelKey(m: ModelInfo): string {
  return `${m.provider}:${m.id}`;
}

export function modelsForProvider(provider: ProviderId): ModelInfo[] {
  return MODELS.filter((m) => m.provider === provider);
}

/** Accepts "provider:id" or a plain id (legacy). */
export function findModel(key: string): ModelInfo {
  if (key.includes(":")) {
    const [provider, ...rest] = key.split(":");
    const id = rest.join(":");
    const hit = MODELS.find((m) => m.provider === provider && m.id === id);
    if (hit) return hit;
  }
  return MODELS.find((m) => m.id === key) ?? MODELS[0]!;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "agora";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}
