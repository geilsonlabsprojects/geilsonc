export type ChatRole = "user" | "assistant" | "system";

export interface Attachment {
  kind: "image" | "text";
  name: string;
  /** data URL for images */
  dataUrl?: string;
  /** extracted text for text files */
  text?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  attachment?: Attachment;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  model: string;
  dataUrl: string;
  createdAt: number;
}

export const HF_MODELS = [
  { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", hint: "Generalista, rápido" },
  { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B", hint: "Leve e econômico" },
  { id: "deepseek-ai/DeepSeek-R1", label: "DeepSeek R1", hint: "Raciocínio profundo" },
  { id: "deepseek-ai/DeepSeek-V3-0324", label: "DeepSeek V3", hint: "Equilibrado" },
  { id: "mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B Instruct", hint: "Clássico enxuto" },
  { id: "meta-llama/Llama-3.3-70B-Instruct", label: "Llama 3.3 70B", hint: "Conversas longas" },
  { id: "Qwen/Qwen2.5-72B-Instruct", label: "Qwen2.5 72B", hint: "Multilíngue" },
] as const;

export const VISION_MODELS = [
  {
    id: "meta-llama/Llama-3.2-11B-Vision-Instruct",
    label: "Llama 3.2 11B Vision",
    hint: "Descreve e analisa imagens",
  },
  { id: "Qwen/Qwen2.5-VL-7B-Instruct", label: "Qwen2.5 VL 7B", hint: "Visão multilíngue" },
  { id: "google/gemma-3-27b-it", label: "Gemma 3 27B", hint: "Visão + texto longo" },
] as const;

export const IMAGE_MODELS = [
  { id: "black-forest-labs/FLUX.1-dev", label: "FLUX.1 dev", hint: "Alta qualidade" },
  { id: "black-forest-labs/FLUX.1-schnell", label: "FLUX.1 schnell", hint: "Rápido" },
  {
    id: "stabilityai/stable-diffusion-3.5-large",
    label: "Stable Diffusion 3.5 L",
    hint: "Estilos variados",
  },
] as const;

export const POLICIES = [
  { id: "fastest", label: "Mais rápido", hint: "Provedor com menor latência" },
  { id: "cheapest", label: "Mais barato", hint: "Provedor com menor custo" },
] as const;

export type PolicyId = (typeof POLICIES)[number]["id"];

const BASE = "https://router.huggingface.co/v1";
const ENDPOINT = `${BASE}/chat/completions`;

export class HFError extends Error {
  status?: number | undefined;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

function friendlyError(status: number, raw: string): string {
  if (status === 401 || status === 403)
    return "Token inválido ou sem permissão. Verifique seu Hugging Face Token nas configurações.";
  if (status === 429)
    return "Limite de requisições atingido (429). Aguarde alguns instantes e tente novamente.";
  if (status === 503)
    return "O modelo está carregando ou indisponível (503). Tente novamente em instantes ou troque de modelo.";
  if (status === 404)
    return "Modelo não encontrado nos Inference Providers. Escolha outro modelo na lista.";
  return raw?.slice(0, 300) || `Falha na requisição (HTTP ${status}).`;
}

async function toHFError(res: Response): Promise<HFError> {
  let raw = "";
  try {
    raw = await res.text();
    const parsed = JSON.parse(raw);
    raw = parsed?.error?.message ?? parsed?.error ?? raw;
  } catch {
    /* keep raw text */
  }
  return new HFError(friendlyError(res.status, raw), res.status);
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ApiMessage {
  role: ChatRole;
  content: string | ContentPart[];
}

export interface StreamOptions {
  token: string;
  model: string;
  policy: PolicyId;
  messages: ApiMessage[];
  signal?: AbortSignal | undefined;
  onToken: (chunk: string) => void;
}

export async function streamChatCompletion({
  token,
  model,
  policy,
  messages,
  signal,
  onToken,
}: StreamOptions): Promise<void> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    signal: signal ?? null,
    body: JSON.stringify({
      model: `${model}:${policy}`,
      messages,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) throw await toHFError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) onToken(delta);
      } catch {
        /* ignore partial frames */
      }
    }
  }
}

/** Non-streaming completion used by the model comparator (returns latency). */
export async function chatCompletion(options: {
  token: string;
  model: string;
  policy: PolicyId;
  messages: ApiMessage[];
  signal?: AbortSignal | undefined;
}): Promise<{ text: string; latencyMs: number; provider?: string }> {
  const started = performance.now();
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.token}`,
      "Content-Type": "application/json",
    },
    signal: options.signal ?? null,
    body: JSON.stringify({
      model: `${options.model}:${options.policy}`,
      messages: options.messages,
    }),
  });
  if (!res.ok) throw await toHFError(res);
  const json = await res.json();
  return {
    text: json?.choices?.[0]?.message?.content ?? "",
    latencyMs: Math.round(performance.now() - started),
    provider: json?.provider ?? json?.model ?? undefined,
  };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new HFError("Não foi possível ler a imagem gerada."));
    reader.readAsDataURL(blob);
  });
}

/** Text-to-image via the HF router; falls back to the legacy model endpoint. */
export async function generateImage(options: {
  token: string;
  model: string;
  prompt: string;
  signal?: AbortSignal | undefined;
}): Promise<{ dataUrl: string; latencyMs: number }> {
  const started = performance.now();
  const headers = {
    Authorization: `Bearer ${options.token}`,
    "Content-Type": "application/json",
  };

  const res = await fetch(`${BASE}/images/generations`, {
    method: "POST",
    headers,
    signal: options.signal ?? null,
    body: JSON.stringify({
      model: options.model,
      prompt: options.prompt,
      response_format: "b64_json",
    }),
  });

  if (res.ok) {
    const type = res.headers.get("content-type") ?? "";
    if (type.startsWith("image/")) {
      return {
        dataUrl: await blobToDataUrl(await res.blob()),
        latencyMs: Math.round(performance.now() - started),
      };
    }
    const json = await res.json();
    const item = json?.data?.[0];
    const dataUrl = item?.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : (item?.url as string | undefined);
    if (dataUrl) return { dataUrl, latencyMs: Math.round(performance.now() - started) };
    throw new HFError("A resposta do provedor não trouxe nenhuma imagem.");
  }

  if (res.status !== 404 && res.status !== 400) throw await toHFError(res);

  // Legacy per-model inference endpoint (returns raw image bytes).
  const legacy = await fetch(`https://router.huggingface.co/hf-inference/models/${options.model}`, {
    method: "POST",
    headers,
    signal: options.signal ?? null,
    body: JSON.stringify({ inputs: options.prompt }),
  });
  if (!legacy.ok) throw await toHFError(legacy);
  return {
    dataUrl: await blobToDataUrl(await legacy.blob()),
    latencyMs: Math.round(performance.now() - started),
  };
}

/** Reads an uploaded file into an Attachment (image → data URL, text → string). */
export async function readAttachment(file: File): Promise<Attachment> {
  const isImage = file.type.startsWith("image/");
  if (isImage) {
    return { kind: "image", name: file.name, dataUrl: await blobToDataUrl(file) };
  }
  const text = await file.text();
  if (!text.trim()) throw new HFError("Não foi possível extrair texto deste arquivo.");
  return { kind: "text", name: file.name, text: text.slice(0, 60000) };
}

export const ACCEPTED_FILES = "image/*,.txt,.md,.markdown,.csv,.json,.log";
