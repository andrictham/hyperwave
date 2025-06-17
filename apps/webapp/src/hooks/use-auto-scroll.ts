import { RefObject, useEffect, useLayoutEffect, useState } from "react";

/**
 * Options for {@link useAutoScroll}.
 */
export interface UseAutoScrollOptions {
  /**
   * Pixel threshold from the bottom to consider the container scrolled to the
   * bottom. Defaults to `20`.
   */
  threshold?: number;
}

/**
 * Attaches autoscroll behavior to a scrollable container. The container will
 * scroll to the bottom whenever any dependency in {@link deps} changes, unless
 * the user has manually scrolled away from the bottom. Autoscroll is
 * re-enabled once the user scrolls back to the bottom.
 *
 * @param ref - Ref to the scrolling container element.
 * @param deps - Dependencies that trigger scrolling when changed.
 * @param options - Optional {@link UseAutoScrollOptions}.
 */
export function useAutoScroll(
  ref: RefObject<HTMLElement>,
  deps: ReadonlyArray<unknown>,
  options: UseAutoScrollOptions = {},
): void {
  const { threshold = 20 } = options;
  const [autoScroll, setAutoScroll] = useState(true);

  // Update autoscroll state when the user scrolls.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setAutoScroll(distanceFromBottom <= threshold);
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [ref, threshold]);

  // Scroll to the bottom whenever new content arrives while autoscroll is active.
  useLayoutEffect(() => {
    if (!autoScroll) return;
    const el = ref.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [ref, autoScroll, ...deps]);

  // Ensure autoscroll during streaming when element size changes.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (autoScroll) {
        el.scrollTop = el.scrollHeight;
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, autoScroll]);
}
