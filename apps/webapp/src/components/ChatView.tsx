import { useEffect, useState, useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toUIMessages, useThreadMessages, type UIMessage } from "@convex-dev/agent/react";
import { api } from "@hyperwave/backend/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

/**
 * Component that displays the header with thread title, sidebar toggle, and thread actions
 */
function ThreadHeader({ threadId }: { threadId?: string }) {
  const navigate = useNavigate();
  const thread = useQuery(api.chat.getThread, threadId ? { threadId } : "skip");
  const updateThread = useAction(api.chatActions.updateThread);
  const deleteThread = useAction(api.chatActions.deleteThread);
  const [isEditing, setIsEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleRename = async () => {
    if (!threadId || !newTitle.trim()) {
      setIsEditing(false);
      return;
    }
    try {
      await updateThread({
        threadId,
        title: newTitle.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to rename thread:", error);
    }
  };

  const handleDelete = async () => {
    if (!threadId) return;
    try {
      await deleteThread({ threadId });
      navigate({ to: "/" }); // Navigate to home after deletion
    } catch (error) {
      console.error("Failed to delete thread:", error);
    }
  };

  useEffect(() => {
    if (thread?.title) {
      setNewTitle(thread.title);
    }
  }, [thread?.title]);

  return (
    <header className="flex items-center h-14 border-b px-4 relative">
      <div className="flex items-center flex-1">
        <SidebarTrigger className="mr-2" />
        <div className="flex-1 flex justify-center">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  else if (e.key === "Escape") setIsEditing(false);
                }}
                className="h-8 w-64"
                autoFocus
              />
              <Button variant="ghost" size="sm" onClick={handleRename}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <h1 className="text-lg font-semibold">
              {!threadId ? 'New chat' : (thread ? thread.title || 'New chat' : <Skeleton className="h-6 w-32" />)}
            </h1>
          )}
        </div>
      </div>
      
      {threadId && (
        <div className="absolute right-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Thread actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
}

/** Determine if an object returned from the agent contains a `result` field. */
function hasResult(value: unknown): value is { result: unknown } {
  return typeof value === "object" && value !== null && "result" in value;
}

/** Render a single message part based on its type. */
function renderPart(part: UIMessage["parts"][number]): React.ReactNode {
  switch (part.type) {
    case "text":
      return <Markdown>{part.text}</Markdown>;
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

/**
 * Primary chat view showing the list of messages for a thread and a form to
 * compose new messages. A model can be selected per message via a popover
 * menu.
 */
export function ChatView({
  threadId,
  onNewThread,
}: {
  threadId?: string;
  onNewThread?: (id: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const modelsConfig = useQuery(api.models.listModels);
  const modelsLoaded = modelsConfig !== undefined;
  const [model, setModel] = useState<string>();
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (modelsConfig && !model) {
      setModel(modelsConfig.defaultModel);
    }
  }, [modelsConfig, model]);

  // Focus the input when it's a new chat or when the component mounts
  useEffect(() => {
    if (!threadId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [threadId]);
  const messagesQuery = threadId
    ? useThreadMessages(
        api.chat.listThreadMessages,
        { threadId },
        {
          initialNumItems: 20,
          stream: true,
        },
      )
    : undefined;
  const messageList: UIMessage[] = messagesQuery ? toUIMessages(messagesQuery.results ?? []) : [];

  const send = useAction(api.chatActions.sendMessage);

  const isStreaming = (messagesQuery as { streaming?: boolean } | undefined)?.streaming ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || !modelsLoaded || !model) return;
    const result = await send({ threadId, prompt: text, model });
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
          <ThreadHeader threadId={threadId} />
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
            <Popover open={modelMenuOpen} onOpenChange={setModelMenuOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" disabled={!modelsLoaded}>
                  {modelsLoaded ? model : "Loading..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <div className="flex flex-col">
                  {modelsConfig?.models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setModel(m);
                        setModelMenuOpen(false);
                      }}
                      className={`px-3 py-1 text-left hover:bg-accent hover:text-accent-foreground ${m === model ? "font-semibold" : ""}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Input 
              ref={inputRef}
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              className="flex-1" 
              placeholder="Type a message..."
            />
            <Button type="submit" disabled={!modelsLoaded || !prompt.trim() || isStreaming}>
              Send
            </Button>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
