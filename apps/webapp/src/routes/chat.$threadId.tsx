import { ChatView } from "@/components/ChatView";
import { CatchBoundary, useRouter } from "@tanstack/react-router";
import { api } from "@hyperwave/backend/convex/_generated/api";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/chat/$threadId")({
  beforeLoad: async ({ params, context }) => {
    try {
      await context.convex.query(api.chat.getThread, {
        threadId: params.threadId,
      });
    } catch {
      throw redirect({ to: "/" });
    }
  },
  component: ThreadRoute,
});

function ThreadRoute() {
  const { threadId } = Route.useParams();
  const router = useRouter();
  return (
    <CatchBoundary
      getResetKey={() => threadId}
      onCatch={() => router.navigate({ to: "/" })}
    >
      <ChatView threadId={threadId} />
    </CatchBoundary>
  );
}
