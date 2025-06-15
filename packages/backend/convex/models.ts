import { v } from "convex/values";

import { query } from "./_generated/server";

/**
 * List of OpenRouter model identifiers allowed for use in the app.
 *
 * This whitelist is referenced both on the client and the server to ensure only
 * approved models may be used. The array is immutable to maintain type-safety
 * when narrowing values.
 */
export const allowedModels = [
  "deepseek/deepseek-r1-0528:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
  "google/gemini-2.0-flash-exp:free",
  "mistralai/mistral-nemo:free",
  "qwen/qwq-32b:free",
  "qwen/qwen3-32b-04-28:free",
] as const;

/**
 * The default model used when a user hasn't explicitly selected one.
 */
export const defaultModel = "deepseek/deepseek-r1-0528:free" as const;

export type ModelConfig = {
  defaultModel: typeof defaultModel;
  models: readonly string[];
};

/**
 * Query returning the server-side model configuration.
 */
export const listModels = query({
  args: {} as Record<never, never>,
  returns: v.object({
    defaultModel: v.string(),
    models: v.array(v.string()),
  }),
  handler: async () => ({
    defaultModel,
    models: [...allowedModels],
  }),
});
