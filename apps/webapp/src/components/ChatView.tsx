import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { toUIMessages, useThreadMessages, type UIMessage } from "@convex-dev/agent/react";
import { api } from "@hyperwave/backend/convex/_generated/api";
import { useAction } from "convex/react";
import type { FunctionReference } from "convex/server";

import type { ThreadStreamQuery } from "../../../../node_modules/@convex-dev/agent/dist/esm/react/types";

interface ChatApi {
  chat: {
    listThreadMessages: ThreadStreamQuery;
  };
  chatActions: {
    sendMessage: FunctionReference<
      "action",
      "public",
      { threadId?: string; prompt: string },
      { threadId: string }
    >;
  };
}

const chatApi = api as unknown as ChatApi;

function hasResult(value: unknown): value is { result: unknown } {
  return typeof value === "object" && value !== null && "result" in value;
}

function renderPart(part: UIMessage["parts"][number]): React.ReactNode {
  switch (part.type) {
    case "text":
      return <span>{part.text}</span>;
    case "reasoning":
      return <pre className="text-xs opacity-70 whitespace-pre-wrap">{part.reasoning}</pre>;
    case "tool-invocation":
      return (
        <div className="text-xs border rounded p-2 bg-muted">
          <div className="font-mono">{part.toolInvocation.toolName}</div>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(part.toolInvocation.args, null, 2)}
          </pre>
          {hasResult(part.toolInvocation) && (
            <pre className="whitespace-pre-wrap mt-1">
              {JSON.stringify(part.toolInvocation.result, null, 2)}
            </pre>
          )}
        </div>
      );
    default:
      return null;
  }
}

export function ChatView({
  threadId,
  onNewThread,
}: {
  threadId?: string;
  onNewThread?: (id: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const messagesQuery = threadId
    ? useThreadMessages(
        chatApi.chat.listThreadMessages,
        { threadId },
        {
          initialNumItems: 20,
          stream: true,
        },
      )
    : undefined;
  const messageList: UIMessage[] = messagesQuery ? toUIMessages(messagesQuery.results ?? []) : [];

  const send = useAction(chatApi.chatActions.sendMessage);

  const isStreaming = (messagesQuery as { streaming?: boolean } | undefined)?.streaming ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text) return;
    const result = await send({ threadId, prompt: text });
    setPrompt("");
    if (!threadId && onNewThread && result.threadId) {
      onNewThread(result.threadId);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          <main className="flex-1 overflow-y-auto p-4 space-y-4">
            {messageList.map((m) => (
              <div key={m.key} className="space-y-1">
                <div className="font-semibold capitalize">{m.role}</div>
                <div className="flex flex-col gap-1">
                  {m.parts.map((part: UIMessage["parts"][number], index: number) => (
                    <div key={index}>{renderPart(part)}</div>
                  ))}
                </div>
              </div>
            ))}
          </main>
          <form onSubmit={handleSubmit} className="flex gap-2 p-2 border-t">
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} className="flex-1" />
            <Button type="submit" disabled={!prompt.trim() || isStreaming}>
              Send
            </Button>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
