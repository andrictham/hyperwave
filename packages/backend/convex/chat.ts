import { vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { requireOwnThread, requireUserId } from "../utils/threadOwnership";
import { internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";
import agent, { openrouter } from "./agent";
import { allowedModels, defaultModel } from "./models";

/**
 * Type guard ensuring a value is part of the `allowedModels` whitelist.
 */
function isAllowedModel(value: string): value is (typeof allowedModels)[number]["id"] {
  return allowedModels.some((m) => m.id === value);
}

/**
 * Saves user's message then asynchronously streams the generated response.
 */
export const streamMessageAsynchronously = mutation({
  args: {
    prompt: v.string(), // User message
    threadId: v.string(),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { prompt, threadId, model }) => {
    const userId = await requireUserId(ctx);

    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    await requireOwnThread(ctx, threadId);

    // Save user message
    const { messageId } = await agent.saveMessage(ctx, {
      threadId,
      prompt,
      // we're in a mutation, so skip embeddings for now. They'll be generated lazily when streaming text.
      skipEmbeddings: true,
    });

    // Auto-title untitled thread
    await ctx.scheduler.runAfter(0, internal.thread.maybeUpdateThreadTitle, {
      threadId,
    });

    // Stream chat messages
    await ctx.scheduler.runAfter(0, internal.chat.streamMessage, {
      threadId,
      promptMessageId: messageId,
      model,
    });

    return { threadId };
  },
});

export const streamMessage = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string(), model: v.optional(v.string()) },
  handler: async (ctx, { promptMessageId, threadId, model }) => {
    const { thread } = await agent.continueThread(ctx, { threadId });
    const modelId = model && isAllowedModel(model) ? model : defaultModel;
    const result = await thread.streamText(
      { promptMessageId, model: openrouter.chat(modelId) },
      { saveStreamDeltas: true },
    );
    await result.consumeStream();
  },
});

/**
 * Query & subscribe to messages & threads
 */
export const listThreadMessages = query({
  args: {
    // These arguments are required:
    threadId: v.string(),
    paginationOpts: paginationOptsValidator, // Used to paginate the messages.
    streamArgs: vStreamArgs, // Used to stream messages.
  },
  handler: async (ctx, args) => {
    const { threadId, paginationOpts, streamArgs } = args;
    // await authorizeThreadAccess(ctx, threadId);
    await requireOwnThread(ctx, threadId);
    const streams = await agent.syncStreams(ctx, { threadId, streamArgs });
    // Here you could filter out / modify the stream of deltas / filter out
    // deltas.

    const paginated = await agent.listMessages(ctx, {
      threadId,
      paginationOpts,
    });
    // Here you could filter out metadata that you don't want from any optional
    // fields on the messages.
    // You can also join data onto the messages. They need only extend the
    // MessageDoc type.
    // { ...messages, page: messages.page.map(...)}

    return {
      ...paginated,
      streams,

      // ... you can return other metadata here too.
      // note: this function will be called with various permutations of delta
      // and message args, so returning derived data .
    };
  },
});
