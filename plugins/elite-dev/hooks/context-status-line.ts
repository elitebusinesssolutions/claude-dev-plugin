import type { EngineInterface, Register } from "claude-code";

import { formatContextStatus } from "./context-status-format";

// A failed read leaves the last line in place; the hook chain is never held up by it.
async function refreshContextStatus($: EngineInterface) {
  try {
    $.ui.status(formatContextStatus((await $.session.usage()).context));
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
    await refreshContextStatus($);

    return next(e);
  }).catch((_$, e, next) => next(e));

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
