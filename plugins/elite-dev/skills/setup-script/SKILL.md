---
name: setup-script
description: >
  Creates or extends a Windows setup.ps1 at the repo root that prepares a developer machine: it
  installs the tools the repo needs with winget, installs Node through nvm and pnpm or yarn
  through corepack, installs the Claude CLI, the baseline Claude plugins, and the ASD-STE100 skill,
  signs in to Azure and GitHub, and restores dependencies. Safe to run again.
  Enters plan mode first, so the developer approves every file change. Use when the user asks to
  "add a setup script", "create setup.ps1", "script the dev machine setup", or "add X to the
  setup script". Other skills, such as setup-keyvault, add their own steps to this script.
---

# Set up the setup script

The script is Windows only. It runs in PowerShell 7 or Windows PowerShell 5.1. It installs only what is missing, so a developer can run it again at any time.

Never run `setup.ps1` yourself. It installs software and changes the machine. The developer runs it.

## 1. Enter plan mode

If the session is not in plan mode, call `EnterPlanMode`. If that tool is not available, stop. Ask the developer to press `Shift+Tab`, then invoke the skill again.

Steps 1 through 3 are read-only. Do not edit a file before the developer approves the plan.

## 2. Detect the steps

Use the detection table in [references/steps.md](references/steps.md). For each row, check the files it names. Build the list of steps in the order of that table.

The developer cannot see the table. Name each step by its tool or action, for example "Node 24 through nvm" or "GitHub CLI". Never use a table row number.

Ask the developer for each value you cannot find in the repo. Do not guess:

- The Node major version for a package root that has no `.nvmrc`, `.node-version`, or `engines.node`.
- The Azure tenant ID, when the list has the Azure sign-in step.
- Whether to add an optional step (marked optional in the table).
- Whether to add or drop a plugin in the baseline Claude plugin list, when the list has the Claude plugins step. Show the list and ask.

Then show the detected list and ask the developer what else to install that the detection did not find, for example Docker Desktop, SQL Server, or an editor extension. For each extra tool:

- If the tool has a winget package, find its ID with `winget search --exact <name>`. Add it as `Install-WithWinget "<label>" "<winget id>" "<command>"` with the tools, before the sign-ins.
- If it has no winget package, ask the developer for the install command. Add it as its own function that follows the rules in step 4. If the install command runs a remote script, the function asks before it runs it, like `Install-AspireCli` in the steps reference.
- If the tool has no command to check for, ask the developer how to check that it is installed. Without a check, add it to `$manualSteps` as a manual install.

If `setup.ps1` already exists, read it. Mark each step that it already has, under any function name. The plan adds only the missing steps.

If the request names only part of the repo (for example "add the web app"), add the steps for that part. List every other missing step that the detection found, and ask the developer whether to add them too. Do not add them without an answer.

## 3. Write the plan

List:

1. Each step to add, with the reason from the detection table (for example "Node 22: `src/client/.nvmrc`").
2. Each step that the script already has, as "kept".
3. The README section to add or update.

Name each step by its tool or action, as in step 2. Never use a table row number. List the steps that do not apply under "Not added", by tool name.

Then call `ExitPlanMode`. The approval of the plan is the one approval. Ask again only for a change that is not on the list.

## 4. Write the script

- **New script:** copy the skeleton in [references/skeleton.md](references/skeleton.md). Add the step functions from [references/steps.md](references/steps.md). Call them in the main `try` block in table order.
- **Existing script:** keep its code, names, and style. Add each missing helper from the skeleton only when a new step needs it. Add each new step function and its call in table order. Do not rewrite or rename existing code.

Rules:

- Every step skips its work when the work is already done, and adds its label to `$skipped`.
- Every native command that must succeed runs through `Invoke-Checked`.
- A step that the script cannot finish adds a line to `$manualSteps` and returns. It does not stop the script.
- Keep repo paths relative to `$PSScriptRoot`.
- Never write a secret value into the script. A step that needs a secret reads it at run time.

## 5. Add the README section

Add a section named "Developer machine setup" to the root `README.md`, or update it if it exists. It states:

1. The command: `./setup.ps1` from a PowerShell terminal at the repo root.
2. That the script asks for elevation through a UAC prompt, when the script has the elevation block.
3. That the script is safe to run again.
4. The list of tools it installs, including the Claude CLI, the Claude plugins, and the ASD-STE100 skill, and the manual steps it can report.

Write every file reference as a markdown link. Do not hard-wrap the lines of a markdown file.

## 6. Verify

1. Parse the script. Run this command and make sure it prints no error:

   ```powershell
   $errors = $null; [System.Management.Automation.Language.Parser]::ParseFile("setup.ps1", [ref]$null, [ref]$errors) | Out-Null; $errors
   ```

2. Make sure the script holds no secret value and no personal path.
3. Show the diff to the developer. Tell the developer to run `./setup.ps1` and to report any failure.
4. Wait for a go-ahead before `git commit`.
