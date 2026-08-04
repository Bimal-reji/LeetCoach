/** Desktop notifications for completed analyses. */

const NOTIFICATION_ID = "leetcoach-analysis-done";

export async function notifyAnalysisDone(title: string, message: string): Promise<void> {
  try {
    await chrome.notifications.create(NOTIFICATION_ID, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon128.png"),
      title,
      message: message.slice(0, 180),
      priority: 1,
    });
    // Auto-dismiss after 5s.
    setTimeout(() => chrome.notifications.clear(NOTIFICATION_ID), 5000);
  } catch {
    /* notifications unavailable (e.g. permission) — silent */
  }
}
