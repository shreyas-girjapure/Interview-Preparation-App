"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scrolls the window to the top whenever the pathname changes.
 * Useful for same-segment navigations (e.g. /questions/[slug] → /questions/[slug])
 * where Next.js may not automatically reset scroll position.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
