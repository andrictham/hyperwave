import { ChatView } from "@/components/ChatView";
import { CatchBoundary, redirect, useRouter } from "@tanstack/react-router";
import { api } from "@hyperwave/backend/convex/_generated/api";

export const Route = createFileRoute("/chat/$threadId")({
    try {
      const thread = await context.convex.query(api.chat.getThread, {
        threadId: params.threadId,
      });
      if (thread === null) {
        throw new Error("not found");
      }
    } catch {
      throw redirect({ to: "/" });
    }
  },
export const Route = createFileRoute("/chat/$threadId")({
  component: ThreadRoute,
});

function ThreadRoute() {
  const { threadId } = Route.useParams();
  const router = useRouter();
  return (
    <CatchBoundary getResetKey={() => threadId} onCatch={() => router.navigate({ to: "/" })}>
      <ChatView threadId={threadId} />
    </CatchBoundary>
  );
}
