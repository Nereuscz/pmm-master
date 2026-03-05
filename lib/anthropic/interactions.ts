import { anthropic, withRetry, env } from "./client";
import { getQuestionsForPhaseAndFramework } from "./questions";
import { GUIDE_SYSTEM_CONTEXT } from "./prompts";

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
      system: `${GUIDE_SYSTEM_CONTEXT}

Přečti transkript schůzky a identifikuj maximálně 5 klíčových nejasností nebo chybějících informací důležitých pro PM dokumentaci.

Každou otázku formuluj přirozeně a lidsky – ne jako položku formuláře. Krátce vysvětli (v závorce nebo jednou větou navíc), PROČ se na danou věc ptáme a co nám pomůže zjistit. Tím pomáháš PM pochopit smysl otázky, ne jen mechanicky odpovídat.

Příklad špatně: "Uveďte indikátory úspěchu projektu."
Příklad dobře: "Jak poznáme, že to funguje? (Bez měřitelných indikátorů bude těžké obhájit pokračování projektu nebo vyhodnotit Gate.)"

Dávej pozor na: chybějící RACI (kdo konzultovat vs. kdo informovat), záměnu Výstupů/Výsledků/Dopadů, nejasný vztah k portfoliu JIC, neidentifikovaná rizika nebo otevřená dilemata.

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
      system: `${GUIDE_SYSTEM_CONTEXT}

Uživatel odpověděl na PM otázku a chceš prohloubit nebo upřesnit odpověď.

Vygeneruj přesně 3 doplňující otázky. Formuluj je konverzačně a přirozeně – jako byste si povídali, ne jako formulář. Každá otázka by měla logicky navazovat na to, co uživatel řekl, nebo otevírat úhel, který zůstal nezodpovězený.

Kde je to relevantní, zaměř se na: konkrétní měřitelnost (jak to poznáme?), RACI (kdo konkrétně?), rizika a závislosti, rozdíl Výstupů vs. Výsledků.

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
      system: `${GUIDE_SYSTEM_CONTEXT}

Uživatel odpovídá na PM otázky v průvodci.
Tvůj úkol: Rozhodni, zda uživatelův text je ŽÁDOST O VYSVĚTLENÍ otázky (nerozumí, ptá se co to znamená, říká "nevím", "nechápu" apod.), nebo SKUTEČNÁ ODPOVĚĎ na otázku (i neúplná nebo stručná).

Pokud jde o ŽÁDOST O VYSVĚTLENÍ:
- Vrať JSON: {"isClarification": true, "explanation": "..."}
- V explanation vysvětli otázku lidsky a přátelsky (2–4 věty): co konkrétně hledáme, proč je to pro PM důležité a jak to zapadá do kontextu JIC. Pak uveď jeden konkrétní příklad z praxe JIC (např. "V praxi to může vypadat tak, že...").
- Klíčové pojmy JIC (Výstupy vs. Výsledky vs. Dopady, Gate review, Steering Board, RACI C vs. I) vysvětli vždy, pokud jsou součástí otázky.

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
        system: `${GUIDE_SYSTEM_CONTEXT}

Pro danou základní PM otázku vygeneruj přesně 3 relevantní otevřené otázky, které mohou být kladeny pro upřesnění nebo vylepšení odpovědí dle kontextu projektu. Formuluj otázky přirozeně a konverzačně. Kde je to relevantní, zaměř se na měřitelnost, RACI (C vs. I), rizika, rozdíl Výstupů vs. Výsledků nebo vazbu na strategii JIC. Vrať POUZE číslovaný seznam 3 otázek (jedna věta každá). Žádný jiný text.`,
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

export async function elaborateCanvasSection(input: {
  sectionId: string;
  questionName: string;
  questionHint: string;
  currentContent: string;
  selectedText?: string;
  userPrompt?: string;
  projectContext?: string;
  uploadedContext?: string;
  framework: string;
  phase: string;
}): Promise<{ content: string }> {
  if (!anthropic) return { content: input.selectedText ? input.selectedText : input.currentContent };
  const client = anthropic;

  const hasSelection = (input.selectedText?.trim() ?? "").length > 0;
  const prompt =
    input.userPrompt?.trim() ||
    (hasSelection
      ? "Doplň a upřesni vybranou část – zachovej kontext, rozšiř o relevantní detaily."
      : "Doplň a upřesni tuto sekci v kontextu projektu – zachovej strukturu, rozšiř o relevantní detaily.");

  const systemPrompt = hasSelection
    ? `${GUIDE_SYSTEM_CONTEXT}

