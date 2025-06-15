import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { components } from "./_generated/api";
import { defaultModel } from "./models";

/**
 * Shared OpenRouter provider used across the backend. The API key should be
 * configured via the `OPENROUTER_API_KEY` environment variable.
 */
export function createProvider(apiKey: string) {
  return createOpenRouter({ apiKey });
}

export const openrouter = createProvider(
  process.env.OPENROUTER_API_KEY ?? "YOUR_API_KEY",
);

/**
 * Agent instance responsible for handling LLM interactions for the support
 * chat. It defaults to the server's `defaultModel` configuration.
 */
const chatAgent = new Agent(components.agent, {
  chat: openrouter.chat(defaultModel),
  instructions: "You are a helpful assistant.",
});

export default chatAgent;
