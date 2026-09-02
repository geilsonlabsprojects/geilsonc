import { supabase } from "@/integrations/supabase/client";
import type { ChatRow, ImageRow, MessageRow } from "@/lib/hub-store";
import {
  getGuestChats,
  getGuestImages,
  getGuestMessages,
  saveGuestChats,
  saveGuestImages,
  saveGuestMessages,
} from "./guest-mode";

const SYNC_KEY = "guest.history-migrated";
const ACTIVE_CHAT_KEY = "guest.active-chat";
const CHAT_MAP_KEY = "guest.chat-id-map";

type GuestSnapshot = {
  chats: ChatRow[];
  messages: Record<string, MessageRow[]>;
  images: ImageRow[];
};

/** Saves the RLS-scoped anonymous history locally before its auth session is replaced. */
export async function snapshotAnonymousHistory(activeChatId?: string | null): Promise<void> {
  const { data: session } = await supabase.auth.getSession();
  if (!session.session?.user.is_anonymous) return;
  const [{ data: chats }, { data: images }] = await Promise.all([
    supabase.from("chats").select("id,title,updated_at").order("updated_at", { ascending: false }),
    supabase
      .from("generated_images")
      .select("id,prompt,model,image_url,created_at")
      .order("created_at", { ascending: false }),
  ]);
  const messages: Record<string, MessageRow[]> = {};
  for (const chat of chats ?? []) {
    const { data } = await supabase
      .from("messages")
      .select("id,role,content,model,attachment_name,attachment_url,created_at")
      .eq("chat_id", chat.id)
      .order("created_at", { ascending: true });
    const chatMessages = data ?? [];
    messages[chat.id] = chatMessages;
    saveGuestMessages(chat.id, chatMessages);
  }
  saveGuestChats(chats ?? []);
  saveGuestImages(images ?? []);
  if (activeChatId) localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
}

/**
 * Copies an anonymous snapshot after sign-in. New ids intentionally avoid collisions
 * with anonymous RLS rows. The marker makes the operation idempotent per browser.
 */
export async function syncGuestDataToAuth(): Promise<void> {
  if (localStorage.getItem(SYNC_KEY)) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.is_anonymous) return;
  const snapshot: GuestSnapshot = {
    chats: getGuestChats(),
    messages: Object.fromEntries(
      getGuestChats().map((chat) => [chat.id, getGuestMessages(chat.id)]),
    ),
    images: getGuestImages(),
  };
  if (!snapshot.chats.length && !snapshot.images.length) {
    localStorage.setItem(SYNC_KEY, "empty");
    return;
  }
  const chatIds = new Map<string, string>();
  for (const chat of snapshot.chats) {
    const newId = crypto.randomUUID();
    const { error } = await supabase.from("chats").insert({
      id: newId,
      user_id: auth.user.id,
      title: chat.title,
      updated_at: chat.updated_at,
    });
    if (error) throw error;
    chatIds.set(chat.id, newId);
  }
  for (const [oldId, newId] of chatIds) {
    const rows = (snapshot.messages[oldId] ?? []).map((message) => ({
      chat_id: newId,
      user_id: auth.user.id,
      role: message.role,
      content: message.content,
      model: message.model,
      attachment_name: message.attachment_name,
      attachment_url: message.attachment_url,
      created_at: message.created_at,
    }));
    if (rows.length) {
      const { error } = await supabase.from("messages").insert(rows);
      if (error) throw error;
    }
  }
  for (const image of snapshot.images) {
    const { error } = await supabase.from("generated_images").insert({
      user_id: auth.user.id,
      prompt: image.prompt,
      model: image.model,
      image_url: image.image_url,
      created_at: image.created_at,
    });
    if (error) throw error;
  }
  const activeGuestChat = localStorage.getItem(ACTIVE_CHAT_KEY);
  const activeAuthenticatedChat = activeGuestChat ? chatIds.get(activeGuestChat) : undefined;
  if (activeAuthenticatedChat) localStorage.setItem(CHAT_MAP_KEY, activeAuthenticatedChat);
  localStorage.setItem(SYNC_KEY, "done");
}

/** Retrieves the translated active chat once, after authenticated chats have loaded. */
export function consumeMigratedActiveChatId(): string | null {
  const id = localStorage.getItem(CHAT_MAP_KEY);
  localStorage.removeItem(CHAT_MAP_KEY);
  localStorage.removeItem(ACTIVE_CHAT_KEY);
  return id;
}

export function shouldSync(): boolean {
  return !localStorage.getItem(SYNC_KEY);
}

export function markSynced() {
  localStorage.setItem(SYNC_KEY, "done");
}
