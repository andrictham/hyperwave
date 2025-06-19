import { Agent, createTool } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { internal, components } from "./_generated/api";
import { defaultModel } from "./models";

/**
 * Shared OpenRouter provider used across the backend. The API key should be
 * configured via the `OPENROUTER_API_KEY` environment variable.
 */
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "YOUR_API_KEY",
});

/**
 * Agent instance responsible for handling LLM interactions for the support
 * chat. It defaults to the server's `defaultModel` configuration.
 */
const chatAgent = new Agent(components.agent, {
  chat: openrouter.chat(defaultModel),
  instructions: "You are a helpful assistant.",
});

/**
 * Tool for performing a web search using the Jina API. This is exported
 * separately so it can be provided per-message when needed.
 */
export const webSearchTool = createTool({
  description: "Search the web using the Jina search API",
  args: z.object({ query: z.string().describe("The search query") }),
  // Explicitly annotate the return type to avoid type cycles in generated types.
  handler: async (ctx, { query }): Promise<unknown> =>
    ctx.runAction(internal.search.webSearch, { query }),
});

export default chatAgent;
