import { expect, test } from "claude-code/testing";

import { formatContextStatus } from "./context-status-format";

test("shows percent and compact token counts", () => {
  expect(formatContextStatus({ tokens: 84000, window: 200000, percent: 42 })).toBe(
    "ctx 42% 84k/200k"
  );
});

test("treats a missing reading as an empty window", () => {
  expect(formatContextStatus({ window: 200000 })).toBe("ctx 0% 0/200k");
});

test("omits tokens when the window size is unknown", () => {
  expect(formatContextStatus({ tokens: 10, window: 0, percent: 3 })).toBe("ctx 3%");
});
