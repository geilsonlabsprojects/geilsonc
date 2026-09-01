import type { ProviderId } from "@/lib/ai";

const PROVIDER_ENDPOINTS: Record<ProviderId, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  hf: "https://router.huggingface.co/v1/chat/completions",
  google: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  lovable: "https://ai.gateway.lovable.dev/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
};

export async function tryProviderWithFallback(
  providers: ProviderId[],
  payload: unknown,
  headers: Record<string, string>,
): Promise<{ response: Response; provider: ProviderId } | { error: string }> {
  for (const provider of providers) {
    try {
      const endpoint = PROVIDER_ENDPOINTS[provider];
      if (!endpoint) continue;

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status < 500) {
        return { response, provider };
      }
    } catch {
      continue;
    }
  }

  return { error: "Todos os provedores falharam. Tente novamente mais tarde." };
}
