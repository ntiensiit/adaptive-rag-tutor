"use client";

import { AcademicMarkdown } from "@/components/AcademicMarkdown";
import { PracticeDetail, QUESTION_TYPE_OPTIONS } from "@/lib/api";
import { parseMcQuestion } from "@/lib/parseMcQuestion";

type Props = {
  item: PracticeDetail;
  index: number;
  total: number;
  answer: string;
  disabled: boolean;
  onAnswer: (value: string) => void;
};

function typeLabel(type: string) {
  const row = QUESTION_TYPE_OPTIONS.find((item) => item.id === type);
  const label = row?.label ?? type.replace(/_/g, " ");
  return label;
}

export function ExerciseQuestion({ item, index, total, answer, disabled, onAnswer }: Props) {
  const mc = item.question_type === "multiple_choice" ? parseMcQuestion(item.question) : { stem: item.question, options: [] };
  const showMc = mc.options.length > 0;
  return (
    <article className="space-y-3 rounded-xl border border-border/70 bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">
          Question {index + 1} of {total}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-accent-2">{item.topic}</span>
          <span className="rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
            {typeLabel(item.question_type)}
          </span>
        </span>
      </div>
      <AcademicMarkdown className="academic-md text-sm leading-relaxed" content={showMc ? mc.stem : item.question} />
      {showMc ? (
        <div className="space-y-2">
          {mc.options.map((opt) => {
            const active = answer === opt.label;
            const row = active
              ? "border-accent-2/50 bg-accent-2/10"
              : "border-border/70 bg-background/60 hover:border-border";
            return (
              <label key={opt.label} className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${row} ${disabled ? "opacity-70" : ""}`}>
                <input
                  checked={active}
                  className="mt-1 shrink-0"
                  disabled={disabled}
                  name={`q-${item.attempt_id}`}
                  onChange={() => onAnswer(opt.label)}
                  type="radio"
                  value={opt.label}
                />
                <AcademicMarkdown className="academic-md min-w-0 flex-1 text-sm" content={`**${opt.label}.** ${opt.text}`} />
              </label>
            );
          })}
        </div>
      ) : (
        <textarea
          className="w-full rounded-xl border border-border bg-background/80 p-3 text-sm outline-none transition-all focus:border-accent/60 focus:ring-2 focus:ring-accent/20 disabled:opacity-70"
          rows={4}
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder="Write your answer..."
          disabled={disabled}
        />
      )}
      {item.submitted && item.feedback && (
        <AcademicMarkdown className="academic-md rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-foreground" content={item.feedback} />
      )}
    </article>
  );
}
