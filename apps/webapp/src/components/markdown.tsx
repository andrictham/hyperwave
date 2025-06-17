import React from "react";
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

  interface CodeBlockProps {
    readonly html: string;
  }

  /** Render a syntax highlighted code block with a copy button. */
  function CodeBlock({ html }: CodeBlockProps) {
    const preRef = React.useRef<HTMLPreElement>(null);
    const [copied, setCopied] = React.useState(false);

    // Inject the Shiki generated markup into the <pre> element.
    React.useLayoutEffect(() => {
      if (!preRef.current) return;
      // Parse the provided HTML and extract the <pre> element's attributes.
      const template = document.createElement("template");
      template.innerHTML = html.trim();
      const pre = template.content.firstElementChild as HTMLPreElement | null;
      if (pre) {
        preRef.current.className = pre.className;
        preRef.current.innerHTML = pre.innerHTML;
      }
    }, [html]);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(preRef.current?.innerText ?? "");
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // ignore copy errors
      }
    };

    return (
      <div className="relative">
        <pre ref={preRef} />
        <button
          type="button"
          aria-label="Copy code"
          onClick={handleCopy}
          className="absolute right-2 top-2 rounded-md p-1 text-secondary-foreground transition-colors hover:bg-secondary"
        >
          {copied ? <Check className="size-4 text-accent" /> : <Clipboard className="size-4" />}
        </button>
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
          const html = highlighter.codeToHtml(code, {
            lang: langToUse,
            theme: "nord",
          });
          return <CodeBlock html={html} />;
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
