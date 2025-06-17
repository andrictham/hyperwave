import React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSingletonHighlighter, type Highlighter } from "shiki";
import nord from "shiki/themes/nord.mjs";

/** Render HTML returned by Shiki into a <pre> element with a copy button. */
function ShikiPre({ html, code }: { html: string; code: string }) {
  const preRef = React.useRef<HTMLPreElement>(null);

  React.useEffect(() => {
    const container = document.createElement("div");
    container.innerHTML = html;
    const pre = container.firstElementChild as HTMLPreElement | null;
    if (pre && preRef.current) {
      // Copy attributes from the generated <pre>
      for (const attr of pre.attributes) {
        if (attr.name === "style") {
          preRef.current.style.cssText = attr.value;
        } else if (attr.name === "class") {
          preRef.current.className = `${attr.value} relative`;
        } else {
          preRef.current.setAttribute(attr.name, attr.value);
        }
      }
      preRef.current.innerHTML = pre.innerHTML;
    }
  }, [html]);

  return (
    <pre ref={preRef} className="relative">
      <button
        type="button"
        className="absolute right-2 top-2 rounded bg-background/70 px-1 text-xs hover:bg-background"
        onClick={() => {
          void navigator.clipboard.writeText(code);
        }}
      >
        Copy
      </button>
    </pre>
  );
}

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
            <ShikiPre
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
