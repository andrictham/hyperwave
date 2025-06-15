import { ChatView } from "@/components/ChatView";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const navigate = useNavigate();
  return (
    <ChatView
      onNewThread={(id) => navigate({ to: "/chat/$threadId", params: { threadId: id } })}
    />
  );
}
