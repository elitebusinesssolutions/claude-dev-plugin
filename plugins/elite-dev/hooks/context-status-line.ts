import type { EngineInterface, Register } from "claude-code";

import { formatContextStatus } from "./context-status-format";

// A failed read leaves the last line in place; the hook chain is never held up by it.
async function refreshContextStatus($: EngineInterface) {
  try {
    await $.ui.status(formatContextStatus((await $.session.usage()).context));
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
