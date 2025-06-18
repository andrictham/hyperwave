import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Lightbulb, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";

/**
 * Props for the {@link ReasoningDetails} component.
 */
export interface ReasoningDetailsProps {
  /** Whether the reasoning is still streaming. */
  readonly isStreaming: boolean;
  /** The reasoning content to display. */
  readonly children: React.ReactNode;
}

/**
 * Animated collapsible card that displays reasoning traces from an LLM.
 *
 * @example
 * ```tsx
 * <ReasoningDetails isStreaming={true}>
 *   <div className="mt-1">{renderParts(reasoning)}</div>
 * </ReasoningDetails>
 * ```
 */
export function ReasoningDetails({ isStreaming, children }: ReasoningDetailsProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Always keep the latest content in view when collapsed
  useEffect(() => {
    if (!open && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [children, open]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start gap-2 pb-2">
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Lightbulb className="size-4" />
          )}
          <div className="flex flex-col">
            <CardTitle className="text-sm">
              {isStreaming ? "Thinking" : "Reasoning details"}
            </CardTitle>
            {!isStreaming && (
              <CardDescription>Expand for details</CardDescription>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto"
          aria-label={open ? "Collapse" : "Expand"}
        >
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ChevronRight className="size-4" />
          </motion.div>
        </button>
      </CardHeader>
      <AnimatePresence initial={false}>
        <motion.div
          key="content"
          initial={false}
          animate={{ height: open ? "auto" : 0 }}
          style={{ overflow: "hidden" }}
          transition={{ type: "tween", duration: 0.2 }}
        >
          <CardContent
            ref={containerRef}
            className={cn(
              "relative pr-2", // extra space for scrollbar
              !open && "max-h-[200px] overflow-y-auto"
            )}
          >
            {!open && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-card to-transparent" />
            )}
            <motion.div layout>{children}</motion.div>
          </CardContent>
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}
