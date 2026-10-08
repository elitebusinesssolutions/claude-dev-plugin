import type { EngineInterface, Register } from "claude-code";

import { formatContextStatus } from "./context-status-format";

let latest = 0;

/**
 * Reads the session's context usage and writes it to the status line. A failed read leaves the
 * last line in place, so the hook chain is never held up by it. A refresh that a newer one has
 * overtaken drops its write, so the newest reading wins.
 */
async function refreshContextStatus($: EngineInterface) {
  const ticket = ++latest;
  try {
    const { context } = await $.session.usage();
    if (ticket === latest) {
      await $.ui.status(formatContextStatus(context));
    }
  } catch {
    // keep the previous line
  }
}

/**
 * Refreshes the context status line on `session.start`, `session.compact`, and `turn.complete`,
 * each after the rest of the hook chain has run, and on `prompt.submit` without awaiting it.
 */
export const register: Register = (on) => {
  on("session.start", async ($, e, next) => {
    const result = await next(e);
    await refreshContextStatus($);

    return result;
  });

  on("prompt.submit", async ($, e, next) => {
    // Not awaited, so the usage read never delays the prompt.
    void refreshContextStatus($);

    return next(e);
  });

  on("session.compact", async ($, e, next) => {
    const result = await next(e);
    await refreshContextStatus($);

    return result;
  });

  on("turn.complete", async ($, e, next) => {
    const result = await next(e);
    await refreshContextStatus($);

    return result;
  });
};