Uživatel vybral v PM canvasu konkrétní část textu a chce ji doplnit nebo přegenerovat.

Tvůj úkol: Na základě vybraného textu a kontextu vygeneruj POUZE náhradu za vybranou část – ne celou sekci. Zachovej tón a smysl, rozšiř o relevantní detaily. Dodržuj JIC terminologii (Výstupy/Výsledky/Dopady), RACI pravidla a případně dvojí vrstvu (Popis produktu + PM Kontext kurzívou). Vrať POUZE výsledný text náhrady – žádné úvody, žádné vysvětlení, žádný okolní text.`
    : `${GUIDE_SYSTEM_CONTEXT}

Uživatel má v PM canvasu sekci odpovědi na otázku a chce ji doplnit nebo přegenerovat.

Tvůj úkol: Na základě aktuálního obsahu a uživatelova požadavku vygeneruj vylepšenou verzi textu. Zachovej tón a strukturu, rozšiř o relevantní detaily, upřesni formulace. Dodržuj JIC terminologii a pravidla: Výstupy vs. Výsledky vs. Dopady, RACI (C vs. I), dvojí vrstva u Produktového frameworku, analytické rozlišení uživatele vs. platící zákazník pokud relevantní. Vrať POUZE výsledný text – žádné úvody, žádné vysvětlení.`;

  const contextParts: string[] = [];
  if (input.projectContext?.trim()) contextParts.push(`Kontext projektu: ${input.projectContext}`);
  if (input.uploadedContext?.trim()) contextParts.push(`Dodatečný kontext z nahraných souborů:\n${input.uploadedContext.slice(0, 15000)}`);
  const contextBlock = contextParts.length > 0 ? contextParts.join("\n\n") + "\n\n" : "";

  const userContent = hasSelection
    ? `Framework: ${input.framework} | Fáze: ${input.phase}

${contextBlock}Otázka: ${input.questionName} – ${input.questionHint}

Celý obsah sekce (pro kontext):
${input.currentContent}

Vybraná část k úpravě:
"${input.selectedText}"

Uživatelův požadavek: ${prompt}

Vygeneruj POUZE náhradu za vybranou část (ne celou sekci):`
    : `Framework: ${input.framework} | Fáze: ${input.phase}

${contextBlock}Otázka: ${input.questionName} – ${input.questionHint}

Aktuální obsah sekce:
${input.currentContent}

Uživatelův požadavek: ${prompt}

Vygeneruj vylepšený text sekce:`;

  const response = await withRetry(() =>
    client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: hasSelection ? 512 : 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }]
    })
  );

  const text = response.content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();

  return {
    content: text || (hasSelection ? input.selectedText! : input.currentContent)
  };
}

export type ExtractedAnswer = { questionId: string; answer: string };

export type CanvasSpecialSections = {
  kDoreseni: string[];
  otevrenaDialemata?: string;
  kulturniBariety?: string;
  grantoveTerminy?: string;
};

export async function generateCanvasSpecialSections(input: {
  transcript: string;
  answers: ExtractedAnswer[];
  questions: { id: string; text: string }[];
  phase: string;
  framework: string;
}): Promise<CanvasSpecialSections> {
  const unanswered = input.answers
    .filter((a) => !a.answer || a.answer.includes("Zatím nevyjasněno"))
    .map((a) => {
      const q = input.questions.find((q) => q.id === a.questionId);
      return q ? q.text : null;
    })
    .filter(Boolean) as string[];

  if (!anthropic) return { kDoreseni: unanswered };
  const client = anthropic;

  const response = await withRetry(() =>
    client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: `${GUIDE_SYSTEM_CONTEXT}

Analyzuj kontext projektu a identifikuj speciální situace. Vrať POUZE validní JSON bez dalšího textu.

Formát výstupu:
{
  "dalsiKDoreseni": ["Otázka nebo bod 1", ...],
  "otevrenaDialemata": "markdown text nebo null",
  "kulturniBariety": "markdown text nebo null",
  "grantoveTerminy": "markdown text nebo null"
}

