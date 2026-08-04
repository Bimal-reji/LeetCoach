/** Right-click integration: "Ask LeetCoach" on selected code/text. */
import { MSG } from "../shared/constants";

export const ASK_MENU_ID = "leetcoach-ask";
export const EXPLAIN_MENU_ID = "leetcoach-explain";
export const REVIEW_MENU_ID = "leetcoach-review";

export function createContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: ASK_MENU_ID,
      title: "🤖 Ask LeetCoach about this selection",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: EXPLAIN_MENU_ID,
      title: "💡 Explain selected code",
      contexts: ["selection"],
    });
    chrome.contextMenus.create({
      id: REVIEW_MENU_ID,
      title: "🔍 Review selected code",
      contexts: ["selection"],
    });
  });
}

export interface SelectionRequest {
  text: string;
  mode?: "ask" | "explain" | "review";
}

/** Notify the side panel about a context-menu selection. */
export async function sendSelectionToPanel(request: SelectionRequest): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: MSG.askSelection, payload: request });
  } catch {
    /* side panel not open — ignore */
  }
}
