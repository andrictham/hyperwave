import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { HyperwaveLogoHorizontal, HyperwaveLogoVertical } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { MessageDoc } from "@convex-dev/agent";
import {
  optimisticallySendMessage,
  toUIMessages,
  useThreadMessages,
  type UIMessage,
} from "@convex-dev/agent/react";
import { api } from "@hyperwave/backend/convex/_generated/api";
import type { ModelInfo } from "@hyperwave/backend/convex/models";
import { useQuery } from "convex-helpers/react/cache";
import { useAction, useMutation } from "convex/react";
import { ArrowDown, ArrowUp, Check, Globe, Loader2, Paperclip } from "lucide-react";
import { useStickToBottom } from "use-stick-to-bottom";

import { Message } from "./Message";
import { ThreadHeader } from "./ThreadHeader";

/**
 * Convert raw error messages from the backend into human friendly strings.
 */
function toFriendlyError(error: string): string {
  if (error.includes("AI_TypeValidationError") || error.includes("Type validation failed")) {
    return "The AI service returned an invalid response.";
  }
  if (error === "Internal Server Error") {
    return "The AI service encountered an internal error.";
  }
  return "An unexpected error occurred.";
}

/** A UI message with optional error information. */
export interface UIMessageWithError extends UIMessage {
  /** Optional error string if the message failed. */
  error?: string;
}

/**
 * Convert MessageDoc objects to UI messages while preserving their error field.
 */
function toUIMessagesWithError(
  messages: (MessageDoc & { streaming?: boolean })[],
): UIMessageWithError[] {
  const ui = toUIMessages(messages);
  const errorMap = new Map<string, string>();
  for (const m of messages) {
    if (m.error) {
      errorMap.set(`${m.threadId}-${m.order}-${m.stepOrder}`, toFriendlyError(m.error));
    }
  }
  return ui.map((m) => ({ ...m, error: errorMap.get(m.key) }));
}

/**
 * Extract a single string prompt from the text parts of a UI message.
 */
