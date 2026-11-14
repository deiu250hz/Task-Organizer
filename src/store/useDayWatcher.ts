import { useEffect } from "react";
import { useAppStore } from "./useAppStore";

/**
 * Keeps the app on the right day while it runs for days in the tray. It asks the store to refresh
 * every 30 seconds, and also the moment the window gets focus or becomes visible again (timers can
 * be throttled while the window is hidden and stop while the PC sleeps, so the first event after
 * waking up does the catching up). refreshDay does nothing unless the real day changed, and
 * simultaneous calls share one run, so asking often is cheap.
 */
export function useDayWatcher(intervalMs = 30_000): void {
  const refreshDay = useAppStore((s) => s.refreshDay);

  useEffect(() => {
    const check = () => {
      void refreshDay();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") check();
    };

    const id = setInterval(check, intervalMs);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisibilityChange);
    // Remove everything when the component unmounts (and between StrictMode's two runs in development).
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshDay, intervalMs]);
}
