import { storeFile, getFile } from "@convex-dev/agent";
import { v } from "convex/values";
import { requireOwnThread, requireUserId } from "../utils/threadOwnership";
import { internal, components } from "./_generated/api";
import { action, mutation } from "./_generated/server";
import agent from "./agent";

/**
 * Upload a file to Convex file storage via the agent component.
 */
export const uploadFile = action({
  args: {
    file: v.bytes(),
    mimeType: v.string(),
    filename: v.optional(v.string()),
    sha256: v.optional(v.string()),
  },
  handler: async (ctx, { file, mimeType, filename, sha256 }) => {
    const blob = new Blob([file], { type: mimeType });
    const { file: stored } = await storeFile(
      ctx,
      components.agent,
      blob,
      filename,
      sha256,
    );
    return stored;
  },
});

/**
 * Save a user message referencing a previously uploaded file and
 * asynchronously stream the assistant response.
 */
export const streamFileMessageAsynchronously = mutation({
  args: {
    threadId: v.string(),
    fileId: v.string(),
    prompt: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { threadId, fileId, prompt, model }) => {
    await requireUserId(ctx);
    await requireOwnThread(ctx, threadId);
    const { filePart, imagePart } = await getFile(ctx, components.agent, fileId);
    const { messageId } = await agent.saveMessage(ctx, {
      threadId,
      message: {
        role: "user",
        content: [
          imagePart ?? filePart,
          ...(prompt ? [{ type: "text", text: prompt }] : []),
        ],
      },
      metadata: { fileIds: [fileId] },
      skipEmbeddings: true,
    });

    await ctx.scheduler.runAfter(0, internal.thread.maybeUpdateThreadTitle, {
      threadId,
    });

    await ctx.scheduler.runAfter(0, internal.chat.streamMessage, {
      threadId,
      promptMessageId: messageId,
      model,
    });

    return { threadId };
  },
});
