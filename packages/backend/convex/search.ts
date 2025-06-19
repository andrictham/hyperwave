import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Perform a web search using the Jina search API.
 */
export const webSearch = internalAction({
  args: { query: v.string() },
  handler: async (_ctx, { query }) => {
    const apiKey = process.env.JINA_API_KEY;
    if (!apiKey) {
      throw new Error("JINA_API_KEY environment variable is not set");
    }

    const response = await fetch(`https://s.jina.ai/?q=${encodeURIComponent(query)}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Respond-With": "no-content",
      },
    });

    if (!response.ok) {
      throw new Error(`Jina search API returned ${response.status}`);
    }

    return (await response.json()) as unknown;
  },
});
