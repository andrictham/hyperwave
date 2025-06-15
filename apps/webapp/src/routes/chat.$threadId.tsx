import { ChatView } from "@/components/ChatView";
import { RedirectErrorBoundary } from "@/components/redirect-error-boundary";
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
  return (
    <RedirectErrorBoundary to="/">
      <ChatView threadId={threadId} />
    </RedirectErrorBoundary>
  );
}
