import { ChevronDown, Users } from "lucide-react";
import type { Student } from "@/lib/api";

type Props = {
  students: Student[];
  value: number;
  onChange: (id: number) => void;
};

export function StudentPicker({ students, value, onChange }: Props) {
  return (
    <label className="flex min-w-0 max-w-[11rem] items-center gap-1 rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 text-xs transition-colors hover:border-accent/40 focus-within:border-accent/50 sm:max-w-xs sm:text-sm">
      <Users className="h-3.5 w-3.5 shrink-0 text-accent" />
      <span className="relative min-w-0 flex-1">
        <select
          className="w-full cursor-pointer appearance-none truncate bg-transparent pr-6 text-foreground outline-none"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {students.map((s) => (
            <option key={s.id} value={s.id} className="bg-card text-foreground">
              {s.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-0 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}
