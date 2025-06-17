import React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { getSingletonHighlighter, type Highlighter } from "shiki";
import nord from "shiki/themes/nord.mjs";
import { CopyButton } from "@/components/copy-button";
import { cn } from "@/lib/utils";

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
    /** Convert a CSS style string into a React `style` object. */
    function styleStringToObject(style?: string): React.CSSProperties {
      if (!style) return {};
      return style.split(";").reduce<React.CSSProperties>((acc, decl) => {
        const [prop, value] = decl.split(":");
        if (prop && value) {
          const key = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          acc[key as keyof React.CSSProperties] = value.trim();
        }
        return acc;
      }, {});
    }

    return {
      code({ node: _node, inline, className, children: codeChildren }: CodeProps) {
        const code = String(codeChildren ?? "").replace(/\n$/, "");
        const langMatch = /language-(\w+)/.exec(className || "");
        if (!inline && langMatch && highlighter) {
          const lang = langMatch[1];
          const loaded = highlighter.getLoadedLanguages();
          const langToUse = loaded.includes(lang) ? lang : "txt";
          const html = highlighter.codeToHtml(code, { lang: langToUse, theme: "nord" });
          const classMatch = /class="([^"]*)"/.exec(html);
          const styleMatch = /style="([^"]*)"/.exec(html);
          const inner = html.replace(/^<pre[^>]*>/, "").replace(/<\/pre>$/, "");
          return (
            <pre className={cn(classMatch?.[1], "relative group overflow-auto rounded-md p-2")}
                 style={styleStringToObject(styleMatch?.[1])}
            >
              <CopyButton text={code} />
              <code dangerouslySetInnerHTML={{ __html: inner }} />
            </pre>
          );
        }
        return <code className={className}>{codeChildren}</code>;
      },
      table({ children }) {
        return (
          <div className="overflow-x-auto">
            <table>{children}</table>
          </div>
        );
      },
    };
  }, [highlighter]);

  return (
    <div className="prose dark:prose-invert w-full max-w-none sm:max-w-prose mx-auto">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
