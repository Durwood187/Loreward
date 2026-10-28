# Permissions (for the Chrome Web Store listing)

| Permission | Justification (one line) |
|---|---|
| `storage` | Saves your chosen series, current book and on/off switches on your device. |
| Site access: `https://*.reddit.com/*` (content script) | Needed to read and blur posts and comments on Reddit that may contain spoilers. |
| Site access: `https://www.google.com/search*` (content script) | Needed to read and blur search results and AI answers on Google search pages that may contain spoilers. Search pages only, not the rest of Google. |

**Single purpose:** hides possible spoilers for the book series you're reading on supported websites.

**Not requested, on purpose:**
- No `tabs` permission. The popup talks to the page through messages instead of reading tab URLs.
- No site access beyond supported sites. YouTube and Goodreads access is added only when their adapters ship.
- Google access is limited to search result pages (`/search`), not Gmail, Docs or other Google sites.
- No `host_permissions` block. The content script's site list is the only site access.

**Data use (for the privacy section):** no data is collected or transmitted. Settings are
stored locally with `chrome.storage.local` and never leave the browser. Page text is
checked in memory and not stored. There is no network access, no analytics and no remote code.
