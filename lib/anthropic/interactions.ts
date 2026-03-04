import { anthropic, withRetry, env } from "./client";
import { getQuestionsForPhaseAndFramework } from "./questions";

export async function generateClarifyingQuestions(input: {
  phase: string;
  framework: string;
  transcript: string;
  projectContext: string;
}): Promise<{ questions: string[] }> {
  if (!anthropic) return { questions: [] };
  const client = anthropic;

  const questions = getQuestionsForPhaseAndFramework(input.phase, input.framework);
  const questionNames = questions.map((q) => q.name).join(", ");

  const response = await withRetry(() =>
    client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 512,
      system: `Jsi PM asistent pro JIC. Přečti transkript schůzky a identifikuj maximálně 5 klíčových nejasností nebo chybějících informací důležitých pro PM dokumentaci.

Každou otázku formuluj přirozeně a lidsky – ne jako položku formuláře. Krátce vysvětli (v závorce nebo jednou větou navíc), PROČ se na danou věc ptáme a co nám pomůže zjistit. Tím pomáháš PM pochopit smysl otázky, ne jen mechanicky odpovídat.

Příklad špatně: "Uveďte indikátory úspěchu projektu."
Příklad dobře: "Jak poznáme, že to funguje? (Bez měřitelných indikátorů bude těžké obhájit pokračování projektu nebo vyhodnotit Gate.)"

Vrať POUZE číslovaný seznam max. 5 otázek. Žádný jiný text.`,
      messages: [
        {
          role: "user",
          content: `Framework: ${input.framework} | Fáze: ${input.phase}
Sledované oblasti: ${questionNames}
${input.projectContext ? `Kontext projektu: ${input.projectContext}\n` : ""}
Transkript:
${input.transcript}

Polož max. 5 doplňujících otázek k nejasným nebo chybějícím informacím:`
        }
      ]
    })
  );

  const text = response.content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");

  const lines = text
    .split("\n")
    .filter((l) => /^\d+[\.\)]/.test(l.trim()))
    .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(Boolean);

  return { questions: lines.length > 0 ? lines : [text.trim()].filter(Boolean) };
}

export async function generateFollowUpQuestions(input: {
  questionName: string;
  questionHint: string;
  userAnswer: string;
  framework: string;
  phase: string;
}): Promise<{ followUps: string[] }> {
  if (!anthropic) return { followUps: [] };
  const client = anthropic;

  const response = await withRetry(() =>
    client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 256,
      system: `Jsi PM coach pro JIC. Uživatel odpověděl na PM otázku a ty chceš prohloubit nebo upřesnit odpověď.

Vygeneruj přesně 3 doplňující otázky. Formuluj je konverzačně a přirozeně – jako byste si povídali, ne jako formulář. Každá otázka by měla logicky navazovat na to, co uživatel řekl, nebo otevírat úhel, který zůstal nezodpovězený.

Vrať POUZE číslovaný seznam 3 otázek. Žádný jiný text.`,
      messages: [
        {
          role: "user",
          content: `Framework: ${input.framework} | Fáze: ${input.phase}
Otázka: ${input.questionName} – ${input.questionHint}
Odpověď: ${input.userAnswer}

Vygeneruj 3 doplňující otázky:`
        }
      ]
    })
  );

  const text = response.content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");

  const lines = text
    .split("\n")
    .filter((l) => /^\d+[\.\)]/.test(l.trim()))
    .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return { followUps: lines };
}

export async function generateClarification(input: {
  questionName: string;
  questionHint: string;
  userText: string;
  framework: string;
  phase: string;
}): Promise<{ isClarification: boolean; explanation?: string }> {
  if (!anthropic) return { isClarification: false };
  const client = anthropic;

  const response = await withRetry(() =>
    client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 400,
      system: `Jsi PM coach v konverzačním průvodci pro JIC. Uživatel odpovídá na PM otázky.
Tvůj úkol: Rozhodni, zda uživatelův text je ŽÁDOST O VYSVĚTLENÍ otázky (nerozumí, ptá se co to znamená, říká "nevím", "nechápu" apod.), nebo SKUTEČNÁ ODPOVĚĎ na otázku (i neúplná nebo stručná).

Pokud jde o ŽÁDOST O VYSVĚTLENÍ:
- Vrať JSON: {"isClarification": true, "explanation": "..."}
- V explanation vysvětli otázku lidsky a přátelsky (2–4 věty): co konkrétně hledáme, proč je to pro PM důležité a jak to zapadá do kontextu JIC. Pak uveď jeden konkrétní příklad z praxe (např. "V praxi to může vypadat tak, že...").
- Klíčové pojmy JIC (Výstupy vs. Výsledky vs. Dopady, Gate review, Steering Board) vysvětli vždy, pokud jsou součástí otázky.

Pokud jde o SKUTEČNOU ODPOVĚĎ:
- Vrať JSON: {"isClarification": false}

Odpovídej POUZE validním JSON bez dalšího textu.`,
      messages: [
        {
          role: "user",
          content: `Framework: ${input.framework} | Fáze: ${input.phase}
Otázka: ${input.questionName} – ${input.questionHint}
Uživatelův text: "${input.userText}"`
        }
      ]
    })
  );

  const raw = response.content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();

  try {
    const parsed = JSON.parse(raw) as { isClarification: boolean; explanation?: string };
    return parsed;
  } catch {
    return { isClarification: false };
  }
}

