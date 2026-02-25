# PM Assistant – doplnění zadání (v1.2)

Datum: 25. února 2026  
Navazuje na: `PM_Assistant_Technicke_Zadani_v1.1.docx`

## 1) Zapracováno nyní: Error handling scénáře (původní bod 3)

### 1.1 AI API (Anthropic) nedostupné / timeout / rate limit
- Trigger: HTTP 5xx, timeout, 429.
- Chování systému:
  - Max 2 retry s exponenciálním backoff (např. 1.5 s, 4 s).
  - Pokud retry selže: session uložit jako `failed_ai`, zachovat vstupní transcript.
  - Uživateli zobrazit jasný stav: „Zpracování se nepodařilo, vstup je uložen, zkuste znovu.“
- Logování:
  - `request_id`, `project_id`, `phase`, délka promptu, typ chyby, doba odezvy.
- Akceptace:
  - Žádná ztráta vstupu.
  - Uživatel může opakovat akci jedním klikem.

### 1.2 Asana export selže částečně nebo úplně
- Trigger: neplatný token, expirovaný token, 4xx/5xx, síťový výpadek.
- Chování systému:
  - Export běží idempotentně přes `export_job_id`.
  - Při částečném selhání uložit mapování již vytvořených tasků/subtasků.
  - Nabídnout „pokračovat v exportu“ bez duplicit.
- Logování:
  - `session_id`, `asana_project_id`, počet vytvořených objektů, seznam selhaných položek.
- Akceptace:
  - Nevznikají duplicity při opakování exportu.
  - Uživatel vidí přesně, co bylo vytvořeno a co ne.

### 1.3 SharePoint sync konflikty a změny souborů
- Trigger: přesun/smazání souboru, změna oprávnění, chybějící přístup.
- Chování systému:
  - Sync běží inkrementálně dle `last_modified`.
  - Smazané soubory: „soft delete“ v `kb_documents` + odstranění chunků.
  - Nečitelný soubor: stav `sync_error`, ponechat poslední validní index.
- Logování:
  - `source_path`, `file_id`, `change_type`, `status`, chybová hláška.
- Akceptace:
  - KB zůstává konzistentní (žádné orphan chunky).
  - Admin vidí chyby a může spustit re-sync.

### 1.4 RAG nevrátí relevantní chunky
- Trigger: nízké skóre relevance / prázdný výsledek.
- Chování systému:
  - Fallback na „base prompt + project context“ bez KB.
  - Výstup označit příznakem `low_kb_confidence`.
  - UI upozorní: „Nenalezen dostatečný interní kontext.“
- Akceptace:
  - Systém dokončí zpracování i bez KB.
  - Uživatel je transparentně informován o nižší kvalitě kontextu.

### 1.5 Validace vstupu
- Transcript:
  - Minimální délka (např. 300 znaků).
  - Maximální délka (podle token budgetu; při překročení nabídnout automatické shrnutí).
- Upload:
  - Povolené typy: `.txt`, `.docx`, `.pdf` (jen pro KB/admin).
  - Blokace nevalidních MIME typů.
- Akceptace:
  - Jasné validační chyby na frontendu, bez pádu API.

### 1.6 Minimální tabulky pro robustní provoz
- `processing_jobs`:
  - `id`, `project_id`, `session_id`, `status`, `error_code`, `error_message`, `retry_count`, `created_at`, `updated_at`.
- `export_jobs`:
  - `id`, `session_id`, `asana_project_id`, `status`, `idempotency_key`, `created_objects_json`, `error_payload`.
- `kb_sync_log` (rozšířit):
  - `file_id`, `document_id`, `change_type`, `duration_ms`.

## 2) Zapracováno nyní: Prioritizace scope pro MVP v1 (původní bod 4)

