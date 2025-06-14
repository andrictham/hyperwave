"use node";

import { v } from "convex/values";

import { internalAction } from "./_generated/server";
import agent from "./agent";

/**
 * Internal action responsible for generating the assistant's reply. It first
 * generates embeddings for the prompt message, then continues the thread to
 * create the assistant message.
 */
export const generateAssistantReply = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string() },
  handler: async (ctx, { threadId, promptMessageId }) => {
    await agent.generateAndSaveEmbeddings(ctx, { messageIds: [promptMessageId] });
    const { thread } = await agent.continueThread(ctx, { threadId });
    await thread.generateText({ promptMessageId });
  },
});
