import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api";
import { type QueryCtx, type ActionCtx } from "./_generated/server";
import type { ThreadDoc } from "@convex-dev/agent";

/** Convex context that can run queries, either from a query or an action. */
export type Ctx = QueryCtx | ActionCtx;

/**
 * Ensure the caller is authenticated and owns the specified thread.
 *
 * @param ctx - A Convex query or action context.
 * @param threadId - The thread ID to verify ownership of.
 * @returns The thread document if ownership is verified.
 * @throws ConvexError if the user is not authenticated or doesn't own the thread.
 */
export async function requireOwnThread(
  ctx: Ctx,
  threadId: string,
): Promise<{ thread: ThreadDoc; userId: string }> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Not authenticated");
  }
  const thread = await ctx.runQuery(components.agent.threads.getThread, {
    threadId,
  });
  if (thread === null || thread.userId !== userId) {
    throw new ConvexError("Thread not found");
  }
  return { thread, userId };
}

/**
 * Retrieve the authenticated user's ID or throw an error if unauthenticated.
 *
 * @param ctx - A Convex query or action context.
 * @returns The authenticated user's ID.
 * @throws ConvexError if the user is not authenticated.
 */
export async function requireUserId(ctx: Ctx): Promise<string> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("Not authenticated");
  }
  return userId;
}