## 2.1 MUST (release blocker)
- Přihlášení přes Microsoft SSO (PM/Admin).
- Vytvoření projektu + historie zpracování.
- Zpracování transkriptu přes AI (fáze + framework ručně zvolené).
- Uložení session do DB.
- Základní RAG nad ručně nahranými dokumenty (bez SharePoint sync).
- Editace výstupu před exportem.
- Export do Asana (task + subtasks) pro jednu cílovou strukturu.
- Základní audit log + error stavy v UI.

## 2.2 SHOULD (po stabilizaci v1)
- SharePoint automatický sync.
- Role `Viewer`.
- Pokročilejší mapování na Asana custom fields/tagy.
- Change detection mezi fázemi (upozornění na odchylky).

## 2.3 COULD (post-MVP)
- Automatická detekce PM fáze.
- Teams notifikace.
- Semantické vyhledávání napříč historií projektů.
- Dashboard KPI nad projekty.

## 2.4 WON'T (v1)
- Plně autonomní workflow bez lidské editace.
- Multi-tenant oddělení více organizací.
- Pokročilá BI/reporting vrstva.

## 2.5 Návrh release plánu (v1)
- v1.0 (Core):
  - SSO, projekty, transcript processing, základní RAG upload, Asana export, logy.
- v1.1 (Stabilizace):
  - Idempotent export, retry policy, lepší observabilita.
- v1.2 (Integrace):
  - SharePoint sync + admin tooling.

## 3) Dokumentace k pozdějšímu rozhodnutí: varianty metrik (původní bod 1)

Poznámka: níže jsou varianty, výběr se udělá později podle kapacity týmu.

### Varianta A – Lean metriky (rychlý start)
- `Output usability rate`: % výstupů použitelných po max 5 min editace.
- `Export success rate`: % úspěšných exportů do Asana bez zásahu vývojáře.
- `Median processing time`: medián času zpracování transkriptu.
- Cíl po 2 týdnech pilotu:
  - usability >= 60 %
  - export success >= 95 %
  - median time <= 45 s

### Varianta B – Balanced metriky (doporučené)
- Vše z Varianty A plus:
- `RAG attribution rate`: % odpovědí s citovaným KB zdrojem.
- `Hallucination flags`: počet výstupů označených PM jako fakticky chybné.
- `Edit distance proxy`: hrubý poměr upraveného textu před exportem.
- Cíl po 4 týdnech pilotu:
  - usability >= 70 %
  - hallucination flags <= 10 %
  - attribution >= 80 %

### Varianta C – Strict metriky (enterprise)
- Vše z Varianty B plus:
- Ruční scoring kvality (1–5) ve 4 dimenzích: relevance, úplnost, akčnost, compliance.
- SLA metriky:
  - API p95 latency
  - měsíční dostupnost
  - error budget

## 4) Dokumentace k pozdějšímu rozhodnutí: varianty eval datasetu (původní bod 2)

Poznámka: níže jsou varianty, výběr se udělá později podle kapacity týmu.

### Varianta A – Mini eval (nejrychlejší)
- 10 transkriptů:
  - 4x Iniciace
  - 3x Plánování
  - 2x Realizace
  - 1x Closing
- Ke každému:
  - očekávaná osnova výstupu
  - 3–5 kritických faktů, které musí být správně

### Varianta B – Pilot eval (doporučené)
- 25 transkriptů napříč týmy a typy projektů.
- Obsahuje i „obtížné“ případy:
  - neúplný transcript
  - konfliktní informace
  - transcript bez jasné fáze
- Hodnocení:
  - binární pass/fail checklist + slovní komentář PM.

### Varianta C – Robust eval
- 50+ transkriptů + průběžná měsíční obměna.
- Zlatý standard (golden set) pro regresní test při změně promptu/modelu.
- Automatizovaný eval report po každém release.

## 5) Doporučení k dalšímu kroku
- Pro bezrizikový postup:
  - Hned použít zapracované části z kapitol 1 a 2.
  - O variantách z kapitol 3 a 4 rozhodnout až po prvním interním pilotu.
