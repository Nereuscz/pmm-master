import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Generates a 1536-dimensional embedding for the given text using
 * OpenAI text-embedding-3-small. Returns null if OPENAI_API_KEY is
 * not configured – callers should fall back to lexical scoring.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const openai = getClient();
  if (!openai) return null;

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8192),
      dimensions: 1536
    });
    return response.data[0].embedding;
  } catch {
    return null;
  }
}
