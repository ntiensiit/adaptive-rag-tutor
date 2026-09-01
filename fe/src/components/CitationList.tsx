import { FileText } from "lucide-react";

type Props = {
  citations: { source_file: string; topic: string; excerpt: string }[];
};

export function CitationList({ citations }: Props) {
  return (
    <ul className="mt-3 space-y-2 border-t border-border/80 pt-3">
      {citations.map((c, i) => (
        <li key={i} className="flex gap-2 text-xs text-muted">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>
            <span className="font-medium text-foreground">{c.source_file}</span> ({c.topic}): {c.excerpt}
          </span>
        </li>
      ))}
    </ul>
  );
}
