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
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    name: "DeepSeek Chat v3",
    gateway: "openrouter",
  },
  {
    id: "deepseek/deepseek-r1-0528:free",
    name: "DeepSeek R1",
    gateway: "openrouter",
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 Legacy",
    gateway: "openrouter",
  },
  {
    id: "moonshotai/kimi-dev-72b:free",
    name: "Kimi Dev 72B",
    gateway: "openrouter",
  },
  {
    id: "mistralai/mistral-nemo:free",
    name: "Mistral Nemo",
    gateway: "openrouter",
  },
  {
    id: "mistralai/devstral-small:free",
    name: "Devstral Small",
    gateway: "openrouter",
  },
  {
    id: "qwen/qwq-32b:free",
    name: "Qwen QWQ 32B",
    gateway: "openrouter",
  },
  {
    id: "qwen/qwen3-32b-04-28:free",
    name: "Qwen3 32B",
    gateway: "openrouter",
  },
  {
    id: "meta-llama/llama-3.3-8b-instruct:free",
    name: "Llama 3.3 8B Instruct",
    gateway: "openrouter",
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    gateway: "openrouter",
  },
] as const;

/**
 * The default model used when a user hasn't explicitly selected one.
 */
export const defaultModel = allowedModels[0].id as (typeof allowedModels)[number]["id"];

export type ModelInfo = (typeof allowedModels)[number];

export type ModelConfig = {
  defaultModel: ModelInfo["id"];
  models: readonly ModelInfo[];
};

/**
 * Query returning the server-side model configuration.
 */
export const listModels = query({
  args: {} as Record<never, never>,
  returns: v.object({
    defaultModel: v.string(),
    models: v.array(v.object({ id: v.string(), name: v.string(), gateway: v.string() })),
  }),
  handler: async () => ({
    defaultModel,
    models: [...allowedModels],
  }),
});
