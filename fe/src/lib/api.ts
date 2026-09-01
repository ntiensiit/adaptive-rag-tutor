const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Citation = { source_file: string; topic: string; excerpt: string };

export type Student = { id: number; name: string };

export type Conversation = {
  id: number;
  course_id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};

export type PracticeSummary = {
  id: number;
  course_id: number;
  topic: string;
  title: string;
  created_at: string;
  submitted: boolean;
  correct: boolean | null;
};

export type PracticeDetail = {
  attempt_id: number;
  topic: string;
  question: string;
  student_answer: string | null;
  feedback: string | null;
  correct: boolean | null;
  submitted: boolean;
};

export type ChatMessage = {
  id: number;
  role: "student" | "tutor";
  content: string;
  action_type?: string;
  citations?: Citation[];
};

export type ChatResponse = {
  interaction_id: number;
  conversation_id: number;
  action_type: string;
  content: string;
  topic: string;
  citations: Citation[];
  integrity_flag: boolean;
};

export type Progress = {
  student_id: number;
  mastery: Record<string, number>;
  misconceptions: { topic: string; pattern: string; count: number }[];
  recent_interactions: {
    query: string;
    action_type: string;
    topic: string | null;
    integrity_flag: boolean;
  }[];
};

export type DayProgress = {
  date: string;
  avg_mastery: number | null;
  chats: number;
  exercises: number;
  exercises_correct: number;
};

export type ProgressTimeline = {
  student_id: number;
  year: number;
  month: number;
  topic: string | null;
  topic_mastery: number | null;
  days: DayProgress[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as T;
  return data;
}

export function listStudents() {
  return request<Student[]>("/students");
}

export function listConversations(studentId: number, courseId = 1) {
  return request<Conversation[]>(`/students/${studentId}/conversations?course_id=${courseId}`);
}

export function getConversationMessages(conversationId: number) {
  return request<ChatMessage[]>(`/conversations/${conversationId}/messages`);
}

export function listPractices(studentId: number, courseId = 1) {
  return request<PracticeSummary[]>(`/students/${studentId}/practices?course_id=${courseId}`);
}

export function getPracticeDetail(attemptId: number) {
  return request<PracticeDetail>(`/practices/${attemptId}`);
}

export function getProgress(studentId: number) {
  return request<Progress>(`/students/${studentId}/progress`);
}

export function getProgressTimeline(studentId: number, year: number, month: number, topic?: string | null) {
  const query = new URLSearchParams({ year: String(year), month: String(month) });
  if (topic) query.set("topic", topic);
  return request<ProgressTimeline>(`/students/${studentId}/progress/timeline?${query}`);
}

export function sendChat(studentId: number, courseId: number, message: string, conversationId?: number | null) {
  const body: Record<string, unknown> = { student_id: studentId, course_id: courseId, message };
  if (conversationId) body.conversation_id = conversationId;
  return request<ChatResponse>("/tutor/chat", { method: "POST", body: JSON.stringify(body) });
}

export function respondToTutor(interactionId: number, studentResponse: string) {
  return request<{ correct: boolean; feedback: string; misconception: string }>("/tutor/respond", {
    method: "POST",
    body: JSON.stringify({ interaction_id: interactionId, student_response: studentResponse }),
  });
}

export function getPractice(studentId: number, courseId: number) {
  return request<{ attempt_id: number; topic: string; question: string }>(
    `/tutor/practice/${studentId}?course_id=${courseId}`,
  );
}

export function submitPractice(attemptId: number, studentAnswer: string) {
  return request<{ correct: boolean; feedback: string }>(`/tutor/practice/${attemptId}/submit`, {
    method: "POST",
    body: JSON.stringify({ student_answer: studentAnswer, hints_used: 0 }),
  });
}
