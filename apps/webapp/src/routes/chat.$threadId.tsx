import { ChatView } from "@/components/ChatView";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/chat/$threadId")({
  component: ThreadRoute,
});

function ThreadRoute() {
  const { threadId } = Route.useParams();
  return <ChatView threadId={threadId} />;
}
