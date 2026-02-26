import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

export const anthropic = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null;

// ─── Otázky dle frameworku a fáze ─────────────────────────────────────────────

type Question = { name: string; hint: string };

const UNIVERSAL: Record<string, Question[]> = {
  Iniciace: [
    { name: "Předmět", hint: "O čem to celé je? Co chceme reálně vytvořit?" },
    { name: "Kontext", hint: "Proč to děláme? Jak to zapadá do naší strategie a cílů?" },
    { name: "Stakeholdeři", hint: "Koho se to týká? Kdo má na výsledek vliv nebo o něm rozhoduje?" },
    { name: "Cíl", hint: "Co je cílem a co už cílem není? Rozumí si se stakeholdery v tom, co bude na konci?" },
    { name: "Indikátory úspěchu", hint: "Jak poznáme, že se cíl plní/naplnil?" },
    { name: "Prioritizace", hint: "Je to teď pro nás priorita? Nehoří nám něco důležitějšího?" },
    { name: "Poptávka", hint: "Kdo to chce? Koho to bude bolet, když tenhle projekt neuděláme?" }
  ],
  Plánování: [
    { name: "Role", hint: "Kdo a za co bude nést zodpovědnost? Kdo je PO, PM, TM?" },
    { name: "Plán", hint: "Co a kdy se bude dělat? (rozpad na konkrétní kroky)" },
    { name: "Milníky", hint: "Jaké jsou milníky projektu (dílčí cíle)?" },
    { name: "Rizika", hint: "Jaká jsou rizika realizace projektu? Kdo a jak rizika ošetří?" },
    { name: "Zdroje", hint: "Jaký je rozpočet projektu? Jaké kapacity lidí a prostředky jsou potřeba?" },
    { name: "Proveditelnost", hint: "Je projektový plán realistický a dosažitelný?" }
  ],
  Realizace: [
    { name: "Monitoring", hint: "Jak se nám daří dosahovat plánovaných milníků? Jsme tam, kde jsme chtěli být?" },
    { name: "Překážky", hint: "Jaké jsou překážky v projektovém plánu a jak (a kdo) je odstraňuje?" },
    { name: "Change management", hint: "Je cíl a rozsah projektu aktuální?" },
    { name: "Dosažení cíle", hint: "Jak moc/dobře jsme naplnili cíl projektu?" },
    { name: "Spokojenost stakeholderů", hint: "Jak jsou spokojeni stakeholdeři s výstupy/výsledky projektu?" }
  ],
  Closing: [
    { name: "Zhodnocení PM", hint: "Co jsme dokázali dělat dobře? Co nám v řízení projektu šlo dobře?" },
    { name: "Ponaučení", hint: "Co jsme se během projektu naučili? Co budeme dělat v příštím projektu lépe?" },
    { name: "Předání", hint: "Je projekt řádně předán do operativy? Má výsledek svého nového majitele?" }
  ]
};

const PRODUKTOVY: Record<string, Question[]> = {
  Iniciace: [
    { name: "Problém/Potřeba", hint: "Jaký konkrétní problém či potřebu produkt řeší? Máme ji potvrzenou od cílové skupiny?" },
    { name: "Hodnota produktu (Value Proposition)", hint: "Jakou konkrétní hodnotu produkt vytváří pro klienta?" },
    { name: "Cílovka", hint: "Pro koho je produkt primárně určen a jaké jsou vstupní předpoklady?" },
    { name: "Product Stakeholders", hint: "Kdo všechno má zájem na produktu a z jakého důvodu? S kým je potřeba konzultovat klíčová rozhodnutí (C)? Které stačí průběžně informovat (I)?" },
    { name: "Positioning (Market Fit)", hint: "Jakou hodnotu přináší produkt na trh a v čem se liší?" },
    { name: "Cíle JIC", hint: "Jak produkt přispívá k dlouhodobé strategii JIC a které KPIs naplňuje?" },
    { name: "Customer Journey (Portfolio)", hint: "Jak produkt zapadá mezi naše stávající produkty a služby?" },
    { name: "Výstupy", hint: "Co hmatatelného z aktivit produktu vznikne? Jak budeme měřit doručení těchto částí?" },
    { name: "Výsledky", hint: "Jakou změnu v chování, dovednostech či postojích klienta chceme vyvolat? Jak to budeme měřit/detekovat?" }
  ],
  Plánování: [
    { name: "Aktivity", hint: "Jak produkt technicky doručíme? Z čeho se skládá (formát, délka, kapacita)?" },
    { name: "Role (Product Team)", hint: "Kdo produkt doručí? Kdo je PO, PM, TM a další role?" },
    { name: "Timeline a milníky", hint: "Jaký je časový plán realizace? Klíčové body pro ověření." },
    { name: "Náklady (Kapacity lidí)", hint: "Kolik interního času lidí bude na realizaci potřeba?" },
    { name: "Náklady (Služby a nákupy)", hint: "Jaké externí služby nebo nákupy jsou nezbytné?" },
    { name: "Výnosy (Business Model)", hint: "Jak vypadá model financování? Očekávaná monetizace/přínos." },
    { name: "Vstupy", hint: "Jaké vstupy (znalosti, data, licence, partneři) jsou potřeba?" },
    { name: "Customer Journey (Akvizice)", hint: "Jak se o nás klient dozví a jak ho přesvědčíme?" }
  ],
  Realizace: [
    { name: "Dosažení cíle", hint: "Jak moc/dobře jsme naplnili cíl projektu?" },
    { name: "Spokojenost stakeholderů", hint: "Jak jsou spokojeni stakeholdeři s výsledky?" },
    { name: "Zpětná vazba", hint: "Jaký je reálný feedback od klientů? Co změnit v designu?" },
    { name: "Výstupy", hint: "Byly doručeny všechny části? Co hmatatelného vzniklo? Jak to měříme?" },
    { name: "Výsledky", hint: "Jakou změnu v chování či dovednostech u klienta pozorujeme?" },
    { name: "Monitoring", hint: "Jak se nám daří dosahovat plánovaných milníků?" },
    { name: "Překážky", hint: "Jaké jsou překážky v projektovém plánu a jak (a kdo) je odstraňuje?" },
    { name: "Opakovatelnost/Škálovatelnost", hint: "Je produkt v této podobě opakovatelný jiným týmem?" }
  ],
  Closing: [
    { name: "Zhodnocení PM", hint: "Co jsme dokázali dělat dobře? Co v řízení fungovalo?" },
    { name: "Ponaučení", hint: "Co jsme se naučili? Co uděláme příště lépe?" },
    { name: "Dopady", hint: "Jaký je širší systémový dopad na trh, region nebo ekosystém JIC?" },
    { name: "Finální Canvas", hint: "Odpovídá vyplněný Product Canvas realitě? Jsou náklady a role aktuální?" }
  ]
};

