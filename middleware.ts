export { default } from "next-auth/middleware";

// Ochrana stránek aplikace – přesměruje na /signin pokud uživatel není přihlášen.
// API routes mají vlastní auth kontroly uvnitř handlerů (viz lib/auth-guard.ts).
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/process/:path*",
    "/guide/:path*",
    "/kb/:path*"
  ]
};
