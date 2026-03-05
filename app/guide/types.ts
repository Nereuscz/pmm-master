export type Project = { id: string; name: string; framework: string; phase: string };
export type Answer = { questionId: string; question: string; answer: string };
export type GuideQ = { id: string; text: string; hint: string; context?: string };

export type CanvasQuestion = {
  name: string;
  hint: string;
  context?: string;
  followUps: string[];
};

export type ChatMode = "idle" | "routing" | "guide" | "canvas";

export type ChatMsg =
  | { id: string; role: "ai"; kind: "greeting" }
  | { id: string; role: "ai"; kind: "question"; q: GuideQ }
  | { id: string; role: "ai"; kind: "thinking"; text: string }
  | { id: string; role: "ai"; kind: "clarification"; text: string }
  | { id: string; role: "ai"; kind: "followup"; questions: string[]; answers: Record<number, string>; submitted: boolean }
  | { id: string; role: "ai"; kind: "output"; content: string; sessionId?: string; projectId?: string; saved?: boolean }
  | { id: string; role: "ai"; kind: "canvas"; questions: CanvasQuestion[]; phase: string; framework: string }
  | { id: string; role: "ai"; kind: "error"; text: string }
  | { id: string; role: "user"; text: string; answerToQuestionId?: string };

export type Status =
  | "idle"
  | "loading_q"
  | "awaiting_answer"
  | "loading_clarify"
  | "loading_fu"
  | "awaiting_fu"
  | "done";

export type GuideDraft = {
  id: string;
  answers: Answer[];
  messages: ChatMsg[];
  uploaded_context?: string;
  updated_at: string;
};
