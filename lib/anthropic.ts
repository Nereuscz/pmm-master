import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

/** Retry Anthropic API calls on 429/timeout. Spec §10.1: max 2 retries, exponential backoff. */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const status = e && typeof e === "object" && "status" in e ? (e as { status?: number }).status : undefined;
      const msg = e instanceof Error ? e.message : "";
      const isRetryable =
        status === 429 ||
        msg.includes("timeout") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT");
      if (!isRetryable || attempt === maxRetries) throw e;
      const delayMs = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

export const anthropic = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null;

// ─── Otázky dle frameworku a fáze ─────────────────────────────────────────────

type Question = { name: string; hint: string; context?: string };

// Sdílené Gate otázky – stejná sada pro oba frameworky, Gate rozlišujeme tématicky
const GATE_QUESTIONS: Record<string, Question[]> = {
  "Gate 1": [
    {
      name: "Připravenost k posunu",
      hint: "Jsou splněny podmínky pro přechod z Iniciace do Plánování? Co ještě chybí?",
      context: "Gate 1 je první rozhodovací bod v JIC procesu – Steering Board na základě tohoto podkladu rozhoduje, zda má iniciativa dostatek jasnosti a strategické váhy, aby dostala zdroje na plánování. Nestačí nadšení, potřebujeme fakta."
    },
    {
      name: "Validace problému",
      hint: "Je problém nebo potřeba dostatečně ověřena? Mluvili jsme s cílovou skupinou?",
      context: "Častá past: přejdeme rovnou k řešení, aniž bychom potvrdili, že problém reálně existuje. Gate 1 je správný moment to zkontrolovat – zpětně je to dražší."
    },
    {
      name: "Strategické zasazení",
      hint: "Jak iniciativa přispívá ke strategii JIC? Která priorita nebo KPI ji podporuje?",
      context: "Steering Board posuzuje nejen smysluplnost iniciativy, ale i to, zda zapadá do celkového portfolia JIC. Každý projekt soutěží o omezené zdroje – strategické zasazení je klíčový argument."
    },
    {
      name: "Zdroje na plánování",
      hint: "Máme kapacity (lidi, čas, rozpočet) na to, abychom mohli iniciativu řádně naplánovat?",
      context: "Schválení Gate 1 neznamená automatický závazek realizovat – znamená, že dostaneme zdroje na přípravu plánu. Je důležité být realistický v tom, co plánování vyžaduje."
    },
    {
      name: "Klíčová rizika a nejasnosti",
      hint: "Co jsou největší otazníky, které musíme v plánování zodpovědět? Co by mohlo iniciativu zastavit?",
      context: "Otevřenost k rizikům na Gate 1 je silnou stránkou, ne slabinou. Steering Board ocení, když víme, co nevíme – a máme plán, jak to zjistit."
    },
    {
      name: "Doporučení pro Steering Board",
      hint: "Jak tým doporučuje rozhodnout? Jaké jsou podmínky pro postup nebo zamítnutí?",
      context: "Gate výstup není jen informační dokument – je to podklad pro rozhodnutí. Čím jasněji formulujeme doporučení a podmínky, tím snazší je rozhodnutí Steering Boardu."
    }
  ],
  "Gate 2": [
    {
      name: "Schválení plánu",
      hint: "Je plán realizace schválen klíčovými stakeholdery? Jsou všichni alignováni na rozsah a cíle?",
      context: "Gate 2 je přechod z Plánování do Realizace. Steering Board ověřuje, zda má tým solidní plán a zda jsou zdroje skutečně zajištěny – ne jen slíbeny. Je to poslední brzda před spuštěním."
    },
    {
      name: "Přidělení zdrojů",
      hint: "Jsou lidé, rozpočet a ostatní zdroje formálně přiděleny? Nebo jde stále o přísliby?",
      context: "Rozdíl mezi 'máme to v plánu' a 'máme to v kalendářích a tabulkách' bývá klíčový. Gate 2 je příležitost tento rozdíl odkrýt dřív, než projekt narazí na prázdno."
    },
    {
      name: "Ošetření klíčových rizik",
      hint: "Jak jsme adresovali rizika identifikovaná na Gate 1? Co zůstává otevřené a jak to sledujeme?",
      context: "Rizika nezmizí tím, že je ignorujeme. Steering Board chce vidět, že jsme s riziky aktivně pracovali a máme mitigation plán – nebo alespoň vědomé rozhodnutí je akceptovat."
    },
    {
      name: "Připravenost týmu",
      hint: "Ví tým, co a kdy má dělat? Je onboarding hotový, jsou jasné role a odpovědnosti?",
      context: "Začátek realizace bývá chaotický, pokud tým není připraven. Tato otázka pomáhá odhalit, zda je plán na papíře, nebo opravdu žije v hlavách lidí, kteří ho budou realizovat."
    },
    {
      name: "Podmínky pro schválení",
      hint: "Jaké jsou minimální podmínky, které musí být splněny, aby Steering Board schválil postup?",
      context: "Explicitní podmínky schválení chrání obě strany – tým ví, co se od něj čeká, a Steering Board má jasný rámec pro rozhodnutí."
    },
    {
      name: "Doporučení pro Steering Board",
      hint: "Jak tým doporučuje rozhodnout? Schválit, podmíněně schválit, nebo vrátit do plánování?",
      context: "Tým, který přijde s jasným doporučením a odůvodněním, signalizuje zralost a připravenost. Nerozhodné podklady ztěžují i rozhodnutí Steering Boardu."
    }
  ],
  "Gate 3": [
    {
      name: "Naplnění cílů",
      hint: "Do jaké míry byly splněny cíle stanovené na začátku? Co se podařilo a co ne?",
      context: "Gate 3 je uzavírací bod – Steering Board posuzuje, zda projekt splnil, co slíbil, a zda je připraven formálně skončit nebo přejít do provozního módu. Je to také moment pro úprimnou evaluaci."
    },
    {
      name: "Předání výstupů",
      hint: "Jsou výstupy projektu řádně předány? Má každý výsledek svého nového 'majitele'?",
      context: "Projekt bez jasného předání nemá konec – přetahuje se donekonečna nebo tiše umírá. Gate 3 formalizuje, že výstupy existují, jsou dokumentovány a mají provozního garanta."
    },
    {
      name: "Spokojenost stakeholderů",
      hint: "Jak hodnotí výsledky klíčoví stakeholdeři a klienti? Měli jsme formální zpětnou vazbu?",
      context: "Interní hodnocení není dostatečné – potřebujeme hlas těch, pro koho jsme projekt dělali. Feedback v tomto momentě je cenný i pro budoucí projekty."
    },
    {
      name: "Ponaučení (Lessons Learned)",
      hint: "Co bychom příště udělali jinak? Jaké jsou 2–3 klíčové věci, které stojí za zachování nebo změnu?",
      context: "Lessons learned není sebekritika – je to investice do budoucích projektů. JIC sbírá tyto poznatky systematicky, aby neopakoval stejné chyby a stavěl na fungujících vzorech."
    },
    {
      name: "Doporučení k uzavření",
      hint: "Je projekt připraven k formálnímu uzavření? Nebo zbývají otevřené body, které je třeba vyřešit?",
      context: "Formální uzavření projektu (sign-off) je důležité nejen administrativně, ale i psychologicky – tým může věnovat energii novým věcem a projekt dostane svůj konec v historii JIC."
    }
  ]
};

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
  ],
  "Gate 1": GATE_QUESTIONS["Gate 1"],
  "Gate 2": GATE_QUESTIONS["Gate 2"],
  "Gate 3": GATE_QUESTIONS["Gate 3"]
};

