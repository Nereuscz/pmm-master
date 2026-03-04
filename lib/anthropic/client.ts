import Anthropic from "@anthropic-ai/sdk";
import { env } from "../env";

/** Retry Anthropic API calls on 429/timeout. Spec §10.1: max 2 retries, exponential backoff. */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const status =
        e && typeof e === "object" && "status" in e
          ? (e as { status?: number }).status
          : undefined;
      const msg = e instanceof Error ? e.message : "";
      const isRetryable =
        status === 429 ||
        msg.includes("timeout") ||
        msg.includes("ECONNRESET") ||
        msg.includes("ETIMEDOUT");
      if (!isRetryable || attempt === maxRetries) throw e;
      const delayMs = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastError;
}

export const anthropic = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null;

export { env };