function extractPrompt(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("");
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
  const [files, setFiles] = useState<File[]>([]);
  const modelsConfig = useQuery(api.models.listModels);
  const modelsLoaded = modelsConfig !== undefined;
  const [model, setModel] = useState<string>();
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [modelFilter, setModelFilter] = useState("");
  const [activeModelIndex, setActiveModelIndex] = useState(0);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleFiles = (f: FileList | null) => {
    if (!f) return;
    setFiles(Array.from(f));
  };
  useEffect(() => {
    if (modelsConfig && !model) {
      setModel(modelsConfig.defaultModel);
    }
  }, [modelsConfig, model]);

  const filteredModels = useMemo<ModelInfo[]>(() => {
    if (!modelsConfig) return [];
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

  useEffect(() => {
    if (selectedModelInfo && !selectedModelInfo.supportsTools) {
      setWebSearchEnabled(false);
    }
  }, [selectedModelInfo]);

  // Focus the input when it's a new chat or when the component mounts
  useEffect(() => {
    if (!threadId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [threadId]);

  const messages = threadId
    ? useThreadMessages(api.chat.listThreadMessages, threadId ? { threadId } : "skip", {
        // TODO: Temporarily fetch more messages since we haven’t implemented pagination
        initialNumItems: 40,
        stream: true,
      })
    : undefined;

  const sendMessage = useMutation(api.chat.streamMessageAsynchronously).withOptimisticUpdate(
    (store, args) => {
      if (args.threadId) {
        optimisticallySendMessage(api.chat.listThreadMessages)(store, {
          threadId: args.threadId,
          prompt: args.prompt,
        });
      }
    },
  );

  const createThread = useMutation(api.thread.createThread);
  const uploadFile = useAction(api.files.uploadFile);

  const [isCreatingThread, setIsCreatingThread] = useState(false);

  const messageList: UIMessageWithError[] = messages
    ? toUIMessagesWithError(messages.results ?? [])
    : [];
  const hasMessages = messageList.length > 0;

  // TODO: Use isStreaming status to show loading state to the user above the chat input, and to let them stop generating as well.
  // const isStreaming = messageList.some((m) => m.status === "streaming");

  const { scrollRef, contentRef, scrollToBottom, isAtBottom } = useStickToBottom({
    resize: "smooth",
    initial: "smooth",
  });

  /**
   * Height of the chat form in pixels. Used to position the
   * scroll-to-bottom button above the form with consistent spacing.
   */
  const [formHeight, setFormHeight] = useState(0);

  useLayoutEffect(() => {
    const node = formRef.current;
    if (!node) return;
    const update = () => setFormHeight(node.offsetHeight);
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return () => observer.disconnect();
  }, []);

  const isMobile = useIsMobile();

  /**
   * Retry sending a message when generation failed.
   */
  const retryFailedMessage = async (index: number) => {
    const failed = messageList[index];
    if (!failed || !threadId) return;
    let promptToSend: string | undefined;
    if (failed.role === "user") {
      promptToSend = extractPrompt(failed);
    } else {
      const prevUser = [...messageList]
        .slice(0, index)
        .reverse()
        .find((m) => m.role === "user");
      if (prevUser) {
        promptToSend = extractPrompt(prevUser);
      }
    }
    if (!promptToSend || !model) return;
    try {
      await sendMessage({
        threadId,
        prompt: promptToSend,
        model,
        useWebSearch: webSearchEnabled,
      });
      scrollToBottom();
    } catch (error) {
      console.error("Retry failed", error);
    }
  };

  /**
   * Submit handler for the message form. If a thread already exists it will
   * stream the message immediately. Otherwise a new thread is created first
   * and the message is optimistically streamed to that thread.
   *
   * While the thread is being created the input is disabled and a spinner
   * replaces the send icon.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || !modelsLoaded || !model) return;
    const uploadedIds: string[] = [];
    if (files.length > 0) {
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const hashArray = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)));
        const sha256 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        const { fileId } = await uploadFile({
          bytes: buffer,
          mimeType: file.type,
          filename: file.name,
          sha256,
        });
        uploadedIds.push(fileId);
      }
      setFiles([]);
    }
    if (threadId) {
      setPrompt("");
      try {
        const result = await sendMessage({
          threadId,
          prompt: text,
          model,
          fileIds: uploadedIds,
          useWebSearch: webSearchEnabled,
        });
        formRef.current?.reset();
        if (!threadId && onNewThread && result?.threadId) {
          onNewThread(result.threadId);
        }
        scrollToBottom();
      } catch (error) {
        console.error("Failed to send message:", error);
      }
    } else {
      setIsCreatingThread(true);
      try {
        const newThreadId = await createThread({});
        // Optimistically send the message but don't await it
        void sendMessage({
          threadId: newThreadId,
          prompt: text,
          model,
          fileIds: uploadedIds,
          useWebSearch: webSearchEnabled,
        });
        formRef.current?.reset();
        setPrompt("");
        if (onNewThread) {
          onNewThread(newThreadId);
        }
      } catch (error) {
        console.error("Failed to create thread:", error);
      } finally {
        setIsCreatingThread(false);
      }
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="relative flex flex-col h-full">
          <ThreadHeader threadId={threadId} />
          <main
            ref={scrollRef}
            className={cn(
              "relative flex-1 overflow-y-auto p-4 w-full max-w-[768px] mx-auto no-scrollbar ",
              hasMessages ? undefined : "flex flex-col items-center justify-center ",
            )}
          >
            <div
              ref={contentRef}
              className={cn(
                hasMessages ? "space-y-10" : "flex flex-col items-center justify-center",
              )}
            >
              {hasMessages &&
                messageList.map((m, idx) => (
                  <Message
                    key={m.key}
                    m={m}
                    onRetry={m.error ? () => retryFailedMessage(idx) : undefined}
                  />
                ))}
              {!threadId && (
                <>
                  <HyperwaveLogoVertical className="block sm:hidden h-18 sm:h-20 w-auto shrink-0 text-primary" />
                  <HyperwaveLogoHorizontal className="hidden sm:block h-12 sm:h-16 md:h-18 lg:h-auto w-auto shrink-0 text-primary" />
                </>
              )}
            </div>
          </main>
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 rounded-full bg-muted p-2 drop-shadow-md  transition-opacity duration-300",
              !isAtBottom ? "opacity-100" : "opacity-0 pointer-events-none",
            )}
            style={{ bottom: formHeight + 16 }}
            aria-hidden={isAtBottom}
          >
            <ArrowDown className="h-4 w-4" />
            <span className="sr-only">Scroll to bottom</span>
          </button>
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="px-4 pb-4 sm:px-6 sm:pb-6 w-full max-w-3xl mx-auto"
          >
            <div className="bg-card border rounded-xl p-4 drop-shadow-xs flex flex-col gap-3">
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
                minRows={isMobile ? 2 : 3}
                maxRows={6}
                disabled={isCreatingThread}
                placeholder="Type a message..."
                className={cn(
                  "border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:border-0",
                  isCreatingThread && "opacity-50",
                )}
              />
              {files.length > 0 && (
                <ul className="text-sm text-muted-foreground space-y-1">
                  {files.map((f) => (
                    <li key={f.name}>{f.name}</li>
                  ))}
                </ul>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              <div className="flex items-end gap-2">
                {/* Attach file */}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCreatingThread}
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="sr-only">Attach file</span>
                </Button>
                {/* Model selection */}
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
                    <Button type="button" variant="outline" size="default" disabled={!modelsLoaded}>
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
                          className={`flex w-full items-center justify-between px-3 py-1 text-left hover:bg-accent/50 hover:text-accent-foreground ${
                            idx === activeModelIndex ? "bg-accent/50 text-accent-foreground" : ""
                          } ${m.id === model ? "font-semibold" : ""}`}
                        >
                          <span className="flex items-center gap-1">
                            {m.name}
                            {m.supportsTools && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex ml-1">
                                    <Globe className="h-4 w-4" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={4}>Supports web search</TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                          {m.id === model && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {/* Web search toggle */}
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={webSearchEnabled ? "toggleButtonEnabled" : "toggleButtonDisabled"}
                        size="default"
                        disabled={!selectedModelInfo?.supportsTools}
                        onClick={() => setWebSearchEnabled((v) => !v)}
                      >
                        <Globe className="h-4 w-4" />
                        <span>Search</span>
                      </Button>
                    </TooltipTrigger>
                    {!selectedModelInfo?.supportsTools && (
                      <TooltipContent sideOffset={4}>
                        This model doesn’t support search
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
                {/* Send button */}
                <Button
                  type="submit"
                  size="icon"
                  variant="brand"
                  className="rounded-full ml-auto"
                  disabled={!modelsLoaded || !prompt.trim() || isCreatingThread}
                >
                  {isCreatingThread ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
