import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

import { decryptApiKey, encryptApiKey } from "./apiKeyCipher";

const SECRET = process.env.ENCRYPTION_SECRET ?? "";

export const getApiKey = query({
  args: {},
  returns: v.optional(v.string()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const record = await ctx.db
      .query("user_settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!record) return null;
    return decryptApiKey(record.encryptedApiKey, SECRET);
  },
});

export const saveApiKey = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const encrypted = await encryptApiKey(apiKey, SECRET);
    const existing = await ctx.db
      .query("user_settings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { encryptedApiKey: encrypted });
    } else {
      await ctx.db.insert("user_settings", { userId, encryptedApiKey: encrypted });
    }
  },
});
