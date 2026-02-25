# PM ASSISTANT
## Technické zadání pro vývoj webové aplikace (v1.2)

**Zadavatel:** JIC – Jihomoravské inovační centrum  
**Vlastník zadání:** Milad  
**Verze dokumentu:** 1.2  
**Datum:** 25. února 2026  
**Stav:** DRAFT – připraveno k předání vývojáři

## 0. Změny oproti verzi 1.1

Do verze 1.2 byly integrovány:
- Detailní `error handling` scénáře (AI, Asana, SharePoint sync, RAG fallback, validace vstupů).
- Jednoznačná prioritizace scope (`MUST/SHOULD/COULD/WON'T`) pro MVP v1.
- Odložené varianty rozhodnutí pro:
  - metriky kvality a SLA,
  - eval dataset (rozsah a náročnost).

## 1. Executive Summary

PM Assistant je interní webová aplikace pro JIC, která automatizuje zpracování transkriptů ze schůzek do strukturované projektové dokumentace kompatibilní s Asanou. Aplikace je postavena na moderním webovém stacku s AI jádrem (Anthropic Claude API) a znalostní bází JIC.

Cíl: PM vloží transkript, AI ho zpracuje s kontextem interních dat JIC a výstup jde přímo do Asany.

| Parametr | Hodnota |
|---|---|
| Typ aplikace | Webová app (prohlížeč + Teams Tab) |
| Uživatelé | PM týmy v JIC (více uživatelů, více projektů) |
| AI engine | Anthropic Claude API (Sonnet), pay-per-use |
| Znalostní báze | RAG nad vektorovou DB dokumentů JIC |
| Integrace | Asana API + SharePoint (MS Graph API) |
| Databáze | Supabase + pgvector |
| Auth | Microsoft SSO (Azure AD) |
| Hosting | Vercel |
| Odhadované provozní náklady | 25–75 USD / měsíc |

## 2. Kontext a problém

### 2.1 Současný stav
Projektové schůzky v JIC generují klíčová rozhodnutí, rizika a úkoly, které často končí v nahrávkách nebo nejednotných poznámkách. Ruční přepis do Asany:
- zabírá 30–90 minut po každé schůzce,
- vede ke ztrátě kontextu,
- vytváří nekonzistentní dokumentaci,
- nevyužívá interní znalosti JIC.

### 2.2 Požadované řešení
Aplikace, která:
- přijme transkript nebo vede PM přes průvodce otázkami,
- zpracuje vstup dle JIC PM frameworku a interních dokumentů,
- uloží výstup do paměti projektu,
- exportuje výstup přímo do Asany,
- průběžně aktualizuje znalostní bázi ze SharePointu i ručním uploadem.

## 3. Funkční požadavky

### 3.1 Základní funkce (MVP)
- **F01 – Správa projektů**: vytvoření projektu, přehled projektů, historie zpracování.
- **F02 – Zpracování transkriptu**: vložení textu/upload, volba fáze a frameworku, AI výstup, editace.
- **F03 – Průvodce otázkami**: interaktivní chat, průběžná strukturalizace výstupu.
- **F04 – Paměť projektů**: per-projekt kontext, načítání historie, detekce odchylek.
- **F05 – Export do Asany**: vytvoření tasků/subtasků, mapování sekcí.
- **F06 – Znalostní báze (RAG)**: upload, správa dokumentů, indexace, sync.
- **F07 – Autentizace a role**: Azure AD SSO, role Admin/PM/Viewer.

### 3.2 Rozšířené funkce (Post-MVP)
- automatická detekce fáze PM,
- notifikace do Teams,
- dashboard stavů projektů,
- semantické vyhledávání v historii projektů.

## 4. Technická architektura

### 4.1 Stack

