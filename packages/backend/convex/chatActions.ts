import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";
import agent from "./agent";

/**
 * Save a user's message and schedule asynchronous generation of the assistant's
 * reply. If no threadId is provided a new thread is created.
 */
export const sendMessage = mutation({
  args: { threadId: v.optional(v.string()), prompt: v.string() },
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx, { threadId, prompt }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    let useThreadId = threadId;
    if (!useThreadId) {
      const created = await agent.createThread(ctx, { userId });
      useThreadId = created.threadId;
    }
    const { messageId } = await agent.saveMessage(ctx, {
      threadId: useThreadId,
      userId,
      prompt,
      skipEmbeddings: true,
    });
    await ctx.scheduler.runAfter(0, internal.chatBackground.generateAssistantReply, {
      threadId: useThreadId,
      promptMessageId: messageId,
    });
    return { threadId: useThreadId };
  },
});
