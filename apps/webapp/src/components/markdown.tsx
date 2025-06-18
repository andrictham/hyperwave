import React from "react";
import { cn } from "@/lib/utils";
import { Check, Clipboard } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import ShikiHighlighter, { rehypeInlineCodeProperty, type Language } from "react-shiki";
import remarkGfm from "remark-gfm";
import nord from "shiki/themes/nord.mjs";

const LANGUAGES = [
  "angular-html",
  "angular-ts",
  "astro",
  "blade",
  "c",
  "coffee",
  "coffeescript",
  "cpp",
  "c++",
  "css",
  "glsl",
  "graphql",
  "gql",
  "haml",
  "handlebars",
  "hbs",
  "html",
  "html-derivative",
  "http",
  "imba",
  "java",
  "javascript",
  "js",
  "jinja",
  "jison",
  "json",
  "json5",
  "jsonc",
  "jsonl",
  "jsx",
  "julia",
  "jl",
  "less",
  "markdown",
  "md",
  "marko",
  "mdc",
  "mdx",
  "php",
  "postcss",
  "pug",
  "jade",
  "python",
  "py",
  "r",
  "regexp",
  "regex",
  "sass",
  "scss",
  "shellscript",
  "bash",
  "sh",
  "shell",
  "zsh",
  "sql",
  "stylus",
  "styl",
  "svelte",
  "ts-tags",
  "lit",
  "tsx",
  "typescript",
  "ts",
  "vue",
  "vue-html",
  "wasm",
  "wgsl",
  "wit",
  "xml",
  "yaml",
] as const;

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

  const components = React.useMemo<Components>(() => {
    return {
      code({ node, inline, className, children: codeChildren }: CodeProps) {
        const code = String(codeChildren ?? "").replace(/\n$/, "");
        const langMatch = /language-(\w+)/.exec(className || "");
        const language = langMatch ? (langMatch[1] as Language) : undefined;

        if (!inline && language) {
          return (
            <div className="relative">
              <CopyButton code={code} />
              <ShikiHighlighter
                language={language}
                theme={nord}
                addDefaultStyles={false}
                as="pre"
                className="w-full overflow-x-auto"
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
          <div className="w-full overflow-x-auto my-2">
            <table {...rest} className={cn("w-full", className)}>
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
