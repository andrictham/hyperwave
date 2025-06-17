import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clipboard } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSingletonHighlighter, type Highlighter } from "shiki";
import nord from "shiki/themes/nord.mjs";

/** Props for the Markdown component. */
export interface MarkdownProps {
  /** Markdown content to render. */
  readonly children: string;
}

/** Render Markdown with syntax highlighted code blocks using Shiki. */
export function Markdown({ children }: MarkdownProps) {
  const [highlighter, setHighlighter] = React.useState<Highlighter | null>(null);

  React.useEffect(() => {
    const langs = [
      "javascript",
      "typescript",
      "jsx",
      "tsx",
      "bash",
      "json",
      "css",
      "scss",
      "python",
      "rust",
      "go",
      "kotlin",
      "c",
      "cpp",
    ];
    void getSingletonHighlighter({ themes: [nord], langs }).then(setHighlighter);
  }, []);

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
          "absolute top-2 right-2 rounded-xs p-1 transition-colors",
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

  function parseStyle(style: string): React.CSSProperties {
    return style.split(";").reduce((acc, part) => {
      const [prop, value] = part.split(":");
      if (!prop || !value) return acc;
      const camel = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      (acc as Record<string, string>)[camel] = value.trim();
      return acc;
    }, {} as React.CSSProperties);
  }

  const components = React.useMemo<Components>(() => {
    return {
      code({ node: _node, inline, className, children: codeChildren }: CodeProps) {
        const code = String(codeChildren ?? "").replace(/\n$/, "");
        const langMatch = /language-(\w+)/.exec(className || "");
        if (!inline && langMatch && highlighter) {
          const lang = langMatch[1];
          const loaded = highlighter.getLoadedLanguages();
          const langToUse = loaded.includes(lang) ? lang : "txt";
          const html = highlighter.codeToHtml(code, {
            lang: langToUse,
            theme: "nord",
          });

          if (typeof window !== "undefined") {
            const doc = new window.DOMParser().parseFromString(html, "text/html");
            const pre = doc.querySelector("pre");
            if (pre) {
              const cls = pre.className;
              const styleAttr = pre.getAttribute("style") ?? undefined;
              const tabIndexAttr = pre.getAttribute("tabindex");
              const tabIndex = tabIndexAttr ? Number(tabIndexAttr) : undefined;
              const innerHtml = pre.innerHTML;
              return (
                <pre
                  className={cn(cls, "relative")}
                  style={styleAttr ? parseStyle(styleAttr) : undefined}
                  tabIndex={tabIndex}
                >
                  <CopyButton code={code} />
                  <code dangerouslySetInnerHTML={{ __html: innerHtml }} />
                </pre>
              );
            }
          }
          return <div dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <code className={className}>{codeChildren}</code>;
      },
    };
  }, [highlighter]);

  return (
    <div className="prose dark:prose-invert mx-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
