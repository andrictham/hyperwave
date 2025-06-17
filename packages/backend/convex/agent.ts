import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { components } from "./_generated/api";
import { defaultModel } from "./models";

/**
 * Create a new OpenRouter provider instance using the given API key.
 *
 * @param apiKey - OpenRouter API key used for authenticating requests.
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
const chatAgent = new Agent<typeof components.agent>(components.agent, {
  chat: openrouter.chat(defaultModel),
  instructions: "You are a helpful assistant.",
});

export default chatAgent;
