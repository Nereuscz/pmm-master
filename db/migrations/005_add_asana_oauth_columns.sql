-- Asana OAuth: refresh token a expirace access tokenu
ALTER TABLE users ADD COLUMN IF NOT EXISTS asana_refresh_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS asana_token_expires_at timestamptz;
