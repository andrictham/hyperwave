import { vMessageDoc, vStreamArgs, vThreadDoc } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";
import agent from "./agent";
import { requireOwnThread, requireUserId } from "./threadOwnership";

///////////////////////////////////////////////////
//                                               //
//  New implementations based on agent examples  //
//                                               //
///////////////////////////////////////////////////

// TODO: Switch client to use new implementations
// TODO: Remove old implementations

/**
 * Create a new thread
 */
export const createThread = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const { threadId } = await agent.createThread(ctx, { userId });
    return threadId;
  },
});

/**
 * Streaming, where generate the prompt message first, then asynchronously
 * generate the stream response.
 */
export const streamMessageAsynchronously = mutation({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    await requireOwnThread(ctx, threadId);
    const { messageId } = await agent.saveMessage(ctx, {
      threadId,
      prompt,
      // we're in a mutation, so skip embeddings for now. They'll be generated
      // lazily when streaming text.
      skipEmbeddings: true,
    });
    await ctx.scheduler.runAfter(0, internal.chat.streamMessage, {
      threadId,
      promptMessageId: messageId,
    });
  },
});

export const streamMessage = internalAction({
  args: { promptMessageId: v.string(), threadId: v.string() },
  handler: async (ctx, { promptMessageId, threadId }) => {
    const { thread } = await agent.continueThread(ctx, { threadId });
    const result = await thread.streamText({ promptMessageId }, { saveStreamDeltas: true });
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

/////////////////////////////////////
//                                 //
//  Old implementations by Codex   //
//                                 //
/////////////////////////////////////

export const listThreads = query({
  args: {},
  returns: v.array(vThreadDoc),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const result = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
      order: "desc",
      paginationOpts: { cursor: null, numItems: 50 },
    });
    return result.page;
  },
});

export const getThread = query({
  args: {
    threadId: v.string(),
  },
  returns: v.union(vThreadDoc, v.null()),
  handler: async (ctx, { threadId }) => {
    const { thread } = await requireOwnThread(ctx, threadId);
    return thread;
  },
});

export const listThreadMessagesOld = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  returns: v.object({
    page: v.array(vMessageDoc),
    continueCursor: v.string(),
    isDone: v.boolean(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
    ),
    streams: v.optional(v.any()),
  }),
  handler: async (ctx, { threadId, paginationOpts, streamArgs }) => {
    await requireOwnThread(ctx, threadId);
    const paginated = await agent.listMessages(ctx, {
      threadId,
      paginationOpts,
    });
    const streams = await agent.syncStreams(ctx, { threadId, streamArgs });
    return { ...paginated, streams };
  },
});
