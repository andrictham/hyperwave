import { ChatView } from "@/components/ChatView";
import { RedirectErrorBoundary } from "@/components/redirect-error-boundary";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_chatLayout/chat/$threadId")({
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
