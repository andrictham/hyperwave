"use node";

import { v } from "convex/values";

import { internalAction } from "./_generated/server";
import agent from "./agent";

/**
 * Internal action responsible for generating the assistant's reply.
 *
 * This implementation assumes the agent is not configured with a text
 * embedding model. It therefore skips embedding generation and simply
 * continues the thread with the user's saved message.
 */
export const generateAssistantReply = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string() },
  handler: async (ctx, { threadId, promptMessageId }) => {
    const { thread } = await agent.continueThread(ctx, { threadId });
    const result = await thread.streamText(
      { promptMessageId },
      {
        saveStreamDeltas: true,
        providerOptions: {
          openrouter: {
            reasoning: {
              max_tokens: 256,
            },
          },
        },
        contextOptions: {
          searchOptions: { textSearch: true, vectorSearch: false },
        },
      },
    );
    await result.consumeStream();
  },
});
