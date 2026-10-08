import type { EngineInterface, Register } from "claude-code";

import { formatContextStatus } from "./context-status-format";

let latest = 0;

// A failed read leaves the last line in place; the hook chain is never held up by it.
// A refresh that a newer one has overtaken drops its write, so the newest reading wins.
async function refreshContextStatus($: EngineInterface) {
  const ticket = ++latest;
  try {
    const { context } = await $.session.usage();
    if (ticket === latest) await $.ui.status(formatContextStatus(context));
  } catch {
    // keep the previous line
  }
}

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
