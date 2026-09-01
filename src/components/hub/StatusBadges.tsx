import { Badge } from "@/components/ui/badge";
import { useGuestLimits } from "@/lib/use-guest-integration";
import { findModel, type ProviderId } from "@/lib/ai";

const PROVIDER_COLORS: Record<ProviderId, string> = {
  lovable: "bg-primary",
  hf: "bg-orange-500",
  google: "bg-blue-500",
  groq: "bg-purple-500",
  openrouter: "bg-green-500",
  openai: "bg-gray-700",
  anthropic: "bg-cyan-500",
};

export function GuestBadge() {
  const { isGuest, chatsLeft, imagesLeft } = useGuestLimits();

  if (!isGuest) return null;

  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <span>👤 Convidado</span>
      <span className="text-[10px] text-muted-foreground">
        {chatsLeft} chats, {imagesLeft} imgs
      </span>
    </Badge>
  );
}

export function ProviderBadge({ model }: { model: string }) {
  const m = findModel(model);
  const color = PROVIDER_COLORS[m.provider];

  return (
    <Badge className={`${color} text-xs gap-1`}>
      <span>⚡</span>
      {m.provider}
    </Badge>
  );
}

export function StatusBadges({
  model,
  isStreaming,
}: {
  model: string;
  isStreaming?: boolean;
}) {
  const { isGuest } = useGuestLimits();

  return (
    <div className="flex flex-wrap gap-2">
      {isGuest && <GuestBadge />}
      <ProviderBadge model={model} />
      {isStreaming && <Badge variant="outline" className="text-xs animate-pulse">⟳ Respondendo...</Badge>}
    </div>
  );
}
