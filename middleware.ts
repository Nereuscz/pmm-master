import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { hasAuthConfig, isDevAuthBypassEnabled } from "./lib/auth-config";

// Stránky a API routes, které vyžadují přihlášení
const PROTECTED_PATHS = ["/dashboard", "/projects", "/process", "/guide", "/kb", "/settings", "/admin"];
const PUBLIC_API_PATHS = ["/api/auth", "/api/health"];

function isProtected(pathname: string) {
  // API routes are protected by default, except public ones
  if (pathname.startsWith("/api/")) {
    return !PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));
  }
  return PROTECTED_PATHS.some((p) => pathname.startsWith(p));
}

// Dev/bypass middleware – prostě přepustí vše
function bypassMiddleware(_req: NextRequest) {
  return NextResponse.next();
}

function authUnavailableResponse(req: NextRequest) {
  const message =
    "Auth není správně nakonfigurovaná. Doplň OAuth env, nebo explicitně zapni DEV_AUTH_BYPASS=true jen pro lokální vývoj.";

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: message }, { status: 503 });
  }

  return new NextResponse(message, {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// NextAuth middleware pro produkci
const authMiddleware = withAuth({
  pages: { signIn: "/signin" }
});

export function middleware(req: NextRequest) {
  if (!isProtected(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Dev: explicitní bypass pro lokální vývoj bez OAuth konfigurace.
  if (!hasAuthConfig()) {
    if (isDevAuthBypassEnabled()) {
      return bypassMiddleware(req);
    }

    // Fail closed i v devu, pokud bypass není explicitně povolen.
    return authUnavailableResponse(req);
  }

  // Explicitní bypass pro lokální vývoj.
  if (isDevAuthBypassEnabled()) {
    return bypassMiddleware(req);
  }

  // @ts-expect-error withAuth signature
  return authMiddleware(req);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/process/:path*",
    "/guide/:path*",
    "/kb/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/:path*"
  ]
};
