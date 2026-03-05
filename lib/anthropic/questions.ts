export type Question = { name: string; hint: string; context?: string };

// ─── Gate otázky ──────────────────────────────────────────────────────────────

const GATE_QUESTIONS: Record<string, Question[]> = {
  "Gate 1": [
    {
      name: "Připravenost k posunu",
      hint: "Jsou splněny podmínky pro přechod z Iniciace do Plánování? Co ještě chybí?",
      context:
        "Gate 1 je první rozhodovací bod v JIC procesu – Steering Board na základě tohoto podkladu rozhoduje, zda má iniciativa dostatek jasnosti a strategické váhy, aby dostala zdroje na plánování. Nestačí nadšení, potřebujeme fakta."
    },
    {
      name: "Validace problému",
      hint: "Je problém nebo potřeba dostatečně ověřena? Mluvili jsme s cílovou skupinou?",
      context:
        "Častá past: přejdeme rovnou k řešení, aniž bychom potvrdili, že problém reálně existuje. Gate 1 je správný moment to zkontrolovat – zpětně je to dražší."
    },
    {
      name: "Strategické zasazení",
      hint: "Jak iniciativa přispívá ke strategii JIC? Která priorita nebo KPI ji podporuje?",
      context:
        "Steering Board posuzuje nejen smysluplnost iniciativy, ale i to, zda zapadá do celkového portfolia JIC. Každý projekt soutěží o omezené zdroje – strategické zasazení je klíčový argument."
    },
    {
      name: "Zdroje na plánování",
      hint: "Máme kapacity (lidi, čas, rozpočet) na to, abychom mohli iniciativu řádně naplánovat?",
      context:
        "Schválení Gate 1 neznamená automatický závazek realizovat – znamená, že dostaneme zdroje na přípravu plánu. Je důležité být realistický v tom, co plánování vyžaduje."
    },
    {
      name: "Klíčová rizika a nejasnosti",
      hint: "Co jsou největší otazníky, které musíme v plánování zodpovědět? Co by mohlo iniciativu zastavit?",
      context:
        "Otevřenost k rizikům na Gate 1 je silnou stránkou, ne slabinou. Steering Board ocení, když víme, co nevíme – a máme plán, jak to zjistit."
    },
    {
      name: "Doporučení pro Steering Board",
      hint: "Jak tým doporučuje rozhodnout? Jaké jsou podmínky pro postup nebo zamítnutí?",
      context:
        "Gate výstup není jen informační dokument – je to podklad pro rozhodnutí. Čím jasněji formulujeme doporučení a podmínky, tím snazší je rozhodnutí Steering Boardu."
    }
  ],
  "Gate 2": [
    {
      name: "Schválení plánu",
      hint: "Je plán realizace schválen klíčovými stakeholdery? Jsou všichni alignováni na rozsah a cíle?",
      context:
        "Gate 2 je přechod z Plánování do Realizace. Steering Board ověřuje, zda má tým solidní plán a zda jsou zdroje skutečně zajištěny – ne jen slíbeny. Je to poslední brzda před spuštěním."
    },
    {
      name: "Přidělení zdrojů",
      hint: "Jsou lidé, rozpočet a ostatní zdroje formálně přiděleny? Nebo jde stále o přísliby?",
      context:
        "Rozdíl mezi 'máme to v plánu' a 'máme to v kalendářích a tabulkách' bývá klíčový. Gate 2 je příležitost tento rozdíl odkrýt dřív, než projekt narazí na prázdno."
    },
    {
      name: "Ošetření klíčových rizik",
      hint: "Jak jsme adresovali rizika identifikovaná na Gate 1? Co zůstává otevřené a jak to sledujeme?",
      context:
        "Rizika nezmizí tím, že je ignorujeme. Steering Board chce vidět, že jsme s riziky aktivně pracovali a máme mitigation plán – nebo alespoň vědomé rozhodnutí je akceptovat."
    },
    {
      name: "Připravenost týmu",
      hint: "Ví tým, co a kdy má dělat? Je onboarding hotový, jsou jasné role a odpovědnosti?",
      context:
        "Začátek realizace bývá chaotický, pokud tým není připraven. Tato otázka pomáhá odhalit, zda je plán na papíře, nebo opravdu žije v hlavách lidí, kteří ho budou realizovat."
    },
    {
      name: "Podmínky pro schválení",
      hint: "Jaké jsou minimální podmínky, které musí být splněny, aby Steering Board schválil postup?",
      context:
        "Explicitní podmínky schválení chrání obě strany – tým ví, co se od něj čeká, a Steering Board má jasný rámec pro rozhodnutí."
    },
    {
      name: "Doporučení pro Steering Board",
      hint: "Jak tým doporučuje rozhodnout? Schválit, podmíněně schválit, nebo vrátit do plánování?",
      context:
        "Tým, který přijde s jasným doporučením a odůvodněním, signalizuje zralost a připravenost. Nerozhodné podklady ztěžují i rozhodnutí Steering Boardu."
    }
  ],
  "Gate 3": [
    {
      name: "Naplnění cílů",
      hint: "Do jaké míry byly splněny cíle stanovené na začátku? Co se podařilo a co ne?",
      context:
        "Gate 3 je uzavírací bod – Steering Board posuzuje, zda projekt splnil, co slíbil, a zda je připraven formálně skončit nebo přejít do provozního módu. Je to také moment pro úprimnou evaluaci."
    },
    {
      name: "Předání výstupů",
      hint: "Jsou výstupy projektu řádně předány? Má každý výsledek svého nového 'majitele'?",
      context:
        "Projekt bez jasného předání nemá konec – přetahuje se donekonečna nebo tiše umírá. Gate 3 formalizuje, že výstupy existují, jsou dokumentovány a mají provozního garanta."
    },
    {
      name: "Spokojenost stakeholderů",
      hint: "Jak hodnotí výsledky klíčoví stakeholdeři a klienti? Měli jsme formální zpětnou vazbu?",
      context:
        "Interní hodnocení není dostatečné – potřebujeme hlas těch, pro koho jsme projekt dělali. Feedback v tomto momentě je cenný i pro budoucí projekty."
    },
    {
      name: "Ponaučení (Lessons Learned)",
      hint: "Co bychom příště udělali jinak? Jaké jsou 2–3 klíčové věci, které stojí za zachování nebo změnu?",
      context:
        "Lessons learned není sebekritika – je to investice do budoucích projektů. JIC sbírá tyto poznatky systematicky, aby neopakoval stejné chyby a stavěl na fungujících vzorech."
    },
    {
      name: "Doporučení k uzavření",
      hint: "Je projekt připraven k formálnímu uzavření? Nebo zbývají otevřené body, které je třeba vyřešit?",
      context:
        "Formální uzavření projektu (sign-off) je důležité nejen administrativně, ale i psychologicky – tým může věnovat energii novým věcem a projekt dostane svůj konec v historii JIC."
    }
  ]
};

