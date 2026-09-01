import { Bot, User } from "lucide-react";
import { CitationList } from "./CitationList";

type Props = {
  role: "student" | "tutor";
  content: string;
  actionType?: string;
  citations?: { source_file: string; topic: string; excerpt: string }[];
};

export function ChatMessage({ role, content, actionType, citations }: Props) {
  const isStudent = role === "student";
  const wrap = isStudent ? "ml-auto flex-row-reverse" : "mr-auto";
  const bubble = isStudent
    ? "border-accent/40 bg-accent/15 text-foreground"
    : "border-accent-2/30 bg-card/90 text-foreground";
  const Icon = isStudent ? User : Bot;
  return (
    <div className={`flex max-w-[90%] items-end gap-2 transition-all duration-300 sm:max-w-[85%] ${wrap}`}>
      <div className={`shrink-0 rounded-lg border p-1.5 ${isStudent ? "border-accent/30 text-accent" : "border-accent-2/30 text-accent-2"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className={`rounded-2xl border px-4 py-3 shadow-lg ${bubble}`}>
        {actionType && !isStudent && (
          <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent-2">{actionType.replaceAll("_", " ")}</p>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        {citations && citations.length > 0 && <CitationList citations={citations} />}
      </div>
    </div>
  );
}
