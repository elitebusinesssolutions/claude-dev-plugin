// skills/setup-formatting/SKILL.md embeds full prose copies of hooks/format.js
// and hooks/lib/output.js for consumers who install this plugin's ideas
// manually rather than via the plugin itself. Nothing else ties either
// embedded copy to its real file, so each has drifted before (see issue #8)
// and will drift again the next time the real file changes without a
// matching SKILL.md edit. This test extracts each embedded ```js fenced block
// and asserts it is byte-for-byte identical to its real file, so `npm test`
// fails the moment either one diverges.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SKILL_PATH = path.resolve(__dirname, "..", "skills", "setup-formatting", "SKILL.md");
const FORMAT_JS_PATH = path.resolve(__dirname, "..", "hooks", "format.js");
const OUTPUT_JS_PATH = path.resolve(__dirname, "..", "hooks", "lib", "output.js");
const FORMAT_JS_MARKER = "**a. Create `.claude/hooks/format.js`** with this content:";
const OUTPUT_JS_MARKER = "First, create `.claude/hooks/lib/output.js` with this content:";

function extractEmbeddedJs(skillMd, marker) {
  const markerIndex = skillMd.indexOf(marker);
  assert.ok(markerIndex !== -1, `Expected to find marker "${marker}" in SKILL.md`);

  const afterMarker = skillMd.slice(markerIndex);
  const fenceMatch = afterMarker.match(/```js\n([\s\S]*?)\n```/);
  assert.ok(
    fenceMatch,
    `Expected a fenced \`\`\`js code block immediately after the marker "${marker}" in SKILL.md`
  );

  return fenceMatch[1];
}

test("SKILL.md's embedded format.js copy matches the real hooks/format.js verbatim", () => {
  const skillMd = fs.readFileSync(SKILL_PATH, "utf8");
  const embedded = extractEmbeddedJs(skillMd, FORMAT_JS_MARKER);

  // The real file ends with a single trailing newline; the fenced block's
  // captured group excludes the newline immediately before the closing ```,
  // so strip one trailing newline from the real file for a like-for-like
  // comparison. Any other difference is real drift.
  const real = fs.readFileSync(FORMAT_JS_PATH, "utf8").replace(/\n$/, "");

  assert.equal(
    embedded,
    real,
    "skills/setup-formatting/SKILL.md's embedded copy of hooks/format.js (step 8a) has " +
      "drifted from the real file. Update the fenced code block in SKILL.md to match " +
      "hooks/format.js exactly."
  );
});

test("SKILL.md's embedded output.js copy matches the real hooks/lib/output.js verbatim", () => {
  const skillMd = fs.readFileSync(SKILL_PATH, "utf8");
  const embedded = extractEmbeddedJs(skillMd, OUTPUT_JS_MARKER);

  const real = fs.readFileSync(OUTPUT_JS_PATH, "utf8").replace(/\n$/, "");

  assert.equal(
    embedded,
    real,
    "skills/setup-formatting/SKILL.md's embedded copy of hooks/lib/output.js has drifted " +
      "from the real file. Update the fenced code block in SKILL.md to match " +
      "hooks/lib/output.js exactly."
  );
});
