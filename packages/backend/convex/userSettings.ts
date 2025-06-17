import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { encryptApiKey } from "./apiKeyCipher";

/**
 * Secret used to encrypt user API keys. Must be a base64url encoded 32 byte string.
 *
 * This value is read from the `ENCRYPTION_SECRET` environment variable.
 * Convex will expose this value to all functions and actions. Ensure it is
 * configured via the Convex dashboard and never committed to version control.
 */
// Non-exported constant to avoid accidental exposure
const SECRET = process.env.ENCRYPTION_SECRET ?? "";

/**
 * Determine whether the authenticated user has previously stored an API key.
 */
export const hasApiKey = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const record = await ctx.db
      .query("user_settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return Boolean(record);
  },
});

/**
 * Store or remove the user's API key.
 *
 * Passing an empty string deletes the stored key. Otherwise the key is
 * encrypted and persisted in the `user_settings` table.
 */
export const saveApiKey = mutation({
  args: { apiKey: v.string() },
  returns: v.null(),
  handler: async (ctx, { apiKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    const existing = await ctx.db
      .query("user_settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (apiKey.trim() === "") {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return null;
    }
    if (!apiKey.startsWith("sk-or-")) {
      throw new ConvexError("invalid key");
    }
    const encrypted = await encryptApiKey(apiKey, SECRET);
    if (existing) {
      await ctx.db.patch(existing._id, { encryptedApiKey: encrypted });
    } else {
      await ctx.db.insert("user_settings", { userId, encryptedApiKey: encrypted });
    }
    return null;
  },
});
