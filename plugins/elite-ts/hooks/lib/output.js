// Shared helper for format.js.

/**
 * Turns a spawned process's stdout/stderr into a single truncated string suitable for a failure
 * message.
 *
 * stdout and stderr are joined with an explicit "\n" separator before being trimmed/split — without
 * that separator, a stdout chunk that doesn't already end in its own trailing newline would have its
 * last line silently merge with stderr's first line into one garbled line. Empty streams are dropped
 * before joining so a missing stdout or stderr doesn't leave a stray blank line at the start, end or
 * middle of the result.
 * @param {string} stdout Captured standard output.
 * @param {string} stderr Captured standard error.
 * @param {{ head?: number }} [options] `head` mirrors Array.prototype.slice(0, n): it keeps only the
 * earliest lines, where the root cause of a failure usually shows up first (e.g. tsc/eslint errors).
 * Omitting it returns the full (trimmed, joined) output.
 * @returns {string} The combined, trimmed output.
 */
function truncatedOutput(stdout, stderr, { head } = {}) {
  const combined = [stdout, stderr]
    // Strip any trailing newline(s) each stream already ends with, so joining
    // always inserts exactly one separator — never zero (the merge bug) and
    // never an extra blank line (when a stream already ended in "\n").
    .map((s) => (typeof s === "string" ? s.replace(/(\r?\n)+$/, "") : ""))
    .filter((s) => s.length > 0)
    .join("\n")
    .trim();

  const lines = combined.split(/\r?\n/);
  const sliced = head != null ? lines.slice(0, head) : lines;

  return sliced.join("\n");
}

module.exports = { truncatedOutput };
