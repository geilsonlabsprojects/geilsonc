export type ProviderId = "lovable" | "openai" | "anthropic" | "google" | "groq" | "hf";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  /** true when the platform pays for it (no user key needed) */
  free: boolean;
  keyPlaceholder?: string;
}

export const PROVIDERS: ProviderInfo[] = [
  { id: "lovable", label: "Hub (incluso)", free: true },
  { id: "openai", label: "OpenAI", free: false, keyPlaceholder: "sk-..." },
  { id: "anthropic", label: "Anthropic", free: false, keyPlaceholder: "sk-ant-..." },
  { id: "google", label: "Google AI Studio", free: false, keyPlaceholder: "AIza..." },
  { id: "groq", label: "Groq", free: false, keyPlaceholder: "gsk_..." },
  { id: "hf", label: "Hugging Face", free: false, keyPlaceholder: "hf_..." },
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
  {
    id: "gemini-2.0-flash",
    label: "Gemini 2.0 Flash (sua chave)",
    provider: "google",
    hint: "Chave Google própria",
    credits: 1,
    cost: 0,
  },
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B (sua chave)",
    provider: "groq",
    hint: "Chave Groq própria",
    credits: 1,
    cost: 0,
  },
  {
    id: "deepseek-ai/DeepSeek-V3-0324",
    label: "DeepSeek V3 (sua chave)",
    provider: "hf",
    hint: "Chave Hugging Face própria",
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

export function findModel(id: string): ModelInfo {
  return MODELS.find((m) => m.id === id) ?? MODELS[0]!;
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