export function getQuestionsForPhaseAndFramework(
  phase: string,
  framework: string
): Question[] {
  const map = framework === "Produktový" ? PRODUKTOVY : UNIVERSAL;
  return map[phase] ?? map["Iniciace"] ?? [];
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Jsi PM Assistant pro JIC (Jihomoravské inovační centrum). Zpracováváš transkript schůzky a transformuješ ho do strukturované PM dokumentace připravené pro Asana.

═══════════════════════════════
PRAVIDLO 1 – POUZE RELEVANTNÍ SEKCE
═══════════════════════════════
Sekci zařaď JEDINĚ tehdy, když transkript obsahuje konkrétní informaci k danému tématu.
- Sekce bez dat VYNECH úplně – nezapisuj prázdné sekce, nadpisy bez obsahu, ani placeholder text ("Nezmíněno", "Bude upřesněno" apod.).
- Pokud téma zaznělo pouze okrajově nebo nepřímo, napiš stručně (1–2 věty) a doplň značku [Upřesnit].
- NEZAPLŇUJ výstup vymyšlenými nebo odhadovanými informacemi.

═══════════════════════════════
PRAVIDLO 2 – RACI (sekce Stakeholdeři / Role)
═══════════════════════════════
Kategorizuj KAŽDOU konkrétní osobu nebo roli zmíněnou v transkriptu do RACI tabulky:
  - **R – Responsible**: Kdo fyzicky vykonává práci / aktivitu
  - **A – Accountable**: Kdo nese konečnou odpovědnost za výsledek (schvaluje, podepisuje)
  - **C – Consulted**: Koho je nutné před rozhodnutím konzultovat (obousměrná komunikace)
  - **I – Informed**: Kdo musí být o výsledku/postupu informován (jednosměrná komunikace)

Požadovaný formát výstupu RACI:
**R:** [Jméno / Role] – [stručný popis co dělá]
**A:** [Jméno / Role] – [za co odpovídá]
**C:** [Jméno / Role] – [v jaké věci se konzultuje]
**I:** [Jméno / Role] – [o čem se informuje]

Pravidla:
- Jedna osoba může být ve více kategoriích (uveď ji pak v každé zvlášť).
- Pokud transkript žádná jména ani konkrétní role neobsahuje, napiš:
  *RACI nebylo možné sestavit – transkript neobsahuje konkrétní jména ani role. Doplňte ručně.*
- Neodhaduj ani nevymýšlej role, které transkript nezmiňuje.

═══════════════════════════════
PRAVIDLO 3 – DVOJÍ VRSTVA (pouze Produktový framework)
═══════════════════════════════
Každá produktová sekce může mít DVĚ vrstvy. Zařaď je POUZE pokud daná informace v transkriptu existuje:

Vrstva 1 – Popis produktu (vždy jako hlavní text):
Čistý, trvalý popis toho, jak produkt nebo funkce vypadá/funguje. Píše se bez kontextu, jako by čtenář neznal historii projektu.

Vrstva 2 – PM Kontext (pouze pokud existuje historický/politický/přechodový důvod):
Dočasná informace vysvětlující PROČ (přechod z jiného systému, fúze organizací, politické tlaky, technický dluh apod.).
Vždy formátuj takto jako samostatný odstavec bezprostředně po Vrstvě 1:
*PM Kontext: [vysvětlení dočasné situace a její příčiny]*

Pokud v transkriptu není žádný historický/politický kontext, Vrstvu 2 VYNECH úplně.

═══════════════════════════════
FORMÁTOVÁNÍ (Asana-ready)
═══════════════════════════════
- Záhlaví sekce: ### 🟨 **Název**: Návodná otázka v regular
- Text: Přímé odpovědi, žádná vata. Odrážky (-) a **tučné** zvýraznění klíčových termínů.
- PM Kontext vždy kurzívou: *PM Kontext: ...*
- Žádné prázdné sekce, žádné opakování nadpisů bez obsahu.

═══════════════════════════════
NA KONCI výstupu vždy přidej:
═══════════════════════════════
---
💡 **Návrhy na zlepšení instrukcí:**
- [1–2 konkrétní návrhy jak vylepšit zpracování na základě tohoto transkriptu]

Tón: Profesionální, exekutivní, analytický. Jazyk JIC.`;

// ─── Hlavní funkce ─────────────────────────────────────────────────────────────

export async function generateStructuredOutput(input: {
  phase: string;
  framework: string;
  transcript: string;
  projectContext: string;
  ragContext: string[];
}) {
  if (!anthropic) {
    return {
      content:
        "⚠️ ANTHROPIC_API_KEY není nastaven. Toto je fallback výstup pro lokální development bez AI."
    };
  }

  const questions = getQuestionsForPhaseAndFramework(input.phase, input.framework);
  const questionsList = questions
    .map((q) => `- **${q.name}**: ${q.hint}`)
    .join("\n");

  const parts: string[] = [
    `**Framework:** ${input.framework}`,
    `**Fáze:** ${input.phase}`
  ];

  if (input.projectContext?.trim()) {
    parts.push(`**Projektový kontext (z předchozích schůzek):**\n${input.projectContext}`);
  }

  if (input.ragContext.length > 0) {
    parts.push(
      `**Relevantní znalostní báze:**\n${input.ragContext.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
    );
  }

  parts.push(
    `**Otázky pro fázi ${input.phase} – ${input.framework} framework:**\n${questionsList}`
  );

  parts.push(`**Transkript:**\n${input.transcript}`);

  // Strukturální self-check – AI ho musí vyplnit před 💡 sekcí
  const selfCheckItems = questions.map((q) => `- ${q.name}`).join("\n");
  parts.push(
    `Vygeneruj Asana-ready výstup. Pro každou sekci použij přesné formátování:\n### 🟨 **Název sekce**: Návodná otázka\nObsah sekce...

POVINNÝ SELF-CHECK: Na konci dokumentu (těsně PŘED blokem 💡 Návrhy) vlož tento blok:
---
✔ **Kontrolní seznam sekcí:**
${selfCheckItems}
Pro každou oblast uveď: ✅ sekce zahrnuta | ❌ data v transkriptu chybí
Formát: - **Název**: ✅/❌ [1 větou proč chybí, pokud ❌]
DŮLEŽITÉ: Pokud máš oblast označenou ✅ ale sekci jsi ve výstupu nevygeneroval, DOPLŇ ji před tímto self-checkem.`
  );

  const userPrompt = parts.join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }]
  });

  const text = response.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");

  return { content: text || "AI nevrátila textový obsah." };
}

