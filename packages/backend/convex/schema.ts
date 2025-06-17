import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  user_settings: defineTable({
    userId: v.id("users"),
    encryptedApiKey: v.string(),
  }).index("by_userId", ["userId"]),
});
