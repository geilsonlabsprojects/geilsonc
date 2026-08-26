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
  streamChatCompletion,
  type ChatMessage,
  type Conversation,
  type PolicyId,
} from "./hf";

const KEYS = {
  conversations: "aihub.conversations",
  token: "aihub.token",
  model: "aihub.model",
  policy: "aihub.policy",
};

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
  conversations: Conversation[];
  activeId: string | null;
  active: Conversation | null;
  token: string;
  model: string;
  policy: PolicyId;
  streaming: boolean;
  error: string | null;
  setToken: (v: string) => void;
  setModel: (v: string) => void;
  setPolicy: (v: PolicyId) => void;
  selectConversation: (id: string) => void;
  createConversation: () => void;
  deleteConversation: (id: string) => void;
  clearActive: () => void;
  sendMessage: (text: string) => Promise<void>;
  stop: () => void;
}

const HubContext = createContext<HubContextValue | null>(null);

export function HubProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [token, setTokenState] = useState("");
  const [model, setModelState] = useState<string>(HF_MODELS[0].id);
  const [policy, setPolicyState] = useState<PolicyId>("fastest");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = readJSON<Conversation[]>(KEYS.conversations, []);
    const list = stored.length ? stored : [newConversation()];
    const first = list[0]!;
    setConversations(list);
    setActiveId(first.id);
    setTokenState(localStorage.getItem(KEYS.token) ?? "");
    setModelState(localStorage.getItem(KEYS.model) ?? HF_MODELS[0].id);
    setPolicyState((localStorage.getItem(KEYS.policy) as PolicyId) ?? "fastest");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEYS.conversations, JSON.stringify(conversations));
  }, [conversations, hydrated]);

  const setToken = useCallback((v: string) => {
    setTokenState(v);
    localStorage.setItem(KEYS.token, v);
  }, []);
  const setModel = useCallback((v: string) => {
    setModelState(v);
    localStorage.setItem(KEYS.model, v);
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

  const sendMessage = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || streaming || !active) return;
      if (!token) {
        setError("Adicione seu Hugging Face Token nas configurações para conversar.");
        return;
      }
      setError(null);

      const userMsg: ChatMessage = { id: uid(), role: "user", content, createdAt: Date.now() };
      const assistantId = uid();
      const history = [...active.messages, userMsg];

      patchActive((c) => ({
        ...c,
        title: c.messages.length === 0 ? content.slice(0, 48) : c.title,
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
          model,
          policy,
          signal: controller.signal,
          messages: [
            {
              role: "system",
              content:
                "Você é o assistente do Hub de IA Universal. Responda de forma clara, útil e em markdown quando ajudar.",
            },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
          onToken: (chunk) => {
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
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [active, model, patchActive, policy, streaming, token],
  );

  const value: HubContextValue = {
    hydrated,
    conversations,
    activeId,
    active,
    token,
    model,
    policy,
    streaming,
    error,
    setToken,
    setModel,
    setPolicy,
    selectConversation: (id) => {
      setActiveId(id);
      setError(null);
    },
    createConversation,
    deleteConversation,
    clearActive,
    sendMessage,
    stop,
  };

  return <HubContext.Provider value={value}>{children}</HubContext.Provider>;
}

export function useHub() {
  const ctx = useContext(HubContext);
  if (!ctx) throw new Error("useHub must be used inside HubProvider");
  return ctx;
}
