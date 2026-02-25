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
  - `POST /api/kb/search`
  - `POST /api/kb/sync/sharepoint` (simulovaný sync batch)
  - `GET /api/kb/sync/logs`
- Supabase schema baseline: [`db/schema.sql`](/Users/samuelpacek/Desktop/_Projekty/APPKY/PM Assistant/db/schema.sql)
- Vstupní validace přes `zod`
- UI stránky:
  - `/dashboard`, `/projects/new`, `/projects/[id]`, `/process`, `/kb`

## Lokální spuštění

1. Nainstaluj balíčky:
   - `npm install`
2. Vytvoř `.env.local` podle `.env.example`.
3. Spusť SQL schema/migraci v Supabase SQL editoru:
   - `db/schema.sql`
   - `db/migrations/001_v12_upgrade.sql` (pokud už existuje starší schema)
4. Spusť:
   - `npm run dev`

## Poznámky

- `lib/rag.ts` používá lexikální relevance fallback. Další krok může být pgvector similarity RPC.
- Asana endpoint je záměrně simulovaný (bez napojení), ale job/idempotence se ukládá.
- Microsoft autorizace je zatím pouze skeleton bez produkční konfigurace.
