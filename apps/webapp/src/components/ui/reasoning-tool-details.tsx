"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight, Lightbulb, Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface ReasoningAndToolDetailsProps {
  /**
   * Whether the assistant is still streaming the content for this section.
   * When true, the component will keep scrolling to the bottom to reveal new
   * content.
   */
  isStreaming: boolean;
  /**
   * Specify whether this section displays model reasoning or tool invocation
   * information. The heading text changes based on this type.
   */
  type: "reasoning" | "tool";
  children: React.ReactNode;
  className?: string;
}

export function ReasoningAndToolDetails({
  isStreaming,
  type,
  children,
  className,
}: ReasoningAndToolDetailsProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrollState, setScrollState] = React.useState({
    isAtTop: true,
    isAtBottom: false,
  });
  const contentRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const prevStreamingRef = React.useRef(isStreaming);

  const updateScrollState = React.useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtTop = scrollTop === 0;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 1; // Allow for sub-pixel differences

    setScrollState({ isAtTop, isAtBottom });
  }, []);

  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Update scroll state initially
    updateScrollState();

    // Add scroll listener
    scrollContainer.addEventListener("scroll", updateScrollState, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", updateScrollState);
    };
  }, [updateScrollState]);

  // Handle streaming state changes
  React.useEffect(() => {
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = isStreaming;

    if (isStreaming && scrollContainerRef.current) {
      // During streaming: scroll to bottom to show new content
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
      setTimeout(updateScrollState, 300);
    } else if (wasStreaming && !isStreaming && scrollContainerRef.current) {
      // When streaming ends: scroll back to top
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: 0,
            behavior: "smooth",
          });
          setTimeout(updateScrollState, 300);
        }
      }, 500); // Small delay to let the last content settle
    }
  }, [isStreaming, updateScrollState]);

  // Handle content changes during streaming
  React.useEffect(() => {
    if (isStreaming && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [children, isStreaming]);

  // Update scroll state when opening/closing
  React.useEffect(() => {
    setTimeout(updateScrollState, 100); // Small delay to allow animation to start
  }, [isOpen, updateScrollState]);

  return (
    <Card className={cn("prose", className)}>
      <CardHeader className="pb-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full text-left hover:bg-accent dark:hover:bg-accent/20 rounded-lg py-2 px-4 -m-2 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center">
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Lightbulb className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-card-foreground">
                {type === "reasoning"
                  ? isStreaming
                    ? "Thinking"
                    : "Reasoning details"
                  : isStreaming
                    ? "Running tools"
                    : "Tool call details"}
              </span>
              {!isStreaming && (
                <span className="text-xs text-muted-foreground">
                  {isOpen ? "Collapse details" : "Expand for details"}
                </span>
              )}
            </div>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </button>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="relative">
          <motion.div
            ref={scrollContainerRef}
            animate={{
              height: isOpen ? "auto" : "150px",
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              duration: 0.4,
            }}
            className={cn(
              "relative overflow-hidden no-scrollbar scroll-smooth",
              isOpen && "overflow-y-auto",
            )}
          >
            <div ref={contentRef} className="text-sm text-card-foreground/80 leading-relaxed">
              {children}
            </div>
          </motion.div>

          {/* Top fade overlay - only show when collapsed and not at top */}
          <motion.div
            animate={{
              opacity: isOpen ? 0 : scrollState.isAtTop ? 0 : 1,
            }}
            transition={{
              duration: 0.2,
            }}
            className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-card/90 to-transparent pointer-events-none z-10"
          />

          {/* Bottom fade overlay - only show when collapsed and not at bottom */}
          <motion.div
            animate={{
              opacity: isOpen ? 0 : scrollState.isAtBottom ? 0 : 1,
            }}
            transition={{
              duration: 0.2,
            }}
            className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/90 to-transparent pointer-events-none z-10"
          />
        </div>
      </CardContent>
    </Card>
  );
}
