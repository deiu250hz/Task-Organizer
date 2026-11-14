import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

// The only place the notification plugin is imported (like repositories/ for SQL). The store calls
// this; components and domain/ never do.
export interface Notifier {
  /** Shows a system notification. Resolves true when it was sent, false when it could not be. Never throws. */
  notify(title: string, body: string): Promise<boolean>;
}

async function notify(title: string, body: string): Promise<boolean> {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (!granted) return false;
    sendNotification({ title, body });
    return true;
  } catch {
    // Not running inside Tauri (plain `npm run dev` in a browser), or the system refused: a missing
    // toast is not worth an error banner. The caller treats false as "try again next time".
    return false;
  }
}

export const notifier: Notifier = { notify };
