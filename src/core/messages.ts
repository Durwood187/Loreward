// Messages between the popup and the content script on the current tab.
// Using messages (instead of reading the tab's URL) means we don't need the
// broad "tabs" permission.

export type Request = { type: 'ss:getStatus' } | { type: 'ss:revealAll' };

export interface StatusReply {
  siteId: string;
  siteName: string;
  /** Units currently blurred on the page. */
  blockedCount: number;
}

export interface RevealAllReply {
  revealed: number;
}
