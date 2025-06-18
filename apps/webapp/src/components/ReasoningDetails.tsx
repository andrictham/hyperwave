import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "./ui/card";
import { Loader2, Lightbulb, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface ReasoningDetailsProps {
  readonly isStreaming: boolean;
  readonly children: React.ReactNode;
}

/**
 * Card component that displays reasoning traces from an LLM.
 * It can be expanded to show the full content or collapsed to a
 * preview limited to 200px in height. Content growth while streaming
 * is smoothly animated.
 */
export function ReasoningDetails({ isStreaming, children }: ReasoningDetailsProps) {
  const [open, setOpen] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const collapsedHeight = 200;
  const [needsFade, setNeedsFade] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const check = () => {
      setNeedsFade(el.scrollHeight > collapsedHeight);
    };
    check();
  }, [children, collapsedHeight]);

  const icon = isStreaming ? (
    <Loader2 className="size-4 animate-spin" />
  ) : (
    <Lightbulb className="size-4" />
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="flex items-start gap-3 flex-1">
          {icon}
          <div className="flex flex-col">
            <CardTitle className="text-sm">
              {isStreaming ? "Thinking" : "Reasoning details"}
            </CardTitle>
            {!isStreaming && (
              <CardDescription>Expand for details</CardDescription>
            )}
          </div>
        </div>
        <CardAction>
          <button
            type="button"
            aria-label={open ? "Collapse" : "Expand"}
            onClick={() => setOpen((v) => !v)}
            className="text-muted-foreground"
          >
            <ChevronRight
              className={cn(
                "size-4 transition-transform",
                open && "rotate-90"
              )}
            />
          </button>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <motion.div
          layout
          initial={false}
          animate={{ height: open ? "auto" : collapsedHeight }}
          style={{ overflow: "hidden" }}
        >
          <div ref={contentRef} className="relative flex flex-col justify-end px-6 py-4">
            {children}
            {needsFade && !open && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-card to-card/0" />
            )}
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
