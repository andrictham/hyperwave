import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ClipboardCopy } from "lucide-react";
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

  /** Parse Shiki HTML output to extract the pre attributes and inner code. */
  function parseShikiHtml(html: string): {
    className?: string;
    style?: React.CSSProperties;
    innerHtml: string;
  } {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    const pre = template.content.firstElementChild as HTMLElement | null;
    if (!pre) return { innerHtml: html };
    const className = pre.getAttribute("class") ?? undefined;
    const styleAttr = pre.getAttribute("style") ?? undefined;
    const style: React.CSSProperties | undefined = styleAttr
      ? styleAttr.split(";").reduce<React.CSSProperties>((acc, part) => {
          const [key, value] = part.split(":");
          if (!key || !value) return acc;
          const camel = key.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          (acc as Record<string, string>)[camel] = value.trim();
          return acc;
        }, {})
      : undefined;
    return { className, style, innerHtml: pre.innerHTML };
  }

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

  interface PreBlockProps {
    readonly code: string;
    readonly html: string;
  }

  /** Render a syntax highlighted code block with copy-to-clipboard support. */
  function PreBlock({ code, html }: PreBlockProps) {
    const { className, style, innerHtml } = React.useMemo(() => parseShikiHtml(html), [html]);
    const [copied, setCopied] = React.useState(false);

    const handleCopy = React.useCallback(() => {
      void navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }, [code]);

    return (
      <pre className={cn(className, "relative")} style={style} tabIndex={0}>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute right-2 top-2"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="text-accent" />
          ) : (
            <ClipboardCopy className="text-secondary-foreground" />
          )}
          <span className="sr-only">Copy code</span>
        </Button>
        <code dangerouslySetInnerHTML={{ __html: innerHtml }} />
      </pre>
    );
  }

  interface CodeProps {
    node?: unknown;
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
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
          return (
            <PreBlock
              code={code}
              html={highlighter.codeToHtml(code, {
                lang: langToUse,
                theme: "nord",
              })}
            />
          );
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
