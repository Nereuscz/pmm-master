import { env } from "./env";
import { ensureDb } from "./db";
import crypto from "crypto";

const ASANA_TOKEN_URL = "https://app.asana.com/-/oauth_token";
const REFRESH_BUFFER_MINUTES = 5;

// AES-256-GCM encryption for tokens
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer | null {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptToken(plain: string): string {
  const key = getEncryptionKey();
  if (!key) {
    // Fallback to base64 if no encryption key available (dev only)
    return Buffer.from(plain, "utf-8").toString("base64");
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([cipher.update(plain, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: base64(iv + authTag + ciphertext) prefixed with "enc:" marker
  return "enc:" + Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

function decryptToken(encoded: string | null): string | null {
  if (!encoded) return null;

  // Handle legacy base64-only tokens (without "enc:" prefix)
  if (!encoded.startsWith("enc:")) {
    try {
      return Buffer.from(encoded, "base64").toString("utf-8");
    } catch {
      return null;
    }
  }

  const key = getEncryptionKey();
  if (!key) return null;

  try {
    const data = Buffer.from(encoded.slice(4), "base64");
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf-8");
  } catch {
    return null;
  }
}

/**
 * Uloží Asana OAuth tokeny pro uživatele (používá callback po výměně kódu).
 */
export async function saveAsanaTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number
): Promise<void> {
  const db = ensureDb();
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
  const { error } = await db
    .from("users")
    .update({
      asana_token_encrypted: encryptToken(accessToken),
      asana_refresh_token: encryptToken(refreshToken),
      asana_token_expires_at: expiresAt,
    })
    .eq("id", userId);

  if (error) {
    console.error("[asana-auth] Failed to save tokens:", error.message);
  }
}

/**
 * Vrátí platný Asana access token pro uživatele.
 * Pokud token expiruje do 5 minut, provede refresh.
 * Vrátí null pokud uživatel nemá připojenou Asanu nebo refresh selže.
 */
export async function getValidAsanaToken(userId: string): Promise<string | null> {
  const db = ensureDb();
  const { data } = await db
    .from("users")
    .select("asana_token_encrypted, asana_refresh_token, asana_token_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (!data?.asana_token_encrypted) return null;

  const accessToken = decryptToken(data.asana_token_encrypted);
  const refreshToken = decryptToken(data.asana_refresh_token);

  if (!accessToken) return null;

  const expiresAt = data.asana_token_expires_at
    ? new Date(data.asana_token_expires_at).getTime()
    : 0;
  const now = Date.now();
  const bufferMs = REFRESH_BUFFER_MINUTES * 60 * 1000;

  if (expiresAt > 0 && now + bufferMs < expiresAt) {
    return accessToken;
  }

  if (!refreshToken || !env.ASANA_CLIENT_ID || !env.ASANA_CLIENT_SECRET) {
    return expiresAt > 0 && now < expiresAt ? accessToken : null;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.ASANA_CLIENT_ID,
    client_secret: env.ASANA_CLIENT_SECRET,
  });

  const res = await fetch(ASANA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    return null;
  }

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const newAccessToken = json.access_token;
  const newRefreshToken = json.refresh_token ?? refreshToken;
  const expiresIn = json.expires_in ?? 3600;

  if (!newAccessToken) return null;

  const newExpiresAt = new Date(now + expiresIn * 1000).toISOString();

  const { error } = await db
    .from("users")
    .update({
      asana_token_encrypted: encryptToken(newAccessToken),
      asana_refresh_token: encryptToken(newRefreshToken),
      asana_token_expires_at: newExpiresAt,
    })
    .eq("id", userId);

  if (error) {
    console.error("[asana-auth] Failed to persist refreshed tokens:", error.message);
  }

  return newAccessToken;
}
