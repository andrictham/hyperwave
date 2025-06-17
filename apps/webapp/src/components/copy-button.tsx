import React from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for the {@link CopyButton} component. */
export interface CopyButtonProps {
  /** Text to copy to the clipboard. */
  readonly text: string;
  /** Optional additional class names for the button. */
  readonly className?: string;
}

/**
 * Display a button that copies the provided text when clicked.
 */
export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={handleCopy}
      className={cn("opacity-0 group-hover:opacity-100 absolute top-2 right-2", className)}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="sr-only">Copy code</span>
    </Button>
  );
}
