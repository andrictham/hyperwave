import * as React from "react";

/**
 * Manage automatic scrolling behavior for a scroll container. Autoscroll is
 * active by default and disabled when the user scrolls up. When the user
 * scrolls back to the bottom, autoscroll is re-enabled.
 *
 * @param containerRef - Ref pointing to the scrollable element.
 * @returns Whether autoscroll is currently active.
 */
export function useAutoscroll(
  containerRef: React.RefObject<HTMLElement>,
): boolean {
  const [active, setActive] = React.useState(true);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom =
        Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight;
      setActive(atBottom);
    };

    el.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [containerRef]);

  return active;
}
