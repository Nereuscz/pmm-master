import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

const isProduction = process.env.NODE_ENV === "production";
const hasAuthConfig =
  !!process.env.ASANA_CLIENT_ID &&
  !!process.env.ASANA_CLIENT_SECRET &&
  !!process.env.NEXTAUTH_SECRET;

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

// NextAuth middleware pro produkci
const authMiddleware = withAuth({
  pages: { signIn: "/signin" }
});

export function middleware(req: NextRequest) {
  if (!isProtected(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Dev: explicitní bypass pro lokální vývoj bez OAuth konfigurace.
  if (!hasAuthConfig && !isProduction) {
    return bypassMiddleware(req);
  }

  // Prod: fail closed, aby chybějící env nevypnuly ochranu privátních stránek.
  if (!hasAuthConfig && isProduction) {
    return NextResponse.json(
      { error: "Auth není správně nakonfigurovaná (missing env)." },
      { status: 503 }
    );
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
