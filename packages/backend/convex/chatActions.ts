"use node";

import { type Thread } from "@convex-dev/agent";
import { ConvexError, v } from "convex/values";

import { components } from "./_generated/api";
import { action } from "./_generated/server";
import agent, { openrouter } from "./agent";
import { allowedModels, defaultModel } from "./models";
import { requireOwnThread, requireUserId } from "./threadOwnership";

/**
 * Type guard ensuring a value is part of the `allowedModels` whitelist.
 */
function isAllowedModel(value: string): value is (typeof allowedModels)[number] {
  return allowedModels.includes(value as (typeof allowedModels)[number]);
}

/**
 * Updates the thread title if it's missing or generic.
 * @param thread - The thread to potentially update
 * @param ctx - The Convex action context
 */
async function maybeUpdateThreadTitle(thread: Thread<any>, ctx: any) {
  const threadData = await ctx.runQuery(components.agent.threads.getThread, {
    threadId: thread.threadId,
  });
  const existingTitle = threadData?.title;

  if (!existingTitle || existingTitle === "Untitled") {
    const { text } = await thread.generateText(
      {
        prompt:
          "Reply ONLY with a short, concise title for this conversation of maximum 5 words or 40 characters. SAY NOTHING ELSE.",
      },
      { storageOptions: { saveMessages: "none" } },
    );
    if (text) {
      await ctx.runMutation(components.agent.threads.updateThread, {
        threadId: thread.threadId,
        patch: { title: text },
      });
    }
  }
}

/**
 * Action used by the client to send a prompt to a given thread. If no thread
 * ID is provided, a new thread will be created for the authenticated user.
 * Optionally accepts a specific model ID. Any invalid model IDs are ignored and
 * the server's default model is used instead.
 */
export const sendMessage = action({
  args: {
    threadId: v.optional(v.string()),
    prompt: v.string(),
    model: v.optional(v.string()),
  },
  returns: v.object({ threadId: v.string() }),
  handler: async (ctx, { threadId, prompt, model }) => {
    const userId = await requireUserId(ctx);
    if (threadId) {
      await requireOwnThread(ctx, threadId);
    }
    let useThreadId = threadId;
    if (!useThreadId) {
      const created = await agent.createThread(ctx, { userId });
      useThreadId = created.threadId;
    }
    const { thread } = await agent.continueThread(ctx, {
      threadId: useThreadId,
    });
    const modelId = model && isAllowedModel(model) ? model : defaultModel;
    await thread.generateText({ prompt, model: openrouter.chat(modelId) });

    // Auto-generate title for new threads or threads with generic titles
    await maybeUpdateThreadTitle(thread, ctx);

    return { threadId: useThreadId };
  },
});

/**
 * Remove a thread and all of its messages. Only the owning user is allowed to
 * perform this action.
 */
export const deleteThread = action({
  args: { threadId: v.string() },
  returns: v.null(),
  handler: async (ctx, { threadId }) => {
    await requireOwnThread(ctx, threadId);
    await ctx.runAction(components.agent.threads.deleteAllForThreadIdSync, {
      threadId,
    });
    return null;
  },
});

export const updateThread = action({
  args: {
    threadId: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.object({
    _id: v.string(),
    _creationTime: v.number(),
    status: v.union(v.literal("active"), v.literal("archived")),
    title: v.optional(v.string()),
    userId: v.optional(v.string()),
  }),
  handler: async (ctx, { threadId, title }) => {
    await requireOwnThread(ctx, threadId);

    const result = await ctx.runMutation(components.agent.threads.updateThread, {
      threadId,
      patch: { title },
    });

    if (!result) {
      throw new ConvexError("Failed to update thread");
    }

    return result;
  },
});
