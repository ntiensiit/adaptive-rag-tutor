import { QUESTION_TYPE_OPTIONS, QuestionType } from "@/lib/api";

export function typeLabel(type: string) {
  const row = QUESTION_TYPE_OPTIONS.find((item) => item.id === type);
  const label = row?.label ?? type.replace(/_/g, " ");
  return label;
}

export function typesSummary(selected: QuestionType[]) {
  if (selected.length === 1) {
    const label = typeLabel(selected[0]);
    return label;
  }
  const text = `${selected.length} types selected`;
  return text;
}
