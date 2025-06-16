import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { encryptApiKey } from "./apiKeyCipher";

/**
 * Secret used to encrypt user API keys. Must be a 32 byte string.
 *
 * This value is read from the `ENCRYPTION_SECRET` environment variable.
 * Convex will expose this value to all functions and actions. Ensure it is
 * configured via the Convex dashboard and never committed to version control.
 */
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
  handler: async (ctx, { apiKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("user_settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (apiKey.trim() === "") {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return;
    }
    const encrypted = await encryptApiKey(apiKey, SECRET);
    if (existing) {
      await ctx.db.patch(existing._id, { encryptedApiKey: encrypted });
    } else {
      await ctx.db.insert("user_settings", { userId, encryptedApiKey: encrypted });
    }
  },
});
