// How often live lists refresh while the tab is visible (Doc 03 C3): queues
// move fast; inboxes and what needs attention less so.
export const POLL_QUEUE_MS = 15_000;
export const POLL_INBOX_MS = 30_000;
