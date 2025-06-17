import React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSingletonHighlighter, type Highlighter } from "shiki";
import nord from "shiki/themes/nord.mjs";
import { Clipboard, Check } from "lucide-react";

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

  /** Button that copies the provided code to the clipboard. */
  function CopyButton({ code }: { code: string }) {
    const [copied, setCopied] = React.useState(false);
    const handleCopy = React.useCallback(() => {
      void navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    }, [code]);

    return (
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-2 top-2 text-secondary-foreground transition-colors hover:text-secondary"
      >
        {copied ? <Check className="h-4 w-4 text-accent" /> : <Clipboard className="h-4 w-4" />}
        <span className="sr-only">Copy</span>
      </button>
    );
  }

  /**
   * Render a Shiki-highlighted code block without an extra container.
   */
  function ShikiBlock({ html, code }: { html: string; code: string }) {
    const { className, style, tabIndex, inner } = React.useMemo(() => {
      const template = document.createElement("template");
      template.innerHTML = html.trim();
      const pre = template.content.querySelector("pre");
      return {
        className: pre?.getAttribute("class") ?? undefined,
        style: pre?.getAttribute("style") ?? undefined,
        tabIndex: pre?.getAttribute("tabindex") ?? undefined,
        inner: pre?.innerHTML ?? html,
      };
    }, [html]);

    const styleObj = React.useMemo(() => {
      const obj: React.CSSProperties = {};
      if (style) {
        for (const part of style.split(";")) {
          const [k, v] = part.split(":");
          if (k && v) {
            (obj as Record<string, string>)[k.trim()] = v.trim();
          }
        }
      }
      return obj;
    }, [style]);

    return (
      <div className="relative group">
        <pre
          className={className}
          style={styleObj}
          tabIndex={tabIndex ? Number(tabIndex) : undefined}
          dangerouslySetInnerHTML={{ __html: inner }}
        />
        <CopyButton code={code} />
      </div>
    );
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
            <ShikiBlock
              html={highlighter.codeToHtml(code, {
                lang: langToUse,
                theme: "nord",
              })}
              code={code}
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
