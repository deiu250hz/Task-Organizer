import { useEffect, useState } from "react";

/**
 * The current time in epoch milliseconds, refreshed on an interval so things that depend on
 * the clock (the pet's happy hour ending, bedtime) update without any user action.
 * Reading the clock lives here, in the store layer, never in domain/.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id); // stop the timer when the component unmounts (and between StrictMode runs)
  }, [intervalMs]);
  return now;
}
