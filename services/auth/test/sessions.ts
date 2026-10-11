/**
 * Waits for the next whole second. Tokens carry whole seconds, and those from
 * a reset's own second still work, so a test whose old session must end waits
 * for this between signing in and resetting.
 */
export const nextSecond = () =>
  new Promise((resolve) => setTimeout(resolve, 1000 - (Date.now() % 1000)));