Pravidla:
- dalsiKDoreseni: seznam DALŠÍCH otevřených bodů nebo klíčových nejasností z kontextu, které PM musí dořešit před dalším Gatem (nad rámec nezodpovězených otázek). Pokud nejsou žádné, vrať prázdné pole [].
- otevrenaDialemata: pokud v kontextu existuje neshoda, nevyřešený spor nebo otevřené dilema (zákazník vs. uživatel, pricing, rozsah, strategická volba). Stručně pojmenuj každé dilema. Jinak null.
- kulturniBariety: pokud detektor odpor k nové terminologii, devalvaci rolí nebo silné emoce plynoucí z organizační změny. Popiš konkrétní bariéru a doporučení pro komunikaci. Jinak null.
- grantoveTerminy: pokud zmínka o grantovém financování, reportingových termínech nebo milnících vázaných na čerpání – vypíše klíčová data a podmínky jako odrážky. Jinak null.`,
      messages: [
        {
          role: "user",
          content: `Framework: ${input.framework} | Fáze: ${input.phase}

Kontext/Transkript:
${input.transcript.slice(0, 6000)}

Vrať JSON s analýzou speciálních situací:`
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
    const parsed = JSON.parse(raw) as {
      dalsiKDoreseni?: string[];
      otevrenaDialemata?: string | null;
      kulturniBariety?: string | null;
      grantoveTerminy?: string | null;
    };
    return {
      kDoreseni: [...unanswered, ...(parsed.dalsiKDoreseni ?? [])],
      otevrenaDialemata: parsed.otevrenaDialemata ?? undefined,
      kulturniBariety: parsed.kulturniBariety ?? undefined,
      grantoveTerminy: parsed.grantoveTerminy ?? undefined
    };
  } catch {
    return { kDoreseni: unanswered };
  }
}

export async function extractAnswersFromContext(input: {
  transcript: string;
  questions: { id: string; text: string; hint: string }[];
  phase: string;
  framework: string;
}): Promise<{ answers: ExtractedAnswer[]; specialSections?: CanvasSpecialSections }> {
  if (!anthropic) return { answers: [] };
  const client = anthropic;

  const questionsBlock = input.questions
    .map((q) => `- ${q.id}: ${q.text} (${q.hint})`)
    .join("\n");

  const response = await withRetry(() =>
    client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 2048,
      system: `${GUIDE_SYSTEM_CONTEXT}

Dostaneš text z nahrané nahrávky nebo přílohy (transkript schůzky, dokument) a seznam PM otázek.

Tvůj úkol: Pro každou otázku vyhledej v kontextu relevantní informace a vygeneruj stručnou odpověď. Pokud v kontextu není nic relevantního pro danou otázku, vrať přesně tento text: "Zatím nevyjasněno / Chybí data".

Formát výstupu: POUZE validní JSON objekt, kde klíče jsou questionId (např. q_0, q_1) a hodnoty jsou odpovědi. Příklad:
{"q_0": "Odpověď na první otázku.", "q_1": "Zatím nevyjasněno / Chybí data", "q_2": "Další odpověď."}

Dodržuj JIC terminologii: Výstupy ≠ Výsledky ≠ Dopady. RACI: C = konzultovat před rozhodnutím, I = informovat po rozhodnutí.
Žádný jiný text, žádné úvody.`,
      messages: [
        {
          role: "user",
          content: `Framework: ${input.framework} | Fáze: ${input.phase}

Otázky (id, text, hint):
${questionsBlock}

Kontext z nahraného souboru:
${input.transcript.slice(0, 80000)}

Vrať JSON s odpověďmi pro každou otázku:`
        }
      ]
    })
  );

  const raw = response.content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();

  let answers: ExtractedAnswer[] = [];
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    answers = input.questions.map((q) => ({
      questionId: q.id,
      answer: typeof parsed[q.id] === "string" ? String(parsed[q.id]).trim() : "Zatím nevyjasněno / Chybí data"
    }));
  } catch {
    return { answers: [] };
  }

  const specialSections = await generateCanvasSpecialSections({
    transcript: input.transcript,
    answers,
    questions: input.questions.map((q) => ({ id: q.id, text: q.text })),
    phase: input.phase,
    framework: input.framework
  });

  return { answers, specialSections };
}
