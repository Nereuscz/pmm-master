import { getQuestionsForPhaseAndFramework } from "./anthropic";

export type GuideQuestion = {
  id: string;
  text: string;
  hint: string;
};

export function getQuestionsForPhase(
  phase: string,
  framework: "Univerzální" | "Produktový" = "Univerzální"
): GuideQuestion[] {
  const questions = getQuestionsForPhaseAndFramework(phase, framework);
  return questions.map((q, i) => ({
    id: `q_${i}`,
    text: q.name,
    hint: q.hint
  }));
}