// ─── Doplňující otázky před zpracováním transkriptu ────────────────────────────

export async function generateClarifyingQuestions(input: {
  phase: string;
  framework: string;
  transcript: string;
  projectContext: string;
}): Promise<{ questions: string[] }> {
  if (!anthropic) return { questions: [] };

  const questions = getQuestionsForPhaseAndFramework(input.phase, input.framework);
  const questionNames = questions.map((q) => q.name).join(", ");

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 512,
    system: `Jsi PM asistent. Přečti transkript schůzky a identifikuj maximálně 5 klíčových nejasností nebo chybějících informací, které jsou nutné pro kvalitní PM dokumentaci ve zvolené fázi. Vrať POUZE číslovaný seznam stručných otázek (jedna věta každá). Žádný jiný text.`,
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
  });

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

// ─── Follow-up otázky průvodce ─────────────────────────────────────────────────

export async function generateFollowUpQuestions(input: {
  questionName: string;
  questionHint: string;
  userAnswer: string;
  framework: string;
  phase: string;
}): Promise<{ followUps: string[] }> {
  if (!anthropic) return { followUps: [] };

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 256,
    system: `Jsi PM coach. Na základě odpovědi uživatele vygeneruj přesně 3 krátké doplňující otázky, které prohloubí nebo upřesní odpověď pro PM dokumentaci. Vrať POUZE číslovaný seznam 3 otázek (jedna věta každá). Žádný jiný text.`,
    messages: [
      {
        role: "user",
        content: `Framework: ${input.framework} | Fáze: ${input.phase}
Otázka: ${input.questionName} – ${input.questionHint}
Odpověď: ${input.userAnswer}

Vygeneruj 3 doplňující otázky:`
      }
    ]
  });

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