| Vrstva | Technologie | Účel |
|---|---|---|
| Frontend | Next.js 14 (React) | UI, routing, SSR |
| Styling | Tailwind CSS + shadcn/ui | Komponenty |
| Backend | Next.js API Routes | Serverová logika, orchestrace |
| AI engine | Anthropic Claude API (Sonnet) | Zpracování transkriptů |
| Embeddings | Anthropic nebo OpenAI embeddings | Převod textu na vektory |
| Vektorová DB | Supabase + pgvector | KB + retrieval |
| Relační DB | Supabase PostgreSQL | Projekty, historie, uživatelé |
| Parser dokumentů | LangChain / Unstructured | Parsing PDF/DOCX/TXT |
| SharePoint sync | MS Graph API | Synchronizace dokumentů |
| Auth | NextAuth.js + Azure AD | SSO |
| Hosting | Vercel | Deploy/serverless |

### 4.2 Tok dat
1. **Příprava KB:** upload/sync dokumentů → chunking → embedding → uložení do pgvector.
2. **Zpracování transkriptu:** transcript + fáze/framework → RAG retrieval top 5–10 chunků → prompt assembly (framework + projekt + KB + transcript) → Claude → výstup → uložení → volitelný export do Asany.

## 5. Znalostní báze (RAG)

### 5.1 Obsah KB
- Strategie JIC (vysoká priorita)
- Produkty/služby (vysoká)
- Metodiky a procesy (střední)
- Šablony a příklady (střední)
- Historie projektů (nižší, post-MVP)

### 5.2 Admin rozhraní KB
- přehled dokumentů,
- upload (`.pdf`, `.docx`, `.txt`),
- editace metadat,
- mazání + re-indexace,
- log synchronizací.

### 5.3 SharePoint sync
- periodická kontrola (24 h nebo ručně),
- inkrementální re-indexace změn,
- automatické přidání/odebrání dokumentů,
- vyžadované oprávnění: `Sites.Read.All`.

### 5.4 Datový model KB (minimum)
- `kb_documents` (metadata dokumentů),
- `kb_chunks` (text + embedding + metadata),
- `kb_sync_log` (historie sync operací a chyb).

## 6. AI prompt a kontextové okno

Prompt se skládá ze 4 vrstev:
1. statický system prompt (JIC PM framework),
2. dynamický znalostní kontext z RAG,
3. projektový kontext z DB,
4. uživatelský vstup (transkript / odpovědi průvodce).

Správa kontextu:
- retrieval max top 5–10 chunků,
- komprimovaný projektový souhrn,
- při přetečení token budgetu redukce chunků,
- plná historie zůstává v UI/DB, ne v promptu.

## 7. Asana integrace

### 7.1 Autorizace
- každý uživatel propojí Asana účet přes Personal Access Token,
- token je uložen šifrovaně (column-level encryption).

### 7.2 Mapování výstupu
- název fáze → hlavní task,
- PM sekce → subtasks,
- text odpovědi → popis subtasku,
- PM kontext/zdroje → komentáře,
- RACI/rizika → tagy nebo custom field dle finálního mapování.

## 8. UI/UX obrazovky

- Dashboard projektů,
- Projekt detail (fáze, historie, export),
- Zpracování transkriptu,
- Průvodce otázkami,
- Admin KB,
- Nastavení (Asana token, tým, SharePoint).

Teams Tab: aplikace dostupná i jako tab v MS Teams.

## 9. Bezpečnost a přístupová práva

- Azure AD SSO, přístup pouze pro JIC účty,
- role-based přístup (Admin/PM/Viewer),
- Supabase RLS pro izolaci dat,
- API klíče pouze na serveru,
- HTTPS přes Vercel,
- data v EU regionu.

## 10. Error handling scénáře (nově rozšířeno ve v1.2)

### 10.1 AI API výpadek / timeout / 429
- retry politika: max 2 pokusy s exponenciálním backoff,
- při selhání uložit session jako `failed_ai` a zachovat transcript,
- UI: jasná chybová hláška + možnost opakovat.

### 10.2 Asana export: částečné selhání
- export přes `export_job_id` + `idempotency_key`,
- při opakování nesmí vznikat duplicity,
- ukládat mapování již vytvořených objektů.

### 10.3 SharePoint sync konflikty
- inkrementální sync podle `last_modified`,
- smazané soubory: soft delete + odstranění chunků,
- nečitelný soubor: `sync_error`, ponechat poslední validní index.