// ─── Univerzální framework ────────────────────────────────────────────────────

const UNIVERSAL: Record<string, Question[]> = {
  Iniciace: [
    { name: "Předmět", hint: "O čem to celé je? Co chceme reálně vytvořit?" },
    { name: "Kontext", hint: "Proč to děláme? Jak to zapadá do naší strategie a cílů?" },
    { name: "Stakeholdeři", hint: "Koho se to týká? Kdo má na výsledek vliv nebo o něm rozhoduje?" },
    {
      name: "Cíl",
      hint: "Co je cílem a co už cílem není? Rozumí si se stakeholdery v tom, co bude na konci?"
    },
    { name: "Indikátory úspěchu", hint: "Jak poznáme, že se cíl plní/naplnil?" },
    { name: "Prioritizace", hint: "Je to teď pro nás priorita? Nehoří nám něco důležitějšího?" },
    {
      name: "Poptávka",
      hint: "Kdo to chce? Koho to bude bolet, když tenhle projekt neuděláme?"
    },
    {
      name: "Vazba na portfolio",
      hint: "Jak tento projekt souvisí s jinými běžícími nebo plánovanými projekty JIC? Hrozí duplicita nebo konflikt zdrojů?"
    }
  ],
  Plánování: [
    { name: "Role", hint: "Kdo a za co bude nést zodpovědnost? Kdo je PO, PM, TM?" },
    { name: "Plán", hint: "Co a kdy se bude dělat? (rozpad na konkrétní kroky)" },
    { name: "Milníky", hint: "Jaké jsou milníky projektu (dílčí cíle)?" },
    { name: "Rizika", hint: "Jaká jsou rizika realizace projektu? Kdo a jak rizika ošetří?" },
    {
      name: "Zdroje",
      hint: "Jaký je rozpočet projektu? Jaké kapacity lidí a prostředky jsou potřeba?"
    },
    { name: "Proveditelnost", hint: "Je projektový plán realistický a dosažitelný?" }
  ],
  Realizace: [
    {
      name: "Monitoring",
      hint: "Jak se nám daří dosahovat plánovaných milníků? Jsme tam, kde jsme chtěli být?"
    },
    {
      name: "Překážky",
      hint: "Jaké jsou překážky v projektovém plánu a jak (a kdo) je odstraňuje?"
    },
    { name: "Change management", hint: "Je cíl a rozsah projektu aktuální?" },
    { name: "Dosažení cíle", hint: "Jak moc/dobře jsme naplnili cíl projektu?" },
    {
      name: "Spokojenost stakeholderů",
      hint: "Jak jsou spokojeni stakeholdeři s výstupy/výsledky projektu?"
    }
  ],
  Closing: [
    {
      name: "Zhodnocení PM",
      hint: "Co jsme dokázali dělat dobře? Co nám v řízení projektu šlo dobře?"
    },
    {
      name: "Ponaučení",
      hint: "Co jsme se během projektu naučili? Co budeme dělat v příštím projektu lépe?"
    },
    {
      name: "Předání",
      hint: "Je projekt řádně předán do operativy? Má výsledek svého nového majitele?"
    }
  ],
  "Gate 1": GATE_QUESTIONS["Gate 1"],
  "Gate 2": GATE_QUESTIONS["Gate 2"],
  "Gate 3": GATE_QUESTIONS["Gate 3"]
};

