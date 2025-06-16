import { useEffect, useMemo, useRef, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { HyperwaveLogoHorizontal, HyperwaveLogoVertical } from "@/components/logo";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toUIMessages, useThreadMessages, type UIMessage } from "@convex-dev/agent/react";
import { api } from "@hyperwave/backend/convex/_generated/api";
import type { ModelInfo } from "@hyperwave/backend/convex/models";
import { useNavigate } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import { ArrowUp, Check, Loader2, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEditing = () => {
    // Reset the input value to the current thread title
    if (thread?.title) {
      setNewTitle(thread.title);
    }
    setIsDropdownOpen(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    // Reset to the current thread title when cancelling
    if (thread?.title) {
      setNewTitle(thread.title);
    }
    setIsEditing(false);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Use requestAnimationFrame to ensure the input is visible in the DOM
      const timer = requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [isEditing]);

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
    <header className="flex items-center justify-between h-14 border-b px-4 relative">
      <SidebarTrigger className="mr-2" />
      <div className="flex max-w-lg">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                else if (e.key === "Escape") setIsEditing(false);
              }}
              className="h-8 w-64"
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
              onClick={handleRename}
            >
              <Check className="h-4 w-4" />
              <span className="sr-only">Save</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="truncate text-lg font-semibold px-2 py-1 rounded-md hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={handleStartEditing}
            disabled={!threadId}
          >
            {!threadId ? (
              "New chat"
            ) : thread ? (
              thread.title || "New chat"
            ) : (
              <Skeleton className="h-6 w-32" />
            )}
          </button>
        )}
      </div>

      <div>
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!threadId}>
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Thread actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleStartEditing();
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => e.preventDefault()}
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
      return (
        <div className="mb-2 prose p-2 bg-muted/50 rounded">
          <div className="text-xs font-medium text-muted-foreground mb-1">Thinking</div>
          <div className="text-xs text-muted-foreground whitespace-pre-wrap">{part.reasoning}</div>
        </div>
      );
    case "tool-invocation":
      return (
        <div className="mb-2 border rounded p-2 bg-muted/50">
          <div className="text-xs font-medium text-muted-foreground mb-1">
            Using tool: <span className="font-mono">{part.toolInvocation.toolName}</span>
          </div>
          <div className="text-xs space-y-1">
            <div className="font-medium">Arguments:</div>
            <pre className="whitespace-pre-wrap bg-muted p-1 rounded">
              {JSON.stringify(part.toolInvocation.args, null, 2)}
            </pre>
            {hasResult(part.toolInvocation) && (
              <>
                <div className="font-medium mt-1">Result:</div>
                <pre className="whitespace-pre-wrap bg-muted p-1 rounded">
                  {JSON.stringify(part.toolInvocation.result, null, 2)}
                </pre>
              </>
            )}
          </div>
        </div>
      );
    default:
      return null;
  }
}

// Define a type for the accumulator that maps part types to their corresponding arrays
type PartsByType = {
  reasoning: Extract<UIMessage["parts"][number], { type: "reasoning" }>[];
  "tool-invocation": Extract<UIMessage["parts"][number], { type: "tool-invocation" }>[];
  text: Extract<UIMessage["parts"][number], { type: "text" }>[];
};