const PRODUKTOVY: Record<string, Question[]> = {
  Iniciace: [
    { name: "Problém/Potřeba", hint: "Jaký konkrétní problém či potřebu produkt řeší? Máme ji potvrzenou od cílové skupiny?" },
    {
      name: "Hodnota produktu (Value Proposition)",
      hint: "Jakou konkrétní hodnotu produkt vytváří pro klienta?",
      context: "Value proposition odpovídá na otázku: proč by si zákazník vybral právě tento produkt? Nestačí říct 'pomáháme firmám růst' – hledáme konkrétní přínos, který alternativy nenabídnou. Je to základ, od kterého se odvíjí design i komunikace produktu."
    },
    { name: "Cílovka", hint: "Pro koho je produkt primárně určen a jaké jsou vstupní předpoklady?" },
    { name: "Product Stakeholders", hint: "Kdo všechno má zájem na produktu a z jakého důvodu (strategické zadání, rozpočet, odbornost, supportní služby, koordinace s jinými produkty aj.)? S kým z nich je potřeba předem konzultovat klíčová rozhodnutí? (C - Consulted) Které z nich stačí průběžně informovat? (I - Informed)" },
    {
      name: "Positioning (Market Fit)",
      hint: "Jakou hodnotu přináší produkt na trh a v čem se liší?",
      context: "Market fit ukazuje, zda produkt řeší reálný problém na trhu, kde existuje dostatečná poptávka a JIC má šanci zaujmout unikátní pozici. Pomáhá odhalit přeplněné segmenty vs. nepokrytá místa – a vyhnout se tomu, že vytvoříme něco, co už dělá někdo jiný lépe."
    },
    {
      name: "Cíle JIC",
      hint: "Jak produkt přispívá k dlouhodobé strategii JIC a které KPIs naplňuje?",
      context: "JIC má strategické KPIs – počet podpořených firem, vytvořená pracovní místa, přitažené investice. Tato otázka propojuje nový produkt s těmito ambicemi, aby byl obhajitelný před vedením a Steering Boardem a aby soutěžil o zdroje s jasným argumentem."
    },
    { name: "Customer Journey (Portfolio)", hint: "Jak produkt zapadá mezi naše stávající produkty a služby?" },
    {
      name: "Výstupy",
      hint: "Co hmatatelného z aktivit produktu vznikne? Jak budeme měřit doručení těchto částí?",
      context: "Výstup je hmatatelný artefakt – proběhlý workshop, vydaný report, spuštěná aplikace. Liší se od Výsledku (co se změní u klienta) a Dopadu (co se změní v ekosystému). Toto rozlišení je základ hodnocení efektivity programů JIC a reportování do fondů."
    },
    {
      name: "Výsledky",
      hint: "Jakou změnu v chování, dovednostech či postojích klienta chceme vyvolat? Jak to budeme měřit/detekovat?",
      context: "Výsledek popisuje změnu u klienta – ne to, co jsme doručili, ale co se díky tomu u něj změnilo. 'Proběhl workshop' = výstup. 'Firma posunula produkt do pilotu' nebo 'zakladatel si ujasnil strategii' = výsledek. Právě výsledky jsou to, za co jsou programy JIC hodnoceny."
    }
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
    {
      name: "Výstupy",
      hint: "Byly doručeny všechny části? Co hmatatelného vzniklo? Jak to měříme?",
      context: "Výstup = hmatatelný artefakt (workshop, materiál, nástroj). Tady sledujeme, zda jsme doručili to, co jsme slíbili – počty, formáty, kvalitu. Je to odlišné od toho, co doručení způsobilo u klienta (to jsou výsledky)."
    },
    {
      name: "Výsledky",
      hint: "Jakou změnu v chování či dovednostech u klienta pozorujeme?",
      context: "Výsledek = změna u klienta, kterou lze přičíst naší práci. Nesledujeme jen aktivity, ale jejich dopady na cílovou skupinu. Příklady: firma získala investora, zakladatel potvrdil product-market fit, tým zvládl provoz samostatně."
    },
    { name: "Monitoring", hint: "Jak se nám daří dosahovat plánovaných milníků?" },
    { name: "Překážky", hint: "Jaké jsou překážky v projektovém plánu a jak (a kdo) je odstraňuje?" },
    { name: "Opakovatelnost/Škálovatelnost", hint: "Je produkt v této podobě opakovatelný jiným týmem?" }
  ],
  Closing: [
    { name: "Zhodnocení PM", hint: "Co jsme dokázali dělat dobře? Co v řízení fungovalo?" },
    { name: "Ponaučení", hint: "Co jsme se naučili? Co uděláme příště lépe?" },
    {
      name: "Dopady",
      hint: "Jaký je širší systémový dopad na trh, region nebo ekosystém JIC?",
      context: "Dopad je systémová změna, která přesahuje konkrétní klienty – změna na úrovni trhu, regionu nebo inovačního ekosystému JIC. Typicky se projevuje až po delší době. Příklady: vzrostl počet scale-upů v JMK, region přitáhl zahraniční kapitál, vzrostla povědomost o startupovém ekosystému. Reportujeme ho do fondů, strategií a výročních zpráv."
    },
    { name: "Finální Canvas", hint: "Odpovídá vyplněný Product Canvas realitě? Jsou náklady a role aktuální?" }
  ],
  "Gate 1": GATE_QUESTIONS["Gate 1"],
  "Gate 2": GATE_QUESTIONS["Gate 2"],
  "Gate 3": GATE_QUESTIONS["Gate 3"]
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
JIC PROCESNÍ RÁMEC – co musíš znát
═══════════════════════════════
JIC používá fázový PM proces s rozhodovacími body (Gate reviews):

Fáze projektu:
- Iniciace → Plánování → Realizace → Closing
- Gate 1, Gate 2, Gate 3 jsou rozhodovací body mezi fázemi

Gate reviews:
- Gate 1: přechod Iniciace → Plánování – Steering Board rozhoduje, zda má iniciativa dostatek jasnosti a strategické váhy, aby dostala zdroje na plánování
- Gate 2: přechod Plánování → Realizace – ověřuje, zda je plán schválen, zdroje přiděleny a rizika ošetřena
- Gate 3: přechod Realizace → Closing – ověřuje naplnění cílů, předání výstupů a lessons learned
- Steering Board = řídící orgán JIC s rozhodovací pravomocí; Gate výstup jim slouží jako podklad pro rozhodnutí

Klíčové pojmy – VŽDY dodržuj toto rozlišení:
- Výstupy = hmatatelné artefakty, které doručíme (workshopy, reporty, aplikace, materiály)
- Výsledky = změny v chování, dovednostech nebo postojích u klienta, které naše práce vyvolala
- Dopady = širší systémové změny na úrovni trhu, regionu nebo ekosystému JIC (typicky viditelné po delší době)
Tyto tři pojmy NEJSOU zaměnitelné – rozlišuj je v každém výstupu.

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
PRAVIDLO 4 – MARKET INSIGHT (sekce 🌐)
═══════════════════════════════
Pokud jsou k dispozici data "Market Intelligence (Tavily)" v kontextu:
- Přidej sekci ### 🌐 **Market Insight**: Co říká trh?
- Porovnej popisovaný produkt/projekt s nalezenými podobnými řešeními.
- Zdůrazni unikátní hodnotu nebo bílá místa na trhu.
- Uveď max. 3–5 odrážek, stručně a analyticky.
- Pokud data nejsou k dispozici, sekci VYNECH úplně.

═══════════════════════════════
NA KONCI výstupu vždy přidej:
═══════════════════════════════
---
💡 **Návrhy na zlepšení instrukcí:**
- [1–2 konkrétní návrhy jak vylepšit zpracování na základě tohoto transkriptu]

Tón: Přímý, lidský, analytický – piš jako zkušený PM kolega, ne jako formulář. Používej aktivní slovesa, vyhýbej se byrokratickému jazyku. Jazyk JIC (čeština).`;

// ─── Hlavní funkce ─────────────────────────────────────────────────────────────

export async function generateStructuredOutput(input: {
  phase: string;
  framework: string;
  transcript: string;
  projectContext: string;
  ragContext: string[];
  marketInsight?: string;
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

  if (input.marketInsight?.trim()) {
    parts.push(
      `**Market Intelligence (Tavily web search – použij pro sekci 🌐 Market Insight):**\n${input.marketInsight}`
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

  const response = await withRetry(() =>
    anthropic.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }]
    })
  );

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

  const response = await withRetry(() =>
    anthropic.messages.create({
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

// ─── Follow-up otázky průvodce ─────────────────────────────────────────────────

export async function generateFollowUpQuestions(input: {
  questionName: string;
  questionHint: string;
  userAnswer: string;
  framework: string;
  phase: string;
}): Promise<{ followUps: string[] }> {
  if (!anthropic) return { followUps: [] };

  const response = await withRetry(() =>
    anthropic.messages.create({
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

// ─── Detekce žádosti o vysvětlení otázky ──────────────────────────────────────

export async function generateClarification(input: {
  questionName: string;
  questionHint: string;
  userText: string;
  framework: string;
  phase: string;
}): Promise<{ isClarification: boolean; explanation?: string }> {
  if (!anthropic) return { isClarification: false };

  const response = await withRetry(() =>
    anthropic.messages.create({
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

// ─── Parsování textového promptu pro rozšířenou sadu otázek ───────────────────

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
    const framework: "Univerzální" | "Produktový" = t.includes("produktový") || t.includes("produktovy")
      ? "Produktový"
      : "Univerzální";
    return { wantsCanvas, framework };
  }

  const response = await withRetry(() =>
    anthropic.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 256,
      system: `Rozpoznej z uživatelova textu, zda žádá o "rozšířenou sadu PM otázek" (canvas se všemi otázkami a 3 doplňujícími u každé).
Pokud ano, extrahuj framework (Univerzální nebo Produktový) a volitelně fázi (Iniciace, Plánování, Realizace, Closing, Gate 1/2/3).
Vrať POUZE validní JSON: {"wantsCanvas": true|false, "framework": "Univerzální"|"Produktový", "phase": "Iniciace"|...}
Pokud framework není zmíněn, použij Produktový. Pokud fáze není zmíněna, použij Iniciace.`,
      messages: [
        {
          role: "user",
          content: `Uživatel napsal: "${input.userText}"`
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

// ─── Generování 3 doplňujících otázek pro každou základní (pro Canvas) ─────────

export async function generateFollowUpsForCanvas(input: {
  questions: { name: string; hint: string }[];
  framework: string;
  phase: string;
}): Promise<{ questionName: string; followUps: string[] }[]> {
  if (!anthropic) {
    return input.questions.map((q) => ({
      questionName: q.name,
      followUps: [
        `Jak to konkrétně ovlivní projekt?`,
        `Kdo je za to odpovědný?`,
        `Jak to budeme měřit?`
      ]
    }));
  }

  const results: { questionName: string; followUps: string[] }[] = [];

  for (const q of input.questions) {
    const response = await withRetry(() =>
      anthropic.messages.create({
        model: env.ANTHROPIC_MODEL,
        max_tokens: 256,
        system: `Jsi PM coach. Pro danou základní PM otázku vygeneruj přesně 3 relevantní otevřené otázky, které mohou být kladeny pro upřesnění nebo vylepšení odpovědí dle kontextu projektu. Vrať POUZE číslovaný seznam 3 otázek (jedna věta každá). Žádný jiný text.`,
        messages: [
          {
            role: "user",
            content: `Framework: ${input.framework} | Fáze: ${input.phase}
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
      followUps: lines.length >= 3 ? lines : [
        "Jak to konkrétně ovlivní projekt?",
        "Kdo je za to odpovědný?",
        "Jak to budeme měřit?"
      ]
    });
  }

  return results;
}

// ─── AI shrnutí paměti projektu ───────────────────────────────────────────────

export async function generateProjectMemorySummary(input: {
  projectName: string;
  framework: string;
  accumulatedContext: string;
}): Promise<{ summary: string }> {
  if (!anthropic) {
    return { summary: input.accumulatedContext.slice(0, 600) };
  }

  const response = await withRetry(() =>
    anthropic.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 512,
      system: `Jsi PM asistent. Dostaneš akumulovaný kontext projektu – záznamy z různých schůzek a fází.
Vytvoř z toho JEDEN srozumitelný, souvislý odstavec (max. 4–6 vět) v češtině.
Zaměř se na: co je cílem projektu, kde projekt stojí, klíčové závěry a rozhodnutí.
Piš přirozeně, jako byste to vysvětloval kolegovi. Žádné odrážky, žádný markdown, jen čistý text.`,
    messages: [
      {
        role: "user",
        content: `Projekt: ${input.projectName} (${input.framework} framework)\n\nKontext:\n${input.accumulatedContext}`
      }
    ]
  })
  );

  const text = response.content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();

  return { summary: text || input.accumulatedContext.slice(0, 600) };
}
