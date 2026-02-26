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

PRAVIDLA PRO OBSAH:

1. Zahrň pouze sekce, pro které existují relevantní informace v transkriptu. Nevymýšlej informace, které ve transkriptu nejsou.

2. Dvojí vrstva informací (pouze Produktový framework):
   - Popis produktu: Čistý, trvalý popis nové podoby nebo vlastnosti produktu.
   - PM Kontext: Dočasná informace vysvětlující proč (historie, fúze, politické důvody). Piš kurzívou jako samostatný odstavec pod hlavní odpovědí.

3. Stakeholdeři – RACI: Automaticky kategorizuj identifikované osoby:
   - R (Responsible) – kdo vykonává práci
   - A (Accountable) – kdo nese odpovědnost za výsledek
   - C (Consulted) – koho je třeba konzultovat
   - I (Informed) – kdo musí být informován

FORMÁTOVÁNÍ (Asana-ready):
- Záhlaví sekce: ### 🟨 **Název**: Návodná otázka v regular
- Text: Přímé odpovědi, žádná vata. Používej odrážky (-) a **tučné** zvýraznění klíčových termínů JIC.
- PM Kontext vždy kurzívou jako samostatný odstavec: *Kurzíva.*

NA KONCI výstupu vždy přidej blok:
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

  parts.push(
    `Vygeneruj Asana-ready výstup. Pro každou sekci použij přesné formátování:\n### 🟨 **Název sekce**: Návodná otázka\nObsah sekce...`
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
