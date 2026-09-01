import { useEffect } from "react";
import { useHub } from "./hub-store";
import {
  getGuestChats,
  getGuestMessages,
  getGuestImages,
  saveGuestChats,
  saveGuestMessages,
  saveGuestImages,
  getGuestUsage,
  GUEST_LIMITS,
  getOrCreateGuestId,
} from "./guest-mode";
import { syncGuestDataToAuth, shouldSync, markSynced } from "./history-sync";

export function useGuestIntegration() {
  const { user, chats, messages, images, activeChatId } = useHub();

  // Sincronizar guest → Supabase quando faz login
  useEffect(() => {
    if (!user || user.is_anonymous) return;

    if (shouldSync()) {
      void syncGuestDataToAuth({
        chats: getGuestChats(),
        messages: Object.fromEntries(
          getGuestChats().map((c) => [c.id, getGuestMessages(c.id)]),
        ),
        images: getGuestImages(),
      });
      markSynced();
    }
  }, [user?.id]);

  // Salvar chats/mensagens/imagens localmente se guest
  useEffect(() => {
    if (user?.is_anonymous) {
      saveGuestChats(chats);
      if (activeChatId) {
        saveGuestMessages(activeChatId, messages);
      }
      saveGuestImages(images);
    }
  }, [chats, messages, images, activeChatId, user?.is_anonymous]);

  return {
    guestId: getOrCreateGuestId(),
    isGuest: user?.is_anonymous ?? false,
    guestUsage: getGuestUsage(),
    limits: GUEST_LIMITS,
  };
}

export function useGuestLimits() {
  const { isGuest, guestUsage, limits } = useGuestIntegration();

  return {
    canChat: isGuest ? guestUsage.chats < limits.chats_per_day : true,
    canGenerateImage: isGuest ? guestUsage.images < limits.images_per_day : true,
    chatsLeft: limits.chats_per_day - guestUsage.chats,
    imagesLeft: limits.images_per_day - guestUsage.images,
    isGuest,
  };
}
