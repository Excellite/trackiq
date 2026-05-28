"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Calls `fn` immediately on mount, then every `intervalMs`.
 * Returns `lastUpdated` so callers can show a live timestamp.
 */
export function usePoll(fn: () => Promise<void> | void, intervalMs: number) {
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; }, [fn]);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const run = useCallback(async () => {
    await fnRef.current();
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    run();
    const id = setInterval(run, intervalMs);
    return () => clearInterval(id);
  }, [run, intervalMs]);

  return { lastUpdated };
}
