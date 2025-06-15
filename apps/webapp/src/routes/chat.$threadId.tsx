import { ChatView } from "@/components/ChatView";
import { CatchBoundary, createFileRoute, useRouter } from "@tanstack/react-router";

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
