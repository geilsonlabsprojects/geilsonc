// Wrapper para integrar multi-provider fallback ao chat.ts
import { tryProviderWithFallback } from "./multi-provider";
import { findModel, type ProviderId } from "./ai";

const PROVIDER_ORDER: ProviderId[] = ["google", "groq", "openrouter", "hf"];

export async function sendChatWithFallback(
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  apiKey: string,
): Promise<{ text: string; provider: ProviderId; error?: undefined } | { error: string }> {
  const m = findModel(model);
  const targetProviders = [m.provider, ...PROVIDER_ORDER.filter((p) => p !== m.provider)];

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  const result = await tryProviderWithFallback(targetProviders, { model, messages }, headers);

  if ("error" in result) {
    return result;
  }

  try {
    const data = (await result.response.json()) as any;
    const text =
      data.choices?.[0]?.message?.content ||
      data.content?.[0]?.text ||
      data.result?.text ||
      "Sem resposta";

    return { text, provider: result.provider };
  } catch {
    return { error: "Erro ao processar resposta" };
  }
}
