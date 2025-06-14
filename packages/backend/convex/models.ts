import { v } from "convex/values";

import { query } from "./_generated/server";

export const allowedModels = [
  "deepseek/deepseek-chat-v3-0324:free",
  "deepseek/deepseek-r1-0528:free",
  "deepseek/deepseek-r1:free",
  "google/gemma-3-27b-it:free",
  "google/gemini-2.0-flash-exp:free",
  "mistralai/mistral-nemo:free",
  "qwen/qwq-32b:free",
  "qwen/qwen3-32b-04-28:free",
] as const;

export const defaultModel = "deepseek/deepseek-r1-0528:free" as const;

export type ModelConfig = {
  defaultModel: typeof defaultModel;
  models: readonly string[];
};

export const listModels = query({
  args: {},
  returns: v.object({
    defaultModel: v.string(),
    models: v.array(v.string()),
  }),
  handler: async () => ({
    defaultModel,
    models: [...allowedModels],
  }),
});
