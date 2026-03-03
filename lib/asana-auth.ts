import { env } from "./env";
import { ensureDb } from "./db";

const ASANA_TOKEN_URL = "https://app.asana.com/-/oauth_token";
const REFRESH_BUFFER_MINUTES = 5;

function decodeToken(encoded: string | null): string | null {
  if (!encoded) return null;
  try {
    return Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

function encodeToken(plain: string): string {
  return Buffer.from(plain, "utf-8").toString("base64");
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
  await db
    .from("users")
    .update({
      asana_token_encrypted: encodeToken(accessToken),
      asana_refresh_token: encodeToken(refreshToken),
      asana_token_expires_at: expiresAt,
    })
    .eq("id", userId);
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

  const accessToken = decodeToken(data.asana_token_encrypted);
  const refreshToken = decodeToken(data.asana_refresh_token);

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

  await db
    .from("users")
    .update({
      asana_token_encrypted: encodeToken(newAccessToken),
      asana_refresh_token: encodeToken(newRefreshToken),
      asana_token_expires_at: newExpiresAt,
    })
    .eq("id", userId);

  return newAccessToken;
}
