import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Lazily construct the OpenAI client. Constructing at module scope crashes
 * build-time page-data collection (and any env-less context) because the SDK
 * throws when OPENAI_API_KEY is missing. Defer to first request instead.
 */
export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
