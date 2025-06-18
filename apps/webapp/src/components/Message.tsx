import { useState, type JSX } from "react";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";
import type { UIMessage } from "@convex-dev/agent/react";
import { Loader2 } from "lucide-react";

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
        <div className="mb-2 prose p-4 bg-muted/80 rounded-lg">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {part.reasoning.trimStart()}
          </div>
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

/**
 * Render all parts of a message in a stable order.
 *
 * Desired order:
 *   1. Every `reasoning` part
 *   2. Every `tool‑invocation` part
 *   3. Every `text` part
 *
 * We attach a key that combines the part type with its original index
 * in the message’s `parts` array.  That index never changes during
 * streaming, so React keeps each DOM node stable while new parts are
 * appended—fixing the “only first reasoning part shows” bug.
 */
function renderMessageParts(parts: UIMessage["parts"]): React.ReactNode {
  type PartWithIndex = [UIMessage["parts"][number], number];

  const byType = {
    reasoning: [] as PartWithIndex[],
    "tool-invocation": [] as PartWithIndex[],
    text: [] as PartWithIndex[],
  };

  parts.forEach((part, idx) => {
    if (part.type === "reasoning") byType.reasoning.push([part, idx]);
    else if (part.type === "tool-invocation") byType["tool-invocation"].push([part, idx]);
    else if (part.type === "text") byType.text.push([part, idx]);
  });

  return (
    <>
      {[...byType.reasoning, ...byType["tool-invocation"], ...byType.text].map(
        ([part, originalIdx]) => (
          <div
            key={`${part.type}-${originalIdx}`}
            className={cn(part.type === "text" ? "mt-2" : "mb-2")}
          >
            {renderPart(part)}
          </div>
        ),
      )}
    </>
  );
}

/**
 * Render an assistant message with special handling for reasoning parts.
 *
 * Streaming messages initially contain only reasoning parts. While streaming
 * and before a text part arrives, a spinner with “Reasoning…” is displayed
 * instead of the actual reasoning content. Once text starts streaming the
 * reasoning content is hidden until streaming completes. After completion the
 * reasoning parts can be toggled via a collapsible section.
 */
function AssistantMessage({ message }: { message: UIMessage }): JSX.Element {
  const [open, setOpen] = useState(false);
  const isStreaming = message.status === "streaming";
  const hasText = message.parts.some((p) => p.type === "text");
  const reasoning = message.parts.filter((p) => p.type === "reasoning");
  const others = message.parts.filter((p) => p.type !== "reasoning");

  if (isStreaming && !hasText) {
    // if (true) {
    return (
      <div className="prose">
        <div className="flex items-center gap-2 text-md text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Reasoning…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {renderMessageParts(others)}
      {!isStreaming && reasoning.length > 0 && (
        <details
          className="prose"
          open={open}
          onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="rounded-lg p-4 text-sm text-accent-foreground/80 bg-accent/100 dark:bg-accent/20 hover:opacity-85 active:opacity-75 transition-all duration-200 ease-in-out select-none cursor-pointer">
            {open ? "Hide reasoning" : "Show reasoning"}
          </summary>
          <div className="mt-1">{renderMessageParts(reasoning)}</div>
        </details>
      )}
    </div>
  );
}

/**
 * Render a single message.
 */
export function Message({ m }: { m: UIMessage }) {
  return (
    <div key={m.key} className={cn("flex w-full", m.role === "user" && "justify-end")}>
      {m.role === "user" ? (
        <div className="bg-secondary text-secondary-foreground text-lg font-normal leading-[140%] tracking-[0.18px] sm:text-base sm:leading-[130%] sm:tracking-[0.16px] rounded-xl px-2 py-1 shadow max-w-[70%] min-w-[10rem] w-fit">
          {m.parts.map((part: UIMessage["parts"][number], index: number) => (
            <div key={index}>{renderPart(part)}</div>
          ))}
        </div>
      ) : m.role === "assistant" ? (
        <AssistantMessage message={m} />
      ) : (
        <div className="w-full">{renderMessageParts(m.parts)}</div>
      )}
    </div>
  );
}
