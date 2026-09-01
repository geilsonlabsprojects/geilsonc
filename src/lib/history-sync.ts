// Sincronização de histórico entre dispositivos
import { supabase } from "@/integrations/supabase/client";

const SYNC_KEY = "last-sync";
const SYNC_INTERVAL = 60000; // 1 minuto

export async function syncGuestDataToAuth(guestData: {
  chats: any[];
  messages: Record<string, any[]>;
  images: any[];
}) {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) return;

    // Sincronizar chats
    for (const chat of guestData.chats) {
      const { data: existing } = await supabase
        .from("chats")
        .select("id")
        .eq("id", chat.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("chats").insert({
          id: chat.id,
          user_id: user.user.id,
          title: chat.title,
          updated_at: chat.updated_at,
        });

        // Sincronizar mensagens do chat
        const msgs = guestData.messages[chat.id] || [];
        for (const msg of msgs) {
          await supabase.from("messages").insert({
            id: msg.id,
            chat_id: chat.id,
            role: msg.role,
            content: msg.content,
            model: msg.model,
            created_at: msg.created_at,
          });
        }
      }
    }

    // Sincronizar imagens
    for (const img of guestData.images) {
      const { data: existing } = await supabase
        .from("generated_images")
        .select("id")
        .eq("id", img.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("generated_images").insert({
          id: img.id,
          user_id: user.user.id,
          prompt: img.prompt,
          model: img.model,
          image_url: img.image_url,
          created_at: img.created_at,
        });
      }
    }

    localStorage.setItem(SYNC_KEY, Date.now().toString());
  } catch (error) {
    console.error("Sync failed:", error);
  }
}

export function shouldSync(): boolean {
  const last = Number(localStorage.getItem(SYNC_KEY) || 0);
  return Date.now() - last > SYNC_INTERVAL;
}

export function markSynced() {
  localStorage.setItem(SYNC_KEY, Date.now().toString());
}
