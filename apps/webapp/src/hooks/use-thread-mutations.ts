import { api } from "@hyperwave/backend/convex/_generated/api";
import { useMutation } from "convex/react";

/**
 * Provides thread-related mutation functions with built-in optimistic updates.
 * Use this hook to obtain `updateThread` and `deleteThread` mutations for use
 * in components.
 */
export function useThreadMutations() {
  const updateThread = useMutation(api.thread.updateThread).withOptimisticUpdate(
    (store, { threadId, title }) => {
      if (!title) return;
      const existing = store.getQuery(api.chat.getThread, { threadId });
      if (existing) {
        store.setQuery(api.chat.getThread, { threadId }, { ...existing, title });
      }
      for (const { args, value } of store.getAllQueries(api.chat.listThreads)) {
        if (!value) continue;
        store.setQuery(
          api.chat.listThreads,
          args,
          value.map((t) => (t._id === threadId ? { ...t, title } : t)),
        );
      }
    },
  );

  const deleteThread = useMutation(api.thread.deleteThread).withOptimisticUpdate(
    (store, { threadId }) => {
      store.setQuery(api.chat.getThread, { threadId }, undefined);
      for (const { args, value } of store.getAllQueries(api.chat.listThreads)) {
        if (!value) continue;
        store.setQuery(
          api.chat.listThreads,
          args,
          value.filter((t) => t._id !== threadId),
        );
      }
    },
  );

  return { updateThread, deleteThread };
}
