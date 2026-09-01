"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ChatMessage, Conversation, getConversationMessages, listConversations } from "@/lib/api";
import { useStudent } from "@/components/StudentContext";

const COURSE_ID = 1;

type ConversationContextValue = {
  conversations: Conversation[];
  conversationId: number | null;
  messages: ChatMessage[];
  pendingId: number | null;
  loadingMessages: boolean;
  selectConversation: (id: number | null) => void;
  startNewChat: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setPendingId: React.Dispatch<React.SetStateAction<number | null>>;
  refreshConversations: () => Promise<void>;
  reloadMessages: () => Promise<void>;
};

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const { studentId } = useStudent();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const refreshConversations = useCallback(async () => {
    const rows = await listConversations(studentId, COURSE_ID);
    setConversations(rows);
  }, [studentId]);

  const reloadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setPendingId(null);
      return;
    }
    setLoadingMessages(true);
    try {
      const rows = await getConversationMessages(conversationId);
      setMessages(rows);
      setPendingId(null);
    } finally {
      setLoadingMessages(false);
    }
  }, [conversationId]);

  useEffect(() => {
    refreshConversations().catch(() => setConversations([]));
    setConversationId(null);
    setMessages([]);
    setPendingId(null);
  }, [studentId, refreshConversations]);

  useEffect(() => {
    reloadMessages().catch(() => setMessages([]));
  }, [conversationId, reloadMessages]);

  const selectConversation = useCallback((id: number | null) => {
    setConversationId(id);
    setPendingId(null);
  }, []);

  const startNewChat = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setPendingId(null);
  }, []);

  const value = useMemo(
    () => ({
      conversations,
      conversationId,
      messages,
      pendingId,
      loadingMessages,
      selectConversation,
      startNewChat,
      setMessages,
      setPendingId,
      refreshConversations,
      reloadMessages,
    }),
    [
      conversations,
      conversationId,
      messages,
      pendingId,
      loadingMessages,
      selectConversation,
      startNewChat,
      refreshConversations,
      reloadMessages,
    ],
  );

  return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}

export function useConversation() {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error("useConversation must be used within ConversationProvider");
  return ctx;
}
