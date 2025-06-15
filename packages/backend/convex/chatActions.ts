"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import agent from "./agent";
import { DEFAULT_THREAD_TITLE } from "./chat";

export const sendMessage = action({
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
    const { thread } = await agent.continueThread(ctx, { threadId: useThreadId });
    await thread.generateText({ prompt });
    return { threadId: useThreadId };
  },
});

export const deleteThread = action({
  args: { threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    const thread = await ctx.runQuery(components.agent.threads.getThread, { threadId });
    if (thread === null || thread.userId !== userId) {
      throw new Error("Thread not found");
    }
    await ctx.runAction(components.agent.threads.deleteAllForThreadIdSync, {
      threadId,
    });
    return null;
  },
});

export const startThreadWithAssistant = action({
  args: { message: v.string(), optimisticTitle: v.optional(v.string()) },
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx, { message, optimisticTitle }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }

    let result: { threadId: string; messageId: string };
    try {
      result = await ctx.runMutation(internal.chat.createThreadWithFirstMessage, {
        message,
        optimisticTitle,
      });
    } catch (err) {
      console.error("Failed to create thread", err);
      throw new Error("Could not start a new thread. Please try again.");
    }

    await ctx.scheduler.runAfter(0, internal.chat.generateAssistantReplyAndTitle, {
      threadId: result.threadId,
      messageId: result.messageId,
    });

    return { threadId: result.threadId };
  },
});

export const generateAssistantReplyAndTitle = internalAction({
  args: { threadId: v.string(), messageId: v.string() },
  handler: async (ctx, { threadId, messageId }) => {
    const threadDoc = await ctx.runQuery(components.agent.threads.getThread, {
      threadId,
    });
    const [messageDoc] = await ctx.runQuery(components.agent.messages.getMessagesByIds, {
      messageIds: [messageId],
    });
    if (!threadDoc || !messageDoc) {
      console.warn("Thread or message missing; aborting", { threadId, messageId });
      return;
    }

    try {
      const { thread } = await agent.continueThread(ctx, { threadId });
      const paginated = await agent.listMessages(ctx, {
        threadId,
        paginationOpts: { cursor: null, numItems: 2 },
      });
      const hasReply = paginated.page.some(
        (m) => m.order === messageDoc.order && m.role === "assistant",
      );
      if (!hasReply) {
        await thread.generateText({ promptMessageId: messageId });
      }
    } catch (err) {
      console.error("Assistant reply generation failed", err);
    }

    try {
      const { thread } = await agent.continueThread(ctx, { threadId });
      const meta = await thread.getMetadata();
      if (!meta.title || meta.title === DEFAULT_THREAD_TITLE) {
        const titleResult = await thread.generateText(
          {
            prompt: `Given the following user message, generate a short descriptive chat thread title under 8 words:\n"${messageDoc.text ?? messageDoc.message?.content ?? ""}"`,
          },
          { storageOptions: { saveMessages: "none" } },
        );
        const newTitle =
          titleResult.text?.trim().slice(0, 48) ||
          messageDoc.text?.slice(0, 48) ||
          DEFAULT_THREAD_TITLE;

        const latestMeta = await thread.getMetadata();
        if (!latestMeta.title || latestMeta.title === DEFAULT_THREAD_TITLE) {
          await thread.updateMetadata({ title: newTitle });
        }
      }
    } catch (err) {
      console.error("Thread title generation failed", err);
    }
  },
});
