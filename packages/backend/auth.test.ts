import { expect, test } from "vitest";
import { requireOwnThread, requireUserId, type Ctx } from "./convex/threadOwnership";

function mockCtx(identity: { subject?: string | null }, thread?: { userId: string } | null): Ctx {
  return {
    auth: { getUserIdentity: async () => (identity.subject ? { subject: identity.subject } : null) },
    async runQuery(_fn: unknown, _args: unknown) {
      return thread ?? null;
    },
  } as Ctx;
}

test("requireUserId throws when unauthenticated", async () => {
  const ctx = mockCtx({ subject: null });
  await expect(requireUserId(ctx)).rejects.toThrowError();
});

test("requireUserId returns user id", async () => {
  const ctx = mockCtx({ subject: "u1|s" });
  await expect(requireUserId(ctx)).resolves.toBe("u1");
});

test("requireOwnThread checks ownership", async () => {
  const ctx = mockCtx({ subject: "u1|s" }, { userId: "u1" });
  await expect(requireOwnThread(ctx, "t1")).resolves.toMatchObject({ userId: "u1" });
});

test("requireOwnThread throws when thread missing", async () => {
  const ctx = mockCtx({ subject: "u1|s" }, null);
  await expect(requireOwnThread(ctx, "t1")).rejects.toThrowError();
});

test("requireOwnThread throws when not owner", async () => {
  const ctx = mockCtx({ subject: "u1|s" }, { userId: "u2" });
  await expect(requireOwnThread(ctx, "t1")).rejects.toThrowError();
});
