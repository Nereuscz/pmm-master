# PM Assistant

První implementační iterace projektu PM Assistant podle technického zadání v1.2.

## Co je hotové

- Next.js 14 app skeleton (`app/` router)
- Auth skeleton (NextAuth + Azure AD provider, bez ostrého napojení)
- API route pro zpracování transkriptu: `POST /api/process` (processing jobs + project context + change signals)
- API route pro Asana export (simulace + idempotency persistence): `POST /api/asana/export`
- API pro projekty:
  - `GET/POST /api/projects`
  - `GET/PATCH/DELETE /api/projects/:id`
  - `GET /api/projects/:id/sessions`
  - `GET /api/projects/:id/context`
- API pro znalostní bázi:
  - `GET/POST /api/kb/documents`
  - `PATCH/DELETE /api/kb/documents/:id`
  - `POST /api/kb/documents/:id/reindex`
  - `POST /api/kb/upload-parse` (extrakce textu z PDF/DOCX pro stránku Zpracovat)
  - `POST /api/kb/search`
  - `POST /api/kb/sync/sharepoint` (simulovaný sync batch)
  - `GET /api/kb/sync/logs`
- Supabase schema baseline: [`db/schema.sql`](/Users/samuelpacek/Desktop/_Projekty/APPKY/PM Assistant/db/schema.sql)
- Vstupní validace přes `zod`
- UI stránky:
  - `/dashboard`, `/projects/new`, `/projects/[id]`, `/process`, `/kb`

## Testy

- `npm run test` – spustí Vitest (lib/text, lib/parser, lib/schemas)
- `npm run test:watch` – watch mód

## Lokální spuštění

1. Nainstaluj balíčky:
   - `npm install`
2. Vytvoř `.env.local` podle `.env.example`.
3. Spusť SQL schema/migraci v Supabase SQL editoru:
   - `db/schema.sql`
   - `db/migrations/001_v12_upgrade.sql` (pokud už existuje starší schema)
   - `db/migrations/004_audit_log.sql` (audit log pro spec §11.1)
4. Spusť:
   - `npm run dev`

## Poznámky

- `lib/rag.ts` používá lexikální relevance fallback (limit 200 chunků). Při dostupných embeddings se používá pgvector.
- Rate limiting na AI endpointy: 20 req/min na uživatele (vyžaduje UPSTASH_REDIS_REST_URL a UPSTASH_REDIS_REST_TOKEN).
- Asana endpoint je záměrně simulovaný (bez napojení), ale job/idempotence se ukládá.
- Microsoft autorizace je zatím pouze skeleton bez produkční konfigurace.
