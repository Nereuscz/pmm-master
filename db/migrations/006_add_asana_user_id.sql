-- Přihlášení přes Asana: identifikátor uživatele z Asany
ALTER TABLE users ADD COLUMN IF NOT EXISTS asana_user_id text UNIQUE;