/** Render all parts of a message in the correct order */
function renderMessageParts(parts: UIMessage["parts"]): React.ReactNode {
  // Initialize the accumulator with empty arrays for each part type
  const initialParts: PartsByType = {
    reasoning: [],
    "tool-invocation": [],
    text: [],
  };

  // Group parts by type using a type-safe approach
  const partsByType = parts.reduce<PartsByType>((acc, part) => {
    switch (part.type) {
      case "reasoning":
        acc.reasoning.push(part);
        break;
      case "tool-invocation":
        acc["tool-invocation"].push(part);
        break;
      case "text":
        acc.text.push(part);
        break;
      // Other part types are intentionally ignored as they're not rendered
    }
    return acc;
  }, initialParts);

  // Render all parts in the desired order
  return (
    <>
      {[...partsByType.reasoning, ...partsByType["tool-invocation"]].map((part, index) => (
        <div key={index} className="mb-2">
          {renderPart(part)}
        </div>
      ))}
      {partsByType.text.length > 0 && (
        <div className="mt-2">
          {partsByType.text.map((part, index) => (
            <div key={index}>{renderPart(part)}</div>
          ))}
        </div>
      )}
    </>
  );
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
  const [modelFilter, setModelFilter] = useState("");
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    if (modelsConfig && !model) {
      setModel(modelsConfig.defaultModel);
    }
  }, [modelsConfig, model]);

  const filteredModels = useMemo(() => {
    if (!modelsConfig) return [] as ModelInfo[];
    const query = modelFilter.toLowerCase();
    const base: ModelInfo[] = modelsConfig.models.filter(
      (m) => m.name.toLowerCase().includes(query) || m.id.toLowerCase().includes(query),
    );
    const selected: ModelInfo | undefined = modelsConfig.models.find((m) => m.id === model);
    if (selected && !base.some((m) => m.id === selected.id)) {
      base.unshift(selected);
    }
    return base;
  }, [modelsConfig, modelFilter, model]);

  useEffect(() => {
    setActiveModelIndex(0);
  }, [modelFilter, modelMenuOpen, filteredModels.length]);

  useEffect(() => {
    const target = itemRefs.current[activeModelIndex];
    if (target) {
      target.scrollIntoView({ block: "nearest" });
    }
  }, [activeModelIndex, filteredModels]);

  const selectedModelInfo: ModelInfo | undefined = modelsConfig?.models.find((m) => m.id === model);

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
  const hasMessages = messageList.length > 0;

  const send = useAction(api.chatActions.sendMessage);

  const isStreaming = (messagesQuery as { streaming?: boolean } | undefined)?.streaming ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || !modelsLoaded || !model) return;
    setPrompt("");
    try {
      const result = await send({ threadId, prompt: text, model });
      formRef.current?.reset();
      if (!threadId && onNewThread && result.threadId) {
        onNewThread(result.threadId);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full">
          <ThreadHeader threadId={threadId} />
          <main
            className={cn(
              "flex-1 overflow-y-auto p-4",
              hasMessages ? "space-y-4" : "flex flex-col items-center justify-center",
            )}
          >
            {hasMessages &&
              messageList.map((m) => (
                <div key={m.key} className={cn("flex w-full", m.role === "user" && "justify-end")}>
                  {m.role === "user" ? (
                    <div className="bg-secondary text-secondary-foreground text-lg font-normal leading-[140%] tracking-[0.18px] sm:text-base sm:leading-[130%] sm:tracking-[0.16px] rounded-xl px-2 py-1 shadow max-w-[70%] min-w-[10rem] w-fit">
                      {m.parts.map((part: UIMessage["parts"][number], index: number) => (
                        <div key={index}>{renderPart(part)}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full">{renderMessageParts(m.parts)}</div>
                  )}
                </div>
              ))}
            {!threadId && (
              <>
                <HyperwaveLogoVertical className="block sm:hidden h-18 sm:h-20 w-auto shrink-0 text-primary" />
                <HyperwaveLogoHorizontal className="hidden sm:block h-12 sm:h-16 md:h-18 lg:h-auto w-auto shrink-0 text-primary" />
              </>
            )}
          </main>
          <form ref={formRef} onSubmit={handleSubmit} className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="bg-background border rounded-xl p-3 shadow-sm flex flex-col gap-3">
              <Textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
                minRows={3}
                maxRows={6}
                placeholder="Type a message..."
                className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:border-0"
              />
              <div className="flex items-end justify-between">
                <Popover
                  open={modelMenuOpen}
                  onOpenChange={(open) => {
                    setModelMenuOpen(open);
                    if (!open) {
                      // Focus the textarea when the popover closes
                      inputRef.current?.focus();
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={!modelsLoaded}>
                      {modelsLoaded ? (selectedModelInfo?.name ?? model) : "Loading..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="p-0"
                    onCloseAutoFocus={(e) => {
                      e.preventDefault();
                      inputRef.current?.focus();
                    }}
                  >
                    <div className="p-2 border-b">
                      <Input
                        value={modelFilter}
                        onChange={(e) => setModelFilter(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setActiveModelIndex((i) => Math.min(i + 1, filteredModels.length - 1));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setActiveModelIndex((i) => Math.max(i - 1, 0));
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            const m = filteredModels[activeModelIndex];
                            if (m) {
                              setModel(m.id);
                              setModelMenuOpen(false);
                            }
                          }
                        }}
                        placeholder="Search models..."
                        className="h-8"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {filteredModels.map((m: ModelInfo, idx: number) => (
                        <button
                          key={m.id}
                          ref={(el) => {
                            itemRefs.current[idx] = el;
                          }}
                          type="button"
                          onClick={() => {
                            setModel(m.id);
                            setModelMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-1 text-left hover:bg-accent hover:text-accent-foreground ${
                            idx === activeModelIndex ? "bg-accent text-accent-foreground" : ""
                          } ${m.id === model ? "font-semibold" : ""}`}
                        >
                          <span>{m.name}</span>
                          {m.id === model && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full"
                  disabled={!modelsLoaded || !prompt.trim() || isStreaming}
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                  <span className="sr-only">{isStreaming ? "Sending" : "Send"}</span>
                </Button>
              </div>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
