export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
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

export const POLICIES = [
  { id: "fastest", label: "Mais rápido", hint: "Provedor com menor latência" },
  { id: "cheapest", label: "Mais barato", hint: "Provedor com menor custo" },
] as const;

export type PolicyId = (typeof POLICIES)[number]["id"];

const ENDPOINT = "https://router.huggingface.co/v1/chat/completions";

export class HFError extends Error {
  status?: number;
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

export interface StreamOptions {
  token: string;
  model: string;
  policy: PolicyId;
  messages: { role: ChatRole; content: string }[];
  signal?: AbortSignal;
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
    signal,
    body: JSON.stringify({
      model: `${model}:${policy}`,
      messages,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    let raw = "";
    try {
      raw = await res.text();
      const parsed = JSON.parse(raw);
      raw = parsed?.error?.message ?? parsed?.error ?? raw;
    } catch {
      /* keep raw text */
    }
    throw new HFError(friendlyError(res.status, raw), res.status);
  }

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
