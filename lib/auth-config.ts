export function hasAuthConfig(): boolean {
  return (
    !!process.env.ASANA_CLIENT_ID &&
    !!process.env.ASANA_CLIENT_SECRET &&
    !!process.env.NEXTAUTH_SECRET
  );
}

export function isDevAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
}