export async function parsePromptForExtendedCanvas(input: {
  userText: string;
}): Promise<{ wantsCanvas: boolean; framework?: "Univerzální" | "Produktový"; phase?: string }> {
  if (!anthropic) {
    const t = input.userText.toLowerCase();
    const wantsCanvas =
      t.includes("rozšířen") ||
      t.includes("rozsirena") ||
      t.includes("canvas") ||
      t.includes("všechny otázky") ||
      t.includes("vsechny otazky");
    const framework: "Univerzální" | "Produktový" =
      t.includes("produktový") || t.includes("produktovy") ? "Produktový" : "Univerzální";
    return { wantsCanvas, framework };
  }
  const client = anthropic;

  const response = await withRetry(() =>
    client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 256,
      system: `Rozpoznej z uživatelova textu, zda žádá o "rozšířenou sadu PM otázek" (canvas se všemi otázkami a 3 doplňujícími u každé).
Pokud ano, extrahuj framework (Univerzální nebo Produktový) a volitelně fázi (Iniciace, Plánování, Realizace, Closing, Gate 1/2/3).
Vrať POUZE validní JSON: {"wantsCanvas": true|false, "framework": "Univerzální"|"Produktový", "phase": "Iniciace"|...}
Pokud framework není zmíněn, použij Produktový. Pokud fáze není zmíněna, použij Iniciace.`,
      messages: [{ role: "user", content: `Uživatel napsal: "${input.userText}"` }]
    })
  );

  const raw = response.content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();

  try {
    const parsed = JSON.parse(raw) as {
      wantsCanvas: boolean;
      framework?: "Univerzální" | "Produktový";
      phase?: string;
    };
    return {
      wantsCanvas: parsed.wantsCanvas ?? false,
      framework: parsed.framework ?? "Produktový",
      phase: parsed.phase ?? "Iniciace"
    };
  } catch {
    const t = input.userText.toLowerCase();
    const wantsCanvas =
      t.includes("rozšířen") ||
      t.includes("rozsirena") ||
      t.includes("canvas") ||
      t.includes("všechny otázky");
    const framework: "Univerzální" | "Produktový" =
      t.includes("produktový") || t.includes("produktovy") ? "Produktový" : "Univerzální";
    return { wantsCanvas, framework };
  }
}

export async function generateFollowUpsForCanvas(input: {
  questions: { name: string; hint: string }[];
  framework: string;
  phase: string;
  projectContext?: string;
}): Promise<{ questionName: string; followUps: string[] }[]> {
  if (!anthropic) {
    return input.questions.map((q) => ({
      questionName: q.name,
      followUps: [
        "Jak to konkrétně ovlivní projekt?",
        "Kdo je za to odpovědný?",
        "Jak to budeme měřit?"
      ]
    }));
  }
  const client = anthropic;

  const results: { questionName: string; followUps: string[] }[] = [];

  for (const q of input.questions) {
    const response = await withRetry(() =>
      client.messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 256,
        system: `Jsi PM coach. Pro danou základní PM otázku vygeneruj přesně 3 relevantní otevřené otázky, které mohou být kladeny pro upřesnění nebo vylepšení odpovědí dle kontextu projektu. Formuluj otázky přirozeně a konverzačně. Vrať POUZE číslovaný seznam 3 otázek (jedna věta každá). Žádný jiný text.`,
        messages: [
          {
            role: "user",
            content: `Framework: ${input.framework} | Fáze: ${input.phase}${input.projectContext ? `\nKontext projektu: ${input.projectContext}` : ""}
Základní otázka: ${q.name} – ${q.hint}

Vygeneruj 3 doplňující otázky pro upřesnění odpovědi:`
          }
        ]
      })
    );

    const text = response.content
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    const lines = text
      .split("\n")
      .filter((l) => /^\d+[\.\)]/.test(l.trim()))
      .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);

    results.push({
      questionName: q.name,
      followUps:
        lines.length >= 3
          ? lines
          : ["Jak to konkrétně ovlivní projekt?", "Kdo je za to odpovědný?", "Jak to budeme měřit?"]
    });
  }

  return results;
}
