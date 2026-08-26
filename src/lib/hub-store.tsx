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
import {
  HF_MODELS,
  HFError,
  IMAGE_MODELS,
  VISION_MODELS,
  generateImage,
  streamChatCompletion,
  type ApiMessage,
  type Attachment,
  type ChatMessage,
  type Conversation,
  type ContentPart,
  type GeneratedImage,
  type PolicyId,
} from "./hf";

const KEYS = {
  conversations: "aihub.conversations",
  token: "aihub.token",
  model: "aihub.model",
  policy: "aihub.policy",
  visionModel: "aihub.visionModel",
  imageModel: "aihub.imageModel",
  images: "aihub.images",
};

export type TabId = "chat" | "images" | "files" | "compare";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function newConversation(): Conversation {
  const now = Date.now();
  return { id: uid(), title: "Nova conversa", messages: [], createdAt: now, updatedAt: now };
}

interface HubContextValue {
  hydrated: boolean;
  tab: TabId;
  setTab: (t: TabId) => void;
  conversations: Conversation[];
  activeId: string | null;
  active: Conversation | null;
  token: string;
  model: string;
  policy: PolicyId;
  visionModel: string;
  imageModel: string;
  images: GeneratedImage[];
  imageLoading: boolean;
  imageError: string | null;
  streaming: boolean;
  error: string | null;
  notice: string | null;
  setToken: (v: string) => void;
  setModel: (v: string) => void;
  setPolicy: (v: PolicyId) => void;
  setVisionModel: (v: string) => void;
  setImageModel: (v: string) => void;
  selectConversation: (id: string) => void;
  createConversation: () => void;
  deleteConversation: (id: string) => void;
  clearActive: () => void;
  sendMessage: (text: string, attachment?: Attachment) => Promise<void>;
  stop: () => void;
  createImage: (prompt: string) => Promise<void>;
  deleteImage: (id: string) => void;
}

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<TabId>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [token, setTokenState] = useState("");
  const [model, setModelState] = useState<string>(HF_MODELS[0].id);
  const [visionModel, setVisionModelState] = useState<string>(VISION_MODELS[0].id);
  const [imageModel, setImageModelState] = useState<string>(IMAGE_MODELS[0].id);
  const [policy, setPolicyState] = useState<PolicyId>("fastest");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = readJSON<Conversation[]>(KEYS.conversations, []);
    const list = stored.length ? stored : [newConversation()];
    const first = list[0]!;
    setConversations(list);
    setActiveId(first.id);
    setImages(readJSON<GeneratedImage[]>(KEYS.images, []));
    setTokenState(localStorage.getItem(KEYS.token) ?? "");
    setModelState(localStorage.getItem(KEYS.model) ?? HF_MODELS[0].id);
    setVisionModelState(localStorage.getItem(KEYS.visionModel) ?? VISION_MODELS[0].id);
    setImageModelState(localStorage.getItem(KEYS.imageModel) ?? IMAGE_MODELS[0].id);
    setPolicyState((localStorage.getItem(KEYS.policy) as PolicyId) ?? "fastest");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.conversations, JSON.stringify(conversations));
  }, [conversations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEYS.images, JSON.stringify(images));
    } catch {
      setImageError("A galeria local está cheia. Exclua algumas imagens para salvar novas.");
    }
  }, [images, hydrated]);

  const setToken = useCallback((v: string) => {
    setTokenState(v);
    localStorage.setItem(KEYS.token, v);
  }, []);
  const setModel = useCallback((v: string) => {
    setModelState(v);
    localStorage.setItem(KEYS.model, v);
  }, []);
  const setVisionModel = useCallback((v: string) => {
    setVisionModelState(v);
    localStorage.setItem(KEYS.visionModel, v);
  }, []);
  const setImageModel = useCallback((v: string) => {
    setImageModelState(v);
    localStorage.setItem(KEYS.imageModel, v);
  }, []);
  const setPolicy = useCallback((v: PolicyId) => {
    setPolicyState(v);
    localStorage.setItem(KEYS.policy, v);
  }, []);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const patchActive = useCallback(
    (fn: (c: Conversation) => Conversation) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...fn(c), updatedAt: Date.now() } : c)),
      );
    },
    [activeId],
  );

  const createConversation = useCallback(() => {
    const conv = newConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setError(null);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      const list = next.length ? next : [newConversation()];
      const first = list[0]!;
      setActiveId((cur) => (cur === id ? first.id : cur));
      return list;
    });
  }, []);

  const clearActive = useCallback(() => {
    patchActive((c) => ({ ...c, messages: [], title: "Nova conversa" }));
    setError(null);
  }, [patchActive]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const toApiMessage = (m: ChatMessage): ApiMessage => {
    const att = m.attachment;
    if (!att) return { role: m.role, content: m.content };
    if (att.kind === "image" && att.dataUrl) {
      const parts: ContentPart[] = [
        { type: "text", text: m.content || "Descreva esta imagem em detalhes." },
        { type: "image_url", image_url: { url: att.dataUrl } },
      ];
      return { role: m.role, content: parts };
    }
    return {
      role: m.role,
      content: `${m.content}\n\n--- Conteúdo do arquivo "${att.name}" ---\n${att.text ?? ""}\n--- fim do arquivo ---`,
    };
  };

  const sendMessage = useCallback(
    async (text: string, attachment?: Attachment) => {
      const content = text.trim();
      if ((!content && !attachment) || streaming || !active) return;
      if (!token) {
        setError("Adicione seu Hugging Face Token nas configurações para conversar.");
        return;
      }
      setError(null);
      if (attachment) setNotice(`Processando arquivo "${attachment.name}"...`);

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content,
        createdAt: Date.now(),
        ...(attachment ? { attachment } : {}),
      };
      const assistantId = uid();
      const history = [...active.messages, userMsg];
      const hasImage = history.some((m) => m.attachment?.kind === "image");
      const targetModel = hasImage ? visionModel : model;

      patchActive((c) => ({
        ...c,
        title:
          c.messages.length === 0
            ? (content || attachment?.name || "Nova conversa").slice(0, 48)
            : c.title,
        messages: [
          ...history,
          { id: assistantId, role: "assistant", content: "", createdAt: Date.now() },
        ],
      }));

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      try {
        await streamChatCompletion({
          token,
          model: targetModel,
          policy,
          signal: controller.signal,
          messages: [
            {
              role: "system",
              content:
                "Você é o assistente do Hub de IA Universal. Responda de forma clara, útil e em markdown quando ajudar.",
            },
            ...history.map(toApiMessage),
          ],
          onToken: (chunk) => {
            setNotice(null);
            setConversations((prev) =>
              prev.map((c) =>
                c.id !== active.id
                  ? c
                  : {
                      ...c,
                      messages: c.messages.map((m) =>
                        m.id === assistantId ? { ...m, content: m.content + chunk } : m,
                      ),
                    },
              ),
            );
          },
        });
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          setStreaming(false);
          abortRef.current = null;
          return;
        }
        const message =
          err instanceof HFError
            ? err.message
            : "Não foi possível falar com a Hugging Face. Verifique sua conexão e tente novamente.";
        setError(message);
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== active.id
              ? c
              : { ...c, messages: c.messages.filter((m) => m.id !== assistantId || m.content) },
          ),
        );
      } finally {
        setNotice(null);
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [active, model, patchActive, policy, streaming, token, visionModel],
  );

  const createImage = useCallback(
    async (prompt: string) => {
      const clean = prompt.trim();
      if (!clean || imageLoading) return;
      if (!token) {
        setImageError("Adicione seu Hugging Face Token nas configurações para gerar imagens.");
        return;
      }
      setImageError(null);
      setImageLoading(true);
      try {
        const { dataUrl } = await generateImage({ token, model: imageModel, prompt: clean });
        setImages((prev) => [
          { id: uid(), prompt: clean, model: imageModel, dataUrl, createdAt: Date.now() },
          ...prev,
        ]);
      } catch (err) {
        setImageError(
          err instanceof HFError
            ? err.message
            : "Não foi possível gerar a imagem. Tente novamente ou troque de modelo.",
        );
      } finally {
        setImageLoading(false);
      }
    },
    [imageLoading, imageModel, token],
  );

  const deleteImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const value: HubContextValue = {
    hydrated,
    tab,
    setTab,
    conversations,
    activeId,
    active,
    token,
    model,
    policy,
    visionModel,
    imageModel,
    images,
    imageLoading,
    imageError,
    streaming,
    error,
    notice,
    setToken,
    setModel,
    setPolicy,
    setVisionModel,
    setImageModel,
    selectConversation: (id) => {
      setActiveId(id);
      setTab("chat");
      setError(null);
    },
    createConversation,
    deleteConversation,
    clearActive,
    sendMessage,
    stop,
    createImage,
    deleteImage,
  };

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used inside HubProvider");
  return ctx;
}
