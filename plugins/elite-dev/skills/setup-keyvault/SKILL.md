---
name: setup-keyvault
description: >
  Configures Azure Key Vault for local development secrets in a new project. Adds the vault loading code to .NET Api and Functions apps, Next.js apps, and an Aspire AppHost, then adds the setup script step and the README section. Enters plan mode first, so the developer approves every file and command before any edit. Use when the user asks to "set up Key Vault", "add Key Vault to this project", or "load dev secrets from Key Vault". Copy the pattern exactly. Do not invent alternatives.
---

# Set up Key Vault

Each app reads its secrets from its own vault. Local dev only. A developer signs in with `az login`. `DefaultAzureCredential` tries several credential sources. It uses the `az login` sign-in when no earlier source works. If the app uses the wrong identity, unset the `AZURE_*` environment variables.

Never read or print a secret value. Never search the disk for keys or connection strings. Ask the developer instead. The seed script that this skill can write reads secret values when the developer runs it. The skill never runs that script.

## 1. Enter plan mode

If the session is not in plan mode, call `EnterPlanMode`. If that tool is not available, stop. Ask the developer to press `Shift+Tab`, then invoke the skill again.

Steps 1 through 3 are read-only. Do not edit a file or run a command that changes the project before the developer approves the plan.

## 2. Ask for the inputs

Ask for each value. Do not guess. For the vault name, suggest the default and ask the developer to confirm.

- Project short name, for example `myproj`.
- Apps that need secrets: .NET Api, .NET Functions, Next.js apps.
- Azure tenant ID.
- Resource group that holds the vaults.
- Vault name for each app. Suggest `kv-<project>-<app>`. For a .NET app, `<app>` is the last dot-separated segment of the project name, in lower case (`Acme.Api` gives `api`). For a Next.js app, `<app>` is the app folder name, or the `name` in `package.json` when the app sits at the repo root. Suggest the name only if the name has 3 to 24 characters, uses only letters, digits, and single hyphens, starts with a letter, and ends with a letter or digit. Otherwise ask the developer for a valid name. Vault URL: `https://<vault>.vault.azure.net/`.
- Path of the README that holds the secrets section, relative to the repo root.
- Seed script. Ask: "Create a script that copies your existing local secrets into the vaults?" If yes, ask for:
  - The script path, relative to the repo root. Suggest `scripts/seed-keyvault-secrets.ps1`.
  - The env file of each JS/TS app that has one, for example `.env.local`. Any JS/TS app can have a seed source: Next.js, Vue, React, Vite, or plain TypeScript. Suggest `<app folder>/.env.local`. For an app that is not a Next.js app, also ask for its vault name, with the same suggestion rule as above.
  - The Azure location for new vaults, or use the location of the resource group.

## 3. Detect the stack

Look for these files in the target project.

- `*.csproj` with `Microsoft.NET.Sdk.Web` or `Microsoft.Azure.Functions.Worker`: .NET app.
- `package.json` with `next`: Next.js app.
- A csproj that references `Aspire.Hosting.AppHost` or uses the `Aspire.AppHost.Sdk`: the AppHost. The Api resource is the `AddProject` call that names the Api project. If several calls match, ask the developer.
- `setup.ps1` at the repo root: setup script.
- Seed script only: any other `package.json` app, for example with `vue`, `react`, or `vite`, and its env file.

Apply only the reference files that match. Write the plan: the inputs, every file you plan to create or edit (including the seed script, if requested), and every command you plan to run. Then call `ExitPlanMode`. The approval of the plan is the one approval for the list. Ask again only for a file or command that is not on the list.

## 4. Apply the references

1. .NET Api and Functions: [references/dotnet.md](references/dotnet.md).
2. Next.js apps: [references/nextjs.md](references/nextjs.md).
3. Aspire AppHost: [references/apphost.md](references/apphost.md).
4. Setup script, README, and RBAC: [references/setup-script.md](references/setup-script.md).
5. Seed script, only if the developer asked for it: [references/seed-script.md](references/seed-script.md).

## 5. Secret names

- .NET: the secret name uses `--` in place of `:`. The name `StorageSettings--ConnectionString` maps to `StorageSettings:ConnectionString`.
- Next.js: the secret name uses dashes. Each `-` becomes `_` and the name becomes upper case. The name `AUTH0-SECRET` maps to `AUTH0_SECRET`.
- Every enabled secret loads. A new secret needs no code change.

## 6. Override rules

- .NET: user secrets win for each key. The vault supplies every other key. The vault also wins over `appsettings.json`, environment variables, and command-line args, including values that Aspire injects. Do not put a key in the vault that the AppHost already sets, for example `ConnectionStrings--<resource>`.
- Next.js: a value already in `.env.local` wins. The vault supplies every other key.

## 7. Verify

1. For each changed .NET project, run `dotnet build`. Stop on a compile error and report it.
2. For each changed Next.js app, run the checks in section 3 of [references/nextjs.md](references/nextjs.md).
3. If the skill wrote a seed script, check that it parses: `[System.Management.Automation.Language.Parser]::ParseFile(<path>, [ref]$null, [ref]$errors)` must leave `$errors` empty. Do not run the script.
4. Make sure the skill added no secret value to any file.
5. Show the diff to the developer. Wait for a go-ahead before `git commit`.
