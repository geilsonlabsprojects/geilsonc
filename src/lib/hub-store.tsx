import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  MODELS,
  IMAGE_MODELS,
  findModel,
  modelKey,
  modelsForProvider,
  type ProviderId,
} from "@/lib/ai";
import { consumeMigratedActiveChatId } from "@/lib/history-sync";
import {
  getGuestChats,
  getGuestImages,
  getGuestMessages,
  getOrCreateGuestId,
  saveGuestChats,
  saveGuestImages,
  saveGuestMessages,
} from "@/lib/guest-mode";

export type TabId = "chat" | "images" | "admin";

export interface Profile {
  user_id: string;
  display_name: string | null;
  email: string | null;
  base_credits: number;
  current_credits: number;
  last_renewal_at: string;
  renewal_interval_seconds: number;
  is_guest?: boolean;
  guest_renewal_count?: number;
}

export interface ChatRow {
  id: string;
  title: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  role: string;
  content: string;
  model: string | null;
  attachment_name: string | null;
  attachment_url: string | null;
  created_at: string;
}

export interface ImageRow {
  id: string;
  prompt: string;
  model: string;
  image_url: string;
  created_at: string;
}

export interface Attachment {
  name: string;
  kind: "image" | "text";
  dataUrl?: string;
  text?: string;
}

interface HubValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** account-free mode: history lives in this browser, quota is metered per device */
  isGuest: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;

  tab: TabId;
  setTab: (t: TabId) => void;
  /** currently selected AI provider */
  provider: ProviderId;
  setProvider: (p: ProviderId) => void;
  /** currently selected model, encoded as "provider:id" */
  model: string;
  setModel: (m: string) => void;
  imageModel: string;
  setImageModel: (m: string) => void;

  chats: ChatRow[];
  activeChatId: string | null;
  messages: MessageRow[];
  streaming: boolean;
  error: string | null;
  selectChat: (id: string) => void;
  newChat: () => void;
  deleteChat: (id: string) => Promise<void>;
  sendMessage: (text: string, attachment?: Attachment) => Promise<void>;
  stop: () => void;

  images: ImageRow[];
  imageLoading: boolean;
  imageError: string | null;
  createImage: (prompt: string, model?: string) => Promise<void>;
  deleteImage: (id: string) => Promise<void>;

  redeemCode: (code: string) => Promise<string>;
}

const HubContext = createContext<HubValue | null>(null);
const MODEL_KEY = "hub.model";
const IMAGE_MODEL_KEY = "hub.imageModel";

