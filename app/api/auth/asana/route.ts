import { NextResponse } from "next/server";
import { getAuthUser, unauthorized, canProcess, forbidden } from "@/lib/auth-guard";
import { env } from "@/lib/env";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ASANA_AUTH_URL = "https://app.asana.com/-/oauth_authorize";
const SCOPE = "projects:read tasks:read tasks:write tasks:delete";
const COOKIE_NAME = "asana_oauth_state";
const COOKIE_MAX_AGE = 600; // 10 min

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  if (!canProcess(user)) return forbidden();

  const clientId = env.ASANA_CLIENT_ID;
  const secret = process.env.NEXTAUTH_SECRET;
  const baseUrl = process.env.NEXTAUTH_URL;

  if (!clientId || !secret || !baseUrl) {
    return NextResponse.redirect(
      new URL("/settings?asana=error&msg=config", baseUrl)
    );
  }

  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/auth/asana/callback`;
  const state = crypto.randomBytes(32).toString("hex");

  const payload = JSON.stringify({ state, userId: user.id });
  const signature = signPayload(payload, secret);
  const cookieValue = Buffer.from(payload, "utf-8").toString("base64url") + "." + signature;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: SCOPE,
  });

  return NextResponse.redirect(`${ASANA_AUTH_URL}?${params.toString()}`);
}
