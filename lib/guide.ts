type GuideQuestion = {
  id: string;
  text: string;
};

const QUESTIONS: Record<string, GuideQuestion[]> = {
  Iniciace: [
    { id: "goal", text: "Jaký je hlavní cíl této fáze?" },
    { id: "stakeholders", text: "Kdo jsou klíčoví stakeholders a jejich role?" },
    { id: "risks", text: "Jaká hlavní rizika aktuálně vidíte?" }
  ],
  Plánování: [
    { id: "scope", text: "Jaký je finální scope a co je mimo scope?" },
    { id: "timeline", text: "Jaké jsou klíčové milníky a termíny?" },
    { id: "dependencies", text: "Jaké jsou závislosti a blokery?" }
  ],
  Realizace: [
    { id: "progress", text: "Jaký je aktuální stav plnění?" },
    { id: "issues", text: "Jaké problémy se objevily?" },
    { id: "next_steps", text: "Jaké jsou nejbližší další kroky?" }
  ],
  Closing: [
    { id: "results", text: "Jaké výsledky byly dosaženy?" },
    { id: "lessons", text: "Jaké lessons learned je vhodné zaznamenat?" },
    { id: "handover", text: "Jak proběhne předání a uzavření?" }
  ],
  "Gate 1": [{ id: "gate", text: "Splňuje projekt podmínky pro Gate 1?" }],
  "Gate 2": [{ id: "gate", text: "Splňuje projekt podmínky pro Gate 2?" }],
  "Gate 3": [{ id: "gate", text: "Splňuje projekt podmínky pro Gate 3?" }]
};

export function getQuestionsForPhase(phase: string): GuideQuestion[] {
  return QUESTIONS[phase] ?? QUESTIONS["Plánování"];
}
