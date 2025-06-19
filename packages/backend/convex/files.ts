import { storeFile } from "@convex-dev/agent";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { action } from "./_generated/server";

export const uploadFile = action({
  args: {
    bytes: v.bytes(),
    mimeType: v.string(),
    filename: v.optional(v.string()),
    sha256: v.optional(v.string()),
  },
  handler: async (ctx, { bytes, mimeType, filename, sha256 }) => {
    const blob = new Blob([bytes], { type: mimeType });
    const { file } = await storeFile(ctx, components.agent, blob, filename, sha256);
    return file;
  },
});
