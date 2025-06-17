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

  const CodeBlock = ({ inline, className, children }: CodeProps) => {
    const [copied, setCopied] = React.useState(false);
    const code = String(children ?? "").replace(/\n$/, "");
    const langMatch = /language-(\w+)/.exec(className || "");

    if (!inline && langMatch && highlighter) {
      const lang = langMatch[1];
      const loaded = highlighter.getLoadedLanguages();
      const langToUse = loaded.includes(lang) ? lang : "txt";
      const html = highlighter.codeToHtml(code, { lang: langToUse, theme: "nord" });

      if (typeof window !== "undefined") {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const pre = doc.querySelector("pre");
        if (pre) {
          const style = pre.getAttribute("style") ?? "";
          const styleObj: React.CSSProperties = {};
          for (const part of style.split(";")) {
            const [prop, value] = part.split(":");
            if (prop && value) {
              const key = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
              (styleObj as any)[key] = value.trim();
            }
          }

          const handleCopy = () => {
            void navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 3000);
            });
          };

          return (
            <div className="relative group">
              <pre className={pre.className} style={styleObj} dangerouslySetInnerHTML={{ __html: pre.innerHTML }} />
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy code"
                className="absolute right-2 top-2 rounded p-1 text-secondary-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                {copied ? <Check className="h-4 w-4 text-accent-foreground" /> : <Clipboard className="h-4 w-4" />}
              </button>
            </div>
          );
        }
      }
    }

    return <code className={className}>{children}</code>;
  };

  const components = React.useMemo<Components>(() => ({ code: CodeBlock }), [highlighter]);

  return (
    <div className="prose dark:prose-invert mx-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
