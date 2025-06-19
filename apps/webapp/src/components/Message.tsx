import { type JSX } from "react";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import type { UIMessage } from "@convex-dev/agent/react";

import { ReasoningAndToolDetails } from "./ui/reasoning-tool-details";

/** UIMessage extended with an optional error field. */
export interface UIMessageWithError extends UIMessage {
  /** Error message associated with this UI message, if any. */
  error?: string;
}

/** Determine if an object returned from the agent contains a `result` field. */
function hasResult(value: unknown): value is { result: unknown } {
  return typeof value === "object" && value !== null && "result" in value;
}

/** Render a single message part based on its type. */
function renderPart(part: UIMessage["parts"][number]): React.ReactNode {
  switch (part.type) {
    case "text": {
      // Normalise streaming glitches:
      // 1. When the backend starts a text part, it sometimes initialises
      //    `part.text` as `undefined` and later concatenates the first chunk
      //    which yields the literal string `"undefined…"`.
      // 2. We strip that prefix once *and only once* on the fly so the user
      //    never sees it.
      const raw = typeof part.text === "string" ? part.text : "";
      const cleaned = raw.startsWith("undefined") ? raw.slice("undefined".length) : raw;

      return cleaned ? <Markdown>{cleaned}</Markdown> : null;
    }
    case "reasoning":
      return (
        <div className="w-full">
          <Markdown>{part.reasoning.trimStart()}</Markdown>
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
    case "file": {
      const url =
        part.data.startsWith("http://") ||
        part.data.startsWith("https://") ||
        part.data.startsWith("blob:") ||
        part.data.startsWith("data:")
          ? part.data
          : `data:${part.mimeType};base64,${part.data}`;
      return part.mimeType.startsWith("image/") ? (
        <img src={url} alt="uploaded image" className="max-w-full h-auto rounded" />
      ) : null;
    }
    default:
      return null;
  }
}

/** Render an array of parts in the given order with consistent spacing and stable keys. */
function renderParts(parts: UIMessage["parts"]): JSX.Element[] {
  return parts.map((part, idx) => (
    <div key={`${part.type}-${idx}`} className={cn(part.type === "text" ? "mt-2" : "mb-2")}>
      {renderPart(part)}
    </div>
  ));
}

/**
 * Render a single message.
 * @param onRetry Optional handler to resend the message when generation failed.
 */
export function Message({ m, onRetry }: { m: UIMessageWithError; onRetry?: () => void }) {
  // Reasoning toggle
  const isStreaming = m.status === "streaming";
  const hasText = m.parts.some((p) => p.type === "text");
  const reasoningParts = m.parts.filter((p) => p.type === "reasoning");
  const toolInvocationParts = m.parts.filter((p) => p.type === "tool-invocation");
  const others = m.parts.filter((p) => p.type !== "reasoning" && p.type !== "tool-invocation");

  return (
    <>
      <div key={m.key} className={cn("flex w-full", m.role === "user" && "justify-end")}>
        {m.role === "user" ? (
          <div className="bg-secondary text-secondary-foreground text-lg font-normal leading-[140%] tracking-[0.18px] sm:text-base sm:leading-[130%] sm:tracking-[0.16px] rounded-xl px-2 py-1 shadow max-w-[70%] w-fit">
            {m.parts.map((part: UIMessage["parts"][number], index: number) => (
              <div key={index}>{renderPart(part)}</div>
            ))}
          </div>
        ) : m.role === "assistant" ? (
          <div className="w-full">
            {reasoningParts.length > 0 && (
              <div className="mb-10">
                <ReasoningAndToolDetails type="reasoning" isStreaming={isStreaming && !hasText}>
                  {renderParts(reasoningParts)}
                </ReasoningAndToolDetails>
              </div>
            )}
            {toolInvocationParts.length > 0 && (
              <div className="mb-10">
                <ReasoningAndToolDetails type="tool" isStreaming={isStreaming && !hasText}>
                  {renderParts(toolInvocationParts)}
                </ReasoningAndToolDetails>
              </div>
            )}
            {renderParts(others)}
          </div>
        ) : (
          <div className="w-full my-2">{renderParts(m.parts)}</div>
        )}
      </div>
      {m.error && (
        <p
          className={cn(
            "text-sm text-destructive mt-1 flex items-center gap-2",
            m.role === "user" && "text-right justify-end",
          )}
        >
          <span>{m.error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="underline text-sm cursor-pointer hover:opacity-80 hover:text-destructive-foreground"
            >
              Retry
            </button>
          )}
        </p>
      )}
    </>
  );
}
