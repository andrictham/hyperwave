import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clipboard } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import ShikiHighlighter, { rehypeInlineCodeProperty, type Language } from "react-shiki";
import remarkGfm from "remark-gfm";

/** Props for the Markdown component. */
export interface MarkdownProps {
  /** Markdown content to render. */
  readonly children: string;
}

/** Render Markdown with syntax highlighted code blocks using Shiki. */
export function Markdown({ children }: MarkdownProps) {
  interface CodeProps {
    node?: unknown;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }

  /** Button to copy a code block to the clipboard. */
  function CopyButton({ code }: { code: string }) {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = React.useCallback(async () => {
      try {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
      } catch {
        /* clipboard unavailable */
      }
    }, [code]);

    return (
      <button
        type="button"
        onClick={handleCopy}
        className={cn(
          "absolute top-5 right-3 rounded-md p-1 transition-colors z-10",
          copied
            ? "bg-accent text-accent-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        )}
        aria-label="Copy code"
      >
        {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
      </button>
    );
  }

  const components = React.useMemo<Components>(() => {
    return {
      code({ inline, className, children: codeChildren }: CodeProps) {
        const code = String(codeChildren ?? "").replace(/\n$/, "");
        const langMatch = /language-(\w+)/.exec(className || "");
        const language = langMatch ? (langMatch[1] as Language) : undefined;

        if (!inline && language) {
          return (
            <div className="relative">
              <CopyButton code={code} />
              <ShikiHighlighter
                language={language}
                theme={"one-dark-pro"}
                addDefaultStyles={false}
                as="pre"
                className="w-full whitespace-pre-wrap overflow-x-auto break-all sm:break-normal"
                showLineNumbers
              >
                {code}
              </ShikiHighlighter>
            </div>
          );
        }

        return <code className={className}>{codeChildren}</code>;
      },
      table({ node: _node, className, children, ...rest }) {
        return (
          <div className="w-[90vw] sm:w-[100%] overflow-x-auto my-2">
            <table {...rest} className={cn("min-w-max table-auto", className)}>
              {children}
            </table>
          </div>
        );
      },
    };
  }, []);

  return (
    <div className="prose dark:prose-invert mx-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeInlineCodeProperty]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
