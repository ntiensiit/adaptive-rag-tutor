"use client";

import { type SubmitEvent, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";
import { useConversation } from "@/components/ConversationContext";
import { useStudent } from "@/components/StudentContext";
import { respondToTutor, sendChat } from "@/lib/api";

const COURSE_ID = 1;

export function ChatPanel() {
  const { studentId } = useStudent();
  const {
    conversationId,
    messages,
    pendingId,
    loadingMessages,
    setMessages,
    setPendingId,
    refreshConversations,
    selectConversation,
    reloadMessages,
  } = useConversation();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, loadingMessages]);

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { id: Date.now(), role: "student", content: text }]);
    setLoading(true);
    try {
      if (pendingId) {
        const res = await respondToTutor(pendingId, text);
        setMessages((m) => [...m, { id: Date.now() + 1, role: "tutor", content: res.feedback }]);
        setPendingId(null);
        await reloadMessages();
      } else {
        const res = await sendChat(studentId, COURSE_ID, text, conversationId);
        if (!conversationId) selectConversation(res.conversation_id);
        setMessages((m) => [
          ...m,
          {
            id: Date.now() + 1,
            role: "tutor",
            content: res.content,
            action_type: res.action_type,
            citations: res.citations,
          },
        ]);
        setPendingId(res.interaction_id);
        await refreshConversations();
      }
    } catch (err) {
      setMessages((m) => [...m, { id: Date.now() + 2, role: "tutor", content: `Error: ${String(err)}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-border/80 bg-card/50 shadow-[0_0_30px_var(--glow)] backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-border/80 px-4 py-3">
        <MessageCircle className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">Ask</h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 sm:p-4">
        {loadingMessages && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            Loading chat...
          </div>
        )}
        {!loadingMessages && messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted">
            <Sparkles className="h-8 w-8 animate-pulse text-accent" />
            <p className="max-w-xs text-xs">Ask about course topics for Socratic hints.</p>
          </div>
        )}
        {!loadingMessages &&
          messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              actionType={msg.action_type}
              citations={msg.citations}
            />
          ))}
        {loading && (
          <div className="mr-auto flex items-center gap-2 rounded-xl border border-accent-2/30 bg-card/80 px-3 py-2 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
            Thinking...
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={onSubmit} className="border-t border-border/80 p-3 sm:p-4">
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-border bg-background/80 px-3 py-2 text-sm outline-none transition-all focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pendingId ? "Answer..." : "Ask a question..."}
            disabled={loading || loadingMessages}
          />
          <button
            className="flex shrink-0 items-center justify-center rounded-xl bg-linear-to-r from-accent to-cyan-400 px-3 py-2 text-slate-950 transition-all hover:brightness-110 disabled:opacity-50"
            disabled={loading || loadingMessages}
            type="submit"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </aside>
  );
}
