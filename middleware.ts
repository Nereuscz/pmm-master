import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// Pokud chybí AZURE_AD_CLIENT_ID nebo NEXTAUTH_SECRET, jedeme v dev/bypass módu –
// middleware prostě propustí všechny requesty a auth řeší auth-guard.ts uvnitř API.
const isAuthEnabled =
  !!process.env.AZURE_AD_CLIENT_ID && !!process.env.NEXTAUTH_SECRET;

// Stránky, které vyžadují přihlášení
const PROTECTED_PATHS = ["/dashboard", "/projects", "/process", "/guide", "/kb"];

function isProtected(pathname: string) {
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
  if (!isAuthEnabled || !isProtected(req.nextUrl.pathname)) {
    return NextResponse.next();
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
    "/kb/:path*"
  ]
};
