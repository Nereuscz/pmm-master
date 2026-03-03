import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { saveAsanaTokens } from "@/lib/asana-auth";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ASANA_TOKEN_URL = "https://app.asana.com/-/oauth_token";
const COOKIE_NAME = "asana_oauth_state";

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const redirectBase = new URL("/settings", baseUrl);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;

  cookieStore.delete(COOKIE_NAME);

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || !code || !state || !cookieValue) {
    redirectBase.searchParams.set("asana", "error");
    redirectBase.searchParams.set("msg", "invalid");
    return NextResponse.redirect(redirectBase);
  }

  const [payloadB64] = cookieValue.split(".");
  if (!payloadB64) {
    redirectBase.searchParams.set("asana", "error");
    return NextResponse.redirect(redirectBase);
  }

  const expectedSig = signPayload(
    Buffer.from(payloadB64, "base64url").toString("utf-8"),
    secret
  );
  const actualSig = cookieValue.split(".")[1];
  if (expectedSig !== actualSig) {
    redirectBase.searchParams.set("asana", "error");
    return NextResponse.redirect(redirectBase);
  }

  let payload: { state: string; userId: string };
  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    ) as { state: string; userId: string };
  } catch {
    redirectBase.searchParams.set("asana", "error");
    return NextResponse.redirect(redirectBase);
  }

  if (payload.state !== state || !payload.userId) {
    redirectBase.searchParams.set("asana", "error");
    return NextResponse.redirect(redirectBase);
  }

  const clientId = env.ASANA_CLIENT_ID;
  const clientSecret = env.ASANA_CLIENT_SECRET;
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/auth/asana/callback`;

  if (!clientId || !clientSecret) {
    redirectBase.searchParams.set("asana", "error");
    redirectBase.searchParams.set("msg", "config");
    return NextResponse.redirect(redirectBase);
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(ASANA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    redirectBase.searchParams.set("asana", "error");
    redirectBase.searchParams.set("msg", "token");
    return NextResponse.redirect(redirectBase);
  }

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const accessToken = json.access_token;
  const refreshToken = json.refresh_token;
  const expiresIn = json.expires_in ?? 3600;

  if (!accessToken || !refreshToken) {
    redirectBase.searchParams.set("asana", "error");
    return NextResponse.redirect(redirectBase);
  }

  try {
    await saveAsanaTokens(
      payload.userId,
      accessToken,
      refreshToken,
      expiresIn
    );
  } catch {
    redirectBase.searchParams.set("asana", "error");
    redirectBase.searchParams.set("msg", "save");
    return NextResponse.redirect(redirectBase);
  }

  redirectBase.searchParams.set("asana", "connected");
  return NextResponse.redirect(redirectBase);
}