### 10.4 RAG fallback
- při prázdném/nekvalitním retrieval: zpracovat bez KB,
- označit `low_kb_confidence`,
- transparentně informovat uživatele.

### 10.5 Validace vstupů
- transcript min/max délka,
- kontrola MIME a přípon,
- srozumitelné validační chyby bez pádu backendu.

### 10.6 Provozní tabulky (minimum)
- `processing_jobs` (status, retry, error),
- `export_jobs` (idempotence, created objects, error payload),
- rozšířené `kb_sync_log` (typ změny, duration, file identifiers).

## 11. Scope prioritizace pro MVP v1 (nově rozšířeno ve v1.2)

### 11.1 MUST (release blocker)
- Microsoft SSO,
- projekty + historie,
- transcript processing (ruční volba fáze/frameworku),
- uložení session,
- základní RAG nad ručně nahranými dokumenty,
- editace výstupu,
- export do Asany (task + subtasks),
- základní audit log a chybové stavy v UI.

### 11.2 SHOULD
- SharePoint sync,
- role Viewer,
- pokročilé mapování Asana custom fields,
- change detection mezi fázemi.

### 11.3 COULD
- auto-detekce fáze,
- Teams notifikace,
- semantické vyhledávání historií,
- dashboard KPI.

### 11.4 WON'T (v1)
- plně autonomní workflow bez editace,
- multi-tenant pro více organizací,
- pokročilá BI vrstva.

### 11.5 Release plán
- **v1.0 Core:** SSO, projekty, processing, basic RAG upload, Asana export.
- **v1.1 Stabilizace:** retry/idempotence/observabilita.
- **v1.2 Integrace:** SharePoint sync + admin tooling.

## 12. Fáze vývoje a timeline

Původní odhad: 72–102 hodin pro MVP.  
Poznámka v1.2: odhad je validní pouze při omezení scope na `MUST`; SharePoint a pokročilé Asana mapování zvyšují riziko prodloužení.

Doporučené milníky:
1. PoC (SSO + AI core) – ověřit kvalitu výstupu,
2. RAG milestone – ověřit relevanci interních dokumentů,
3. Export milestone – ověřit spolehlivost Asana flow.

## 13. Náklady

Vývoj: orientačně 58 000 – 153 000 Kč (dle sazby a reálného scope).  
Provoz: orientačně 6–68 USD/měsíc (dle objemu, free tierů a usage).

## 14. Co připravit před vývojem

Kritické předpoklady:
- finální system prompt,
- počáteční KB dokumenty,
- finální mapování Asana struktury,
- Azure AD App Registration + oprávnění,
- Anthropic API klíč,
- testovací transkripty.

## 15. Odložená rozhodnutí (varianty k pozdějšímu schválení)

### 15.1 Varianty metrik kvality a SLA

**Varianta A – Lean**
- Output usability rate,
- Export success rate,
- Median processing time.

**Varianta B – Balanced (doporučená)**
- vše z A + attribution rate, hallucination flags, edit-distance proxy.

**Varianta C – Strict**
- vše z B + ruční kvalitativní scoring + SLA (p95, uptime, error budget).

### 15.2 Varianty eval datasetu

**Varianta A – Mini**
- 10 transkriptů, základní checklist správnosti.

**Varianta B – Pilot (doporučená)**
- 25 transkriptů včetně obtížných edge případů.

**Varianta C – Robust**
- 50+ transkriptů, golden set a regresní eval po releasu.

## 16. Definice hotového MVP

MVP je hotové, pokud:
- uživatel se přihlásí přes MS účet,
- vytvoří projekt, vloží transkript, zvolí fázi/framework,
- AI výstup reflektuje interní KB,
- výstup se uloží do historie,
- admin nahraje dokument do KB a vidí indexaci,
- export do Asany funguje jedním kliknutím,
- aplikace je dostupná jako Teams Tab.

---

Dokument připraven jako brief pro vývojáře – verze **1.2** | JIC 2026