// ─── Produktový framework ─────────────────────────────────────────────────────

const PRODUKTOVY: Record<string, Question[]> = {
  Iniciace: [
    {
      name: "Problém/Potřeba",
      hint: "Jaký konkrétní problém či potřebu produkt řeší? Máme ji potvrzenou od cílové skupiny?"
    },
    {
      name: "Hodnota produktu (Value Proposition)",
      hint: "Jakou konkrétní hodnotu produkt vytváří pro klienta?",
      context:
        "Value proposition odpovídá na otázku: proč by si zákazník vybral právě tento produkt? Nestačí říct 'pomáháme firmám růst' – hledáme konkrétní přínos, který alternativy nenabídnou. Je to základ, od kterého se odvíjí design i komunikace produktu."
    },
    { name: "Cílovka", hint: "Pro koho je produkt primárně určen a jaké jsou vstupní předpoklady?" },
    {
      name: "Product Stakeholders",
      hint: "Kdo všechno má zájem na produktu a z jakého důvodu (strategické zadání, rozpočet, odbornost, supportní služby, koordinace s jinými produkty aj.)? S kým z nich je potřeba předem konzultovat klíčová rozhodnutí? (C - Consulted) Které z nich stačí průběžně informovat? (I - Informed)"
    },
    {
      name: "Positioning (Market Fit)",
      hint: "Jakou hodnotu přináší produkt na trh a v čem se liší?",
      context:
        "Market fit ukazuje, zda produkt řeší reálný problém na trhu, kde existuje dostatečná poptávka a JIC má šanci zaujmout unikátní pozici. Pomáhá odhalit přeplněné segmenty vs. nepokrytá místa – a vyhnout se tomu, že vytvoříme něco, co už dělá někdo jiný lépe."
    },
    {
      name: "Cíle JIC",
      hint: "Jak produkt přispívá k dlouhodobé strategii JIC a které KPIs naplňuje?",
      context:
        "JIC má strategické KPIs – počet podpořených firem, vytvořená pracovní místa, přitažené investice. Tato otázka propojuje nový produkt s těmito ambicemi, aby byl obhajitelný před vedením a Steering Boardem a aby soutěžil o zdroje s jasným argumentem."
    },
    {
      name: "Customer Journey (Portfolio)",
      hint: "Jaké jsou vazby mezi tímto produktem a ostatními produkty/službami v portfoliu JIC? Kde se navazují, kde se překrývají a kde soutěží o stejnou cílovou skupinu?"
    },
    {
      name: "Výstupy",
      hint: "Co hmatatelného z aktivit produktu vznikne? Jak budeme měřit doručení těchto částí?",
      context:
        "Výstup je hmatatelný artefakt – proběhlý workshop, vydaný report, spuštěná aplikace. Liší se od Výsledku (co se změní u klienta) a Dopadu (co se změní v ekosystému). Toto rozlišení je základ hodnocení efektivity programů JIC a reportování do fondů."
    },
    {
      name: "Výsledky",
      hint: "Jakou změnu v chování, dovednostech či postojích klienta chceme vyvolat? Jak to budeme měřit/detekovat?",
      context:
        "Výsledek popisuje změnu u klienta – ne to, co jsme doručili, ale co se díky tomu u něj změnilo. 'Proběhl workshop' = výstup. 'Firma posunula produkt do pilotu' nebo 'zakladatel si ujasnil strategii' = výsledek. Právě výsledky jsou to, za co jsou programy JIC hodnoceny."
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
      context:
        "Výstup = hmatatelný artefakt (workshop, materiál, nástroj). Tady sledujeme, zda jsme doručili to, co jsme slíbili – počty, formáty, kvalitu. Je to odlišné od toho, co doručení způsobilo u klienta (to jsou výsledky)."
    },
    {
      name: "Výsledky",
      hint: "Jakou změnu v chování či dovednostech u klienta pozorujeme?",
      context:
        "Výsledek = změna u klienta, kterou lze přičíst naší práci. Nesledujeme jen aktivity, ale jejich dopady na cílovou skupinu. Příklady: firma získala investora, zakladatel potvrdil product-market fit, tým zvládl provoz samostatně."
    },
    {
      name: "Monitoring",
      hint: "Jak se nám daří dosahovat plánovaných milníků?"
    },
    {
      name: "Překážky",
      hint: "Jaké jsou překážky v projektovém plánu a jak (a kdo) je odstraňuje?"
    },
    {
      name: "Opakovatelnost/Škálovatelnost",
      hint: "Je produkt v této podobě opakovatelný jiným týmem?"
    }
  ],
  Closing: [
    { name: "Zhodnocení PM", hint: "Co jsme dokázali dělat dobře? Co v řízení fungovalo?" },
    { name: "Ponaučení", hint: "Co jsme se naučili? Co uděláme příště lépe?" },
    {
      name: "Dopady",
      hint: "Jaký je širší systémový dopad na trh, region nebo ekosystém JIC?",
      context:
        "Dopad je systémová změna, která přesahuje konkrétní klienty – změna na úrovni trhu, regionu nebo inovačního ekosystému JIC. Typicky se projevuje až po delší době. Příklady: vzrostl počet scale-upů v JMK, region přitáhl zahraniční kapitál, vzrostla povědomost o startupovém ekosystému. Reportujeme ho do fondů, strategií a výročních zpráv."
    },
    {
      name: "Finální Canvas",
      hint: "Odpovídá vyplněný Product Canvas realitě? Jsou náklady a role aktuální?"
    }
  ],
  "Gate 1": GATE_QUESTIONS["Gate 1"],
  "Gate 2": GATE_QUESTIONS["Gate 2"],
  "Gate 3": GATE_QUESTIONS["Gate 3"]
};

export function getQuestionsForPhaseAndFramework(phase: string, framework: string): Question[] {
  const map = framework === "Produktový" ? PRODUKTOVY : UNIVERSAL;
  return map[phase] ?? map["Iniciace"] ?? [];
}
