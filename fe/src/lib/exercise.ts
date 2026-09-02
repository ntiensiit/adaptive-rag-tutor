import { PracticeDetail } from "@/lib/api";

export function answersFromDetails(details: PracticeDetail[]) {
  const next: Record<number, string> = {};
  for (const item of details) next[item.attempt_id] = item.student_answer ?? "";
  const result = next;
  return result;
}

export function practiceLoadError(err: unknown) {
  if (err instanceof Error && err.name === "AbortError") return "Generation timed out. Try fewer questions.";
  if (err instanceof Error) return err.message;
  const result = "Failed to load practice exercise.";
  return result;
}

export function sessionStatusLabel(submitted: number, count: number, correct: number) {
  if (!submitted) return "Not started";
  if (submitted < count) return `${submitted}/${count} answered`;
  if (correct === count) return "All correct";
  const result = `${correct}/${count} correct`;
  return result;
}

export function canSubmitAll(details: PracticeDetail[], answers: Record<number, string>, submitting: boolean) {
  const pending = details.filter((row) => !row.submitted);
  if (!pending.length || submitting) return false;
  const ready = pending.every((row) => answers[row.attempt_id]?.trim());
  return ready;
}
