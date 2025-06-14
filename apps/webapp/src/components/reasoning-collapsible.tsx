import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

/**
 * Collapsible container for displaying model reasoning.
 * The reasoning text streams in as children of this component.
 */
export function ReasoningCollapsible({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger className="flex w-full items-center gap-1 text-xs text-muted-foreground">
        <span>Reasoning</span>
        <ChevronDown className={cn("ml-auto size-3 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1">
        <pre className="whitespace-pre-wrap text-xs opacity-70">{children}</pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
