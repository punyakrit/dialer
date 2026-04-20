"use client";

import { useEffect } from "react";

/**
 * Prompts the user before navigating away while `active` is true. The browser
 * decides whether to honor the prompt; modern Chrome/Safari only show the
 * native confirm if the page has received user input recently, which is
 * fine — the user initiated the call.
 */
export function useBeforeUnloadGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "A call is in progress. Leave anyway?";
      return e.returnValue;
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}
