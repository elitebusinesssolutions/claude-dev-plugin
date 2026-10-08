import type { On, SessionMessage } from "claude-code";
import { expect, test } from "claude-code/testing";

const usage = {
  startedAt: 0,
  context: { tokens: 84000, window: 200000, percent: 42 },
  rateLimits: []
};

const sessionStart = { cwd: "/repo", surface: "terminal", isInteractive: true } as const;
const promptSubmit = { text: "hello", wait: false, origin: { kind: "composer" } } as const;
const summary: SessionMessage = { role: "user", text: "summary", toolUses: [] };
const sessionCompact = { trigger: "manual", messages: [summary] } as const;
const turnComplete = {
  answer: "done",
  durationMs: 1,
  isAborted: false,
  turnId: "t1",
  reason: "answer"
} as const;

type Stub = {
  readUsage?: () => Promise<typeof usage>;
  // How many prompt.submit calls the engine fails before it answers.
  failSubmits?: number;
};

// Stands in for the engine beneath the plugin: records every status line and the order of events.
const stubEngine = (on: On, { readUsage = async () => usage, failSubmits = 0 }: Stub = {}) => {
  const log: string[] = [];
  let submits = 0;
  on("session.usage", async () => ({ value: await readUsage() }));
  on("ui.status", async (_$, e) => {
    log.push(`status:${e.text}`);

    return { value: undefined };
  });
  on("session.start", async (_$, e) => {
    log.push("session.start");
    return { cwd: e.cwd };
  });
  on("prompt.submit", async (_$, e) => {
    log.push("prompt.submit");
    if (submits++ < failSubmits) throw new Error("engine failed");

    return { text: e.text };
  });
  on("session.compact", async () => {
    log.push("session.compact");
    return { messages: [summary] };
  });
  on("turn.complete", async (_$, e) => {
    log.push("turn.complete");
    return { text: e.answer };
  });

  return log;
};

test("session.start refreshes the context line after the engine starts", async ($, on) => {
  const log = stubEngine(on);

  expect(await $.session.start(sessionStart)).toEqual({ cwd: "/repo" });
  expect(log).toEqual(["session.start", "status:ctx 42% 84k/200k"]);
});

test("prompt.submit refreshes the context line before the prompt goes on", async ($, on) => {
  const log = stubEngine(on);

  expect(await $.prompt.submit(promptSubmit)).toEqual({ text: "hello" });
  expect(log).toEqual(["status:ctx 42% 84k/200k", "prompt.submit"]);
});

test("turn.complete refreshes the context line after the turn", async ($, on) => {
  const log = stubEngine(on);

  expect(await $.turn.complete(turnComplete)).toEqual({ text: "done" });
  expect(log).toEqual(["turn.complete", "status:ctx 42% 84k/200k"]);
});

test("session.compact refreshes the context line after the compaction", async ($, on) => {
  const log = stubEngine(on);

  expect(await $.session.compact(sessionCompact)).toEqual({ messages: [summary] });
  expect(log).toEqual(["session.compact", "status:ctx 42% 84k/200k"]);
});

test("a failed usage read leaves the line alone and the event still completes", async ($, on) => {
  const log = stubEngine(on, {
    readUsage: async () => {
      throw new Error("usage unavailable");
    }
  });

  expect(await $.prompt.submit(promptSubmit)).toEqual({ text: "hello" });
  expect(log).toEqual(["prompt.submit"]);
});

test("an engine failure under prompt.submit still refreshes once and is not retried", async ($, on) => {
  const log = stubEngine(on, { failSubmits: 1 });

  await expect($.prompt.submit(promptSubmit)).rejects.toThrow();
  expect(log).toEqual(["status:ctx 42% 84k/200k", "prompt.submit"]);
});