export function HubProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);

  const [tab, setTab] = useState<TabId>("chat");
  const [model, setModelState] = useState<string>(modelKey(MODELS[0]!));
  const [imageModel, setImageModelState] = useState<string>(IMAGE_MODELS[0].id);

  const [chats, setChats] = useState<ChatRow[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [images, setImages] = useState<ImageRow[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const user = session?.user ?? null;

  const setModel = useCallback((m: string) => {
    setModelState(m);
    try {
      localStorage.setItem(MODEL_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const setImageModel = useCallback((m: string) => {
    setImageModelState(m);
    try {
      localStorage.setItem(IMAGE_MODEL_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const provider = findModel(model).provider;

  const setProvider = useCallback(
    (p: ProviderId) => {
      const first = modelsForProvider(p)[0];
      if (first) setModel(modelKey(first));
    },
    [setModel],
  );

  const refreshProfile = useCallback(async () => {
    if (!user) {
      if (!guestId) return;
      try {
        const res = await fetch("/api/guest", { headers: { "x-guest-id": guestId } });
        if (!res.ok) return;
        const state = (await res.json()) as {
          credits_left: number;
          base_credits: number;
          next_renewal_at: string | null;
        };
        const interval = 5 * 60 * 60;
        const next = state.next_renewal_at ? new Date(state.next_renewal_at).getTime() : 0;
        setProfile({
          user_id: guestId,
          display_name: "Visitante",
          email: null,
          base_credits: state.base_credits,
          current_credits: state.credits_left,
          last_renewal_at: new Date(
            next ? next - interval * 1000 : Date.now(),
          ).toISOString(),
          renewal_interval_seconds: interval,
          is_guest: true,
        });
      } catch {
        /* offline: keep last known energy */
      }
      return;
    }
    const { data } = await supabase.rpc("sync_credits");
    if (data) setProfile(data as unknown as Profile);
  }, [guestId, user]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODEL_KEY);
      if (stored && MODELS.some((m) => modelKey(m) === stored)) setModelState(stored);
      const storedImage = localStorage.getItem(IMAGE_MODEL_KEY);
      if (storedImage && IMAGE_MODELS.some((m) => m.id === storedImage))
        setImageModelState(storedImage);
    } catch {
      /* ignore */
    }

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setSession(data.session);
      // The product is usable without an account: guests keep their history in
      // this browser and their quota is metered server-side, per device id.
      setGuestId(getOrCreateGuestId());
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Guest mode: local history + device quota
  useEffect(() => {
    if (user || !guestId) return;
    setChats(getGuestChats());
    setImages(getGuestImages());
    setIsAdmin(false);
    setActiveChatId((cur) => cur ?? getGuestChats()[0]?.id ?? null);
    void refreshProfile();
  }, [guestId, user, refreshProfile]);


  // Load everything once we have a user
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setChats([]);
      setMessages([]);
      setImages([]);
      setIsAdmin(false);
      return;
    }
    void (async () => {
      await refreshProfile();
      await supabase.rpc("claim_first_admin");
      const [{ data: roles }, { data: chatRows }, { data: imgRows }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("chats")
          .select("id,title,updated_at")
          .order("updated_at", { ascending: false }),
        supabase
          .from("generated_images")
          .select("id,prompt,model,image_url,created_at")
          .order("created_at", { ascending: false }),
      ]);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
      setChats(chatRows ?? []);
      setImages(imgRows ?? []);
      const migratedActiveChatId = consumeMigratedActiveChatId();
      setActiveChatId(
        migratedActiveChatId && chatRows?.some((chat) => chat.id === migratedActiveChatId)
          ? migratedActiveChatId
          : chatRows?.some((chat) => chat.id === activeChatId)
            ? activeChatId
            : (chatRows?.[0]?.id ?? null),
      );
    })();
  }, [user, refreshProfile]);

  // Load messages when the active chat changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id,role,content,model,attachment_name,attachment_url,created_at")
        .eq("chat_id", activeChatId)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
    })();
  }, [activeChatId]);

  // Automatic credit refresh polling
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => void refreshProfile(), 60_000);
    return () => clearInterval(t);
  }, [user, refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const newChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setError(null);
    setTab("chat");
  }, []);

  const selectChat = useCallback((id: string) => {
    setActiveChatId(id);
    setError(null);
    setTab("chat");
  }, []);

  const deleteChat = useCallback(async (id: string) => {
    await supabase.from("messages").delete().eq("chat_id", id);
    await supabase.from("chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
    setActiveChatId((cur) => (cur === id ? null : cur));
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string, attachment?: Attachment) => {
      const content = text.trim();
      if ((!content && !attachment) || streaming || !user) return;
      setError(null);

      let chatId = activeChatId;
      if (!chatId) {
        const { data: created, error: chatErr } = await supabase
          .from("chats")
          .insert({
            user_id: user.id,
            title: (content || attachment?.name || "Nova conversa").slice(0, 60),
          })
          .select("id,title,updated_at")
          .maybeSingle();
        if (chatErr || !created) {
          setError("Não foi possível criar a conversa.");
          return;
        }
        chatId = created.id;
        setChats((prev) => [created, ...prev]);
        setActiveChatId(created.id);
      }

      const localUser: MessageRow = {
        id: `local-${Date.now()}`,
        role: "user",
        content,
        model: null,
        attachment_name: attachment?.name ?? null,
        attachment_url: attachment?.dataUrl ?? null,
        created_at: new Date().toISOString(),
      };
      const assistantLocalId = `local-a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        localUser,
        {
          id: assistantLocalId,
          role: "assistant",
          content: "",
          model,
          attachment_name: null,
          attachment_url: null,
          created_at: new Date().toISOString(),
        },
      ]);

      await supabase.from("messages").insert({
        chat_id: chatId,
        user_id: user.id,
        role: "user",
        content,
        attachment_name: attachment?.name ?? null,
        attachment_url: attachment?.kind === "image" ? (attachment.dataUrl ?? null) : null,
      });

      const history = [...messages, localUser].map((m) => {
        if (m.role === "user" && m === localUser && attachment) {
          if (attachment.kind === "image" && attachment.dataUrl) {
            return {
              role: "user",
              content: [
                { type: "text", text: content || "Descreva esta imagem em detalhes." },
                { type: "image_url", image_url: { url: attachment.dataUrl } },
              ],
            };
          }
          return {
            role: "user",
            content: `${content}\n\n--- Conteúdo do arquivo "${attachment.name}" ---\n${attachment.text ?? ""}\n--- fim ---`,
          };
        }
        return { role: m.role, content: m.content };
      });

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      let full = "";

      try {
        const { data: sess } = await supabase.auth.getSession();
        const res = await fetch("/api/chat", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "Você é o assistente do Hub de IA Universal. Responda de forma clara, útil e em markdown quando ajudar.",
              },
              ...history,
            ],
          }),
        });

        if (!res.ok || !res.body) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(j?.error ?? "Falha ao falar com a IA.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const chunk = parsed.choices?.[0]?.delta?.content;
              if (chunk) {
                full += chunk;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantLocalId ? { ...m, content: full } : m)),
                );
              }
            } catch {
              /* partial chunk */
            }
          }
        }

        if (full) {
          await supabase.from("messages").insert({
            chat_id: chatId,
            user_id: user.id,
            role: "assistant",
            content: full,
            model: findModel(model).id,
          });
        }
        await supabase
          .from("chats")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", chatId);
        void refreshProfile();
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError((err as Error).message);
        setMessages((prev) => prev.filter((m) => m.id !== assistantLocalId || m.content));
        void refreshProfile();
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [activeChatId, messages, model, refreshProfile, streaming, user],
  );

  const createImage = useCallback(
    async (prompt: string, chosenModel?: string) => {
      const imageModelId = chosenModel ?? imageModel;
      if (!prompt.trim() || imageLoading || !user) return;
      setImageError(null);
      setImageLoading(true);
      try {
        const { data: sess } = await supabase.auth.getSession();
        const res = await fetch("/api/images", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sess.session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ prompt, model: imageModelId }),
        });
        const json = (await res.json()) as { image?: ImageRow; error?: string };
        if (!res.ok || !json.image) throw new Error(json.error ?? "Falha ao gerar a imagem.");
        setImages((prev) => [json.image as ImageRow, ...prev]);
        void refreshProfile();
      } catch (err) {
        setImageError((err as Error).message);
        void refreshProfile();
      } finally {
        setImageLoading(false);
      }
    },
    [imageLoading, imageModel, refreshProfile, user],
  );

  const deleteImage = useCallback(async (id: string) => {
    await supabase.from("generated_images").delete().eq("id", id);
    setImages((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const redeemCode = useCallback(async (code: string) => {
    const { data, error: rpcError } = await supabase.rpc("redeem_access_code", {
      _code: code.trim(),
    });
    if (rpcError) {
      throw new Error(
        rpcError.message.includes("INVALID_CODE")
          ? "Código inválido, expirado ou já utilizado."
          : "Não foi possível resgatar o código.",
      );
    }
    if (data) setProfile(data as unknown as Profile);
    return "Código resgatado com sucesso!";
  }, []);

  const value = useMemo<HubValue>(
    () => ({
      loading,
      session,
      user,
      profile,
      isAdmin,
      refreshProfile,
      signOut,
      tab,
      setTab,
      provider,
      setProvider,
      model,
      setModel,
      imageModel,
      setImageModel,
      chats,
      activeChatId,
      messages,
      streaming,
      error,
      selectChat,
      newChat,
      deleteChat,
      sendMessage,
      stop,
      images,
      imageLoading,
      imageError,
      createImage,
      deleteImage,
      redeemCode,
    }),
    [
      loading,
      session,
      user,
      profile,
      isAdmin,
      refreshProfile,
      signOut,
      tab,
      provider,
      setProvider,
      model,
      setModel,
      imageModel,
      setImageModel,
      chats,
      activeChatId,
      messages,
      streaming,
      error,
      selectChat,
      newChat,
      deleteChat,
      sendMessage,
      stop,
      images,
      imageLoading,
      imageError,
      createImage,
      deleteImage,
      redeemCode,
    ],
  );

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used inside HubProvider");
  return ctx;
}
