# PM Assistant

Webová aplikace pro JIC – zpracování PM transkriptů s AI, RAG nad znalostní bází a export do Asany.

## Co je hotové

- Next.js 14 (App Router), TypeScript, Tailwind
- **Auth**: NextAuth + Asana OAuth (přihlášení přes Asana účet)
- **Projekty**: CRUD, historie, kontext, propojení s Asanou
- **Zpracování transkriptu**: AI analýza, doplňující otázky, RAG z KB, export DOCX/PDF
- **Průvodce**: interaktivní PM otázky, generování dokumentace
- **Znalostní báze**: upload souborů (PDF, DOCX, TXT, MD), URL adresy, text; reindexace
- **Asana**: OAuth tokeny, export (simulace – připraveno k napojení API)
- **Audit log**: záznam akcí
- Supabase: PostgreSQL, pgvector pro RAG

## API

- `POST /api/process` – zpracování transkriptu
- `POST /api/asana/export` – export do Asany (idempotence)
- `POST /api/asana/sync` – týdenní sync z Asany (cron, CRON_SECRET)
- `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id`
- `GET/POST /api/kb/documents`, `POST /api/kb/upload`, `POST /api/kb/url`
- `POST /api/kb/sync/sharepoint` (simulovaný)

## Testy

- `npm run test` – Vitest (lib/text, lib/parser, lib/schemas)
- `npm run test:watch` – watch mód

## Lokální spuštění

1. `npm install`
2. Vytvoř `.env.local` podle `.env.example`
3. Spusť SQL v Supabase: `db/schema.sql`, migrace `001`–`013`
4. `npm run dev`

## Poznámky

- RAG: pgvector při `OPENAI_API_KEY`; jinak lexikální fallback
- Rate limiting: 20 req/min (vyžaduje UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
- Asana: simulovaný export; pro produkci napojit Asana API
- Asana sync: `POST /api/asana/sync` s `Authorization: Bearer <CRON_SECRET>` nebo `x-cron-secret` – stáhne tasky z propojených projektů pro AI kontext
