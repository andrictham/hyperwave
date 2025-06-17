import { Thread, vMessageDoc, vStreamArgs, vThreadDoc } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ActionCtx, action, query } from "./_generated/server";
import agent, { createProvider } from "./agent";
import { decryptApiKey } from "./apiKeyCipher";
import { allowedModels, defaultModel } from "./models";
/** Type guard ensuring a value is part of the `allowedModels` whitelist. */
function isAllowedModel(value: string): value is (typeof allowedModels)[number] {
  return allowedModels.includes(value as (typeof allowedModels)[number]);
}

/**
 * Updates the thread title if it's missing or generic.
 * @param thread - The thread to potentially update
 * @param ctx - The Convex context
 */
async function maybeUpdateThreadTitle(thread: Thread<unknown>, ctx: ActionCtx) {
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

import { api, components, internal } from "./_generated/api";
import { internalAction, mutation, query } from "./_generated/server";
import agent, { openrouter } from "./agent";
import { allowedModels, defaultModel } from "./models";
import { requireOwnThread, requireUserId } from "./threadOwnership";

/**
 * Type guard ensuring a value is part of the `allowedModels` whitelist.
 */
function isAllowedModel(value: string): value is (typeof allowedModels)[number]["id"] {
  return allowedModels.some((m) => m.id === value);
}

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
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { userId }) => {
    const useUserId = userId || (await requireUserId(ctx));

/**
 * Stream a user message to the specified thread, creating the thread if
 * necessary. The resulting text is emitted incrementally and persisted to the
 * database. The user's personal API key is used when provided.
 */
export const streamMessage = action({
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

    const record = await ctx.db
      .query("user_settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const apiKey = record
      ? await decryptApiKey(
          record.encryptedApiKey,
          process.env.ENCRYPTION_SECRET ?? "",
        )
      : process.env.OPENROUTER_API_KEY ?? "";
    const provider = createProvider(apiKey);
    const modelId = model && isAllowedModel(model) ? model : defaultModel;

    await thread.streamText(
      { prompt, model: provider.chat(modelId) },
      { saveStreamDeltas: true },
    );

    await maybeUpdateThreadTitle(thread, ctx);

    return { threadId: useThreadId };
  },
});
    const { threadId } = await agent.createThread(ctx, { userId: useUserId });
    return threadId;
  },
});

/**
 * Streaming, where generate the prompt message first, then asynchronously
 * generate the stream response.
 */
export const streamMessageAsynchronously = mutation({
  args: {
    prompt: v.string(),
    threadId: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { prompt, threadId, model }) => {
    const userId = await requireUserId(ctx);

    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    // TODO: if no threadId then create one

    if (threadId) {
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
        model,
      });
      // TODO: Schedule `maybeUpdateThreadTitle` to run as well

      return { threadId };
    }
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
