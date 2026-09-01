import { v4 as uuidv4 } from 'crypto-js';

const GUEST_ID_KEY = 'guest.device_id';
const GUEST_CHATS_KEY = 'guest.chats';
const GUEST_MESSAGES_KEY = 'guest.messages';
const GUEST_IMAGES_KEY = 'guest.images';
const GUEST_USAGE_KEY = 'guest.daily_usage';

export interface GuestUsage {
  date: string;
  chats: number;
  images: number;
  lastReset: number;
}

export const GUEST_LIMITS = {
  chats_per_day: 3,
  images_per_day: 2,
  max_chat_history: 20,
  credits: 50,
  image_credits: 1,
} as const;

export function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      // Simpler uuid generation without external lib
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

export function getGuestUsage(): GuestUsage {
  try {
    const stored = localStorage.getItem(GUEST_USAGE_KEY);
    if (stored) {
      const usage = JSON.parse(stored) as GuestUsage;
      const today = new Date().toISOString().split('T')[0];
      if (usage.date === today) {
        return usage;
      }
      // Reset if day changed
      return { date: today, chats: 0, images: 0, lastReset: Date.now() };
    }
    const today = new Date().toISOString().split('T')[0];
    return { date: today, chats: 0, images: 0, lastReset: Date.now() };
  } catch {
    const today = new Date().toISOString().split('T')[0];
    return { date: today, chats: 0, images: 0, lastReset: Date.now() };
  }
}

export function incrementGuestUsage(type: 'chats' | 'images'): GuestUsage {
  const usage = getGuestUsage();
  usage[type]++;
  try {
    localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage));
  } catch {
    /* ignore */
  }
  return usage;
}

export function canCreateChat(): boolean {
  const usage = getGuestUsage();
  return usage.chats < GUEST_LIMITS.chats_per_day;
}

export function canGenerateImage(): boolean {
  const usage = getGuestUsage();
  return usage.images < GUEST_LIMITS.images_per_day;
}

export function getGuestChats() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CHATS_KEY) || '[]') as Array<{
      id: string;
      title: string;
      updated_at: string;
    }>;
  } catch {
    return [];
  }
}

export function saveGuestChats(chats: any[]) {
  try {
    localStorage.setItem(GUEST_CHATS_KEY, JSON.stringify(chats));
  } catch {
    /* ignore */
  }
}

export function getGuestMessages(chatId: string) {
  try {
    const all = JSON.parse(localStorage.getItem(GUEST_MESSAGES_KEY) || '{}') as Record<string, any[]>;
    return all[chatId] || [];
  } catch {
    return [];
  }
}

export function saveGuestMessages(chatId: string, messages: any[]) {
  try {
    const all = JSON.parse(localStorage.getItem(GUEST_MESSAGES_KEY) || '{}') as Record<string, any[]>;
    all[chatId] = messages;
    localStorage.setItem(GUEST_MESSAGES_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function getGuestImages() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_IMAGES_KEY) || '[]') as Array<{
      id: string;
      prompt: string;
      model: string;
      image_url: string;
      created_at: string;
    }>;
  } catch {
    return [];
  }
}

export function saveGuestImages(images: any[]) {
  try {
    localStorage.setItem(GUEST_IMAGES_KEY, JSON.stringify(images));
  } catch {
    /* ignore */
  }
}

export function clearGuestData() {
  try {
    localStorage.removeItem(GUEST_CHATS_KEY);
    localStorage.removeItem(GUEST_MESSAGES_KEY);
    localStorage.removeItem(GUEST_IMAGES_KEY);
    localStorage.removeItem(GUEST_USAGE_KEY);
  } catch {
    /* ignore */
  }
}
