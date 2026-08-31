#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO_ROOT = path.join(__dirname, "..");

function pluginNames() {
  const pluginsDir = path.join(REPO_ROOT, "plugins");
  return fs
    .readdirSync(pluginsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(pluginsDir, name, "skills")));
}

function parseChangedSkillNames(diffText, validPlugins) {
  const seen = new Set();
  const pairs = [];
  for (const line of diffText.split("\n")) {
    const match = /^plugins\/([^/]+)\/skills\/([^/]+)\//.exec(line.trim());
    if (!match) continue;
    const [, pluginName, skillName] = match;
    if (!validPlugins.has(pluginName) || skillName.endsWith("-workspace")) continue;
    const key = `${pluginName}/${skillName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ pluginName, skillName });
  }
  return pairs;
}

function changedSkillNames(baseRef) {
  let diff;
  try {
    diff = execFileSync("git", ["diff", "--name-only", `${baseRef}...HEAD`], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (err) {
    throw new Error(
      `could not diff against base ref "${baseRef}" (unfetched ref, typo, or a shallow clone missing the base commit): ${err.message}`,
      { cause: err }
    );
  }

  return parseChangedSkillNames(diff, new Set(pluginNames()));
}

function validateEvalsJson(data, skillName) {
  const errors = [];

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return ["evals.json must contain a single JSON object"];
  }

  if (typeof data.skill_name !== "string" || data.skill_name.trim().length === 0) {
    errors.push("skill_name must be a non-empty string");
  } else if (data.skill_name !== skillName) {
    errors.push(`skill_name "${data.skill_name}" does not match its directory name "${skillName}"`);
  }

  if (!Array.isArray(data.evals) || data.evals.length === 0) {
    errors.push("evals must be a non-empty array");
    return errors;
  }

  const seenIds = new Set();
  data.evals.forEach((evalCase, index) => {
    const label = `evals[${index}]`;

    if (typeof evalCase !== "object" || evalCase === null || Array.isArray(evalCase)) {
      errors.push(`${label} must be an object`);
      return;
    }

    if (typeof evalCase.id !== "number") {
      errors.push(`${label}.id must be a number`);
    } else if (seenIds.has(evalCase.id)) {
      errors.push(`${label}.id ${evalCase.id} is duplicated`);
    } else {
      seenIds.add(evalCase.id);
    }

    if (typeof evalCase.prompt !== "string" || evalCase.prompt.trim().length === 0) {
      errors.push(`${label}.prompt must be a non-empty string`);
    }

    if (!Array.isArray(evalCase.expectations) || evalCase.expectations.length === 0) {
      errors.push(`${label}.expectations must be a non-empty array`);
    } else if (evalCase.expectations.some((e) => typeof e !== "string" || e.trim().length === 0)) {
      errors.push(`${label}.expectations must contain only non-empty strings`);
    }
  });

  return errors;
}

function main() {
  const baseRef = process.argv[2];
  if (!baseRef) {
    console.error("Usage: node validate-skill-evals.js <base-ref>");
    process.exit(1);
  }

  let pairs;
  try {
    pairs = changedSkillNames(baseRef);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  if (pairs.length === 0) {
    console.log("No changed files under plugins/*/skills/ — nothing to validate.");
    return;
  }

  let hadFailure = false;

  for (const { pluginName, skillName } of pairs) {
    const label = `${pluginName}/${skillName}`;
    const evalsPath = path.join(
      REPO_ROOT,
      "plugins",
      pluginName,
      "skills",
      skillName,
      "evals",
      "evals.json"
    );
    if (!fs.existsSync(evalsPath)) {
      console.log(`- ${label}: no evals/evals.json (not all skills need one) — skipped`);
      continue;
    }

    let data;
    try {
      data = JSON.parse(fs.readFileSync(evalsPath, "utf8"));
    } catch (err) {
      console.error(`- ${label}: evals/evals.json is not valid JSON (${err.message})`);
      hadFailure = true;
      continue;
    }

    const errors = validateEvalsJson(data, skillName);
    if (errors.length === 0) {
      console.log(`- ${label}: evals/evals.json OK (${data.evals.length} eval case(s))`);
    } else {
      console.error(`- ${label}: evals/evals.json is invalid:`);
      for (const error of errors) {
        console.error(`    - ${error}`);
      }
      hadFailure = true;
    }
  }

  if (hadFailure) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateEvalsJson, changedSkillNames, parseChangedSkillNames, pluginNames };
