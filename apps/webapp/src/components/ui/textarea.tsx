import * as React from "react";
import { cn } from "@/lib/utils";
import TextareaAutosize from "react-textarea-autosize";

/**
 * A textarea component that grows with its content using
 * `react-textarea-autosize`. Accepts all props for
 * `TextareaAutosize`.
 */
function Textarea({ className, ...props }: React.ComponentProps<typeof TextareaAutosize>) {
  return (
    <TextareaAutosize
      data-slot="textarea"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/70 dark:placeholder:text-muted-foreground/50 selection:bg-primary selection:text-primary-foreground flex w-full min-h-10 resize-none rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-md",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
