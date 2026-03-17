/**
 * Centralized API error logging.
 * In production, consider integrating Sentry or similar.
 */
export function logApiError(route: string, err: unknown): void {
  try {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error(`[API ${route}]`, message, stack ?? "");
  } catch {
    // console.error itself should never throw, but guard against custom environments
  }
}
