import { expect, test } from "claude-code/testing";

import { formatContextStatus } from "./context-status-format";

test("shows percent and compact token counts", () => {
  expect(formatContextStatus({ tokens: 84000, window: 200000, percent: 42 })).toBe(
    "ctx 42% 84k/200k"
  );
});

test("uses M for a 1M window", () => {
  expect(formatContextStatus({ tokens: 500000, window: 1000000, percent: 50 })).toBe(
    "ctx 50% 500k/1M"
  );
});

test("switches to M where the k form would round to 1000k", () => {
  expect(formatContextStatus({ tokens: 999949, window: 1500000, percent: 67 })).toBe(
    "ctx 67% 999.9k/1.5M"
  );
  expect(formatContextStatus({ tokens: 999950, window: 1500000, percent: 67 })).toBe(
    "ctx 67% 1M/1.5M"
  );
});

test("shows small counts without a unit", () => {
  expect(formatContextStatus({ tokens: 999, window: 200000, percent: 0 })).toBe("ctx 0% 999/200k");
});

test("derives the percent from tokens and window when it is missing", () => {
  expect(formatContextStatus({ tokens: 84000, window: 200000 })).toBe("ctx 42% 84k/200k");
});

test("shows only the window when there is no usage reading", () => {
  expect(formatContextStatus({ window: 200000 })).toBe("ctx 200k");
});

test("shows only the percent when tokens are missing", () => {
  expect(formatContextStatus({ window: 200000, percent: 42 })).toBe("ctx 42%");
});

test("shows no numbers when nothing is known", () => {
  expect(formatContextStatus({ window: 0 })).toBe("ctx");
  expect(formatContextStatus({ tokens: 10, window: 0 })).toBe("ctx");
});

test("omits tokens when the window size is unknown", () => {
  expect(formatContextStatus({ tokens: 10, window: 0, percent: 3 })).toBe("ctx 3%");
});
