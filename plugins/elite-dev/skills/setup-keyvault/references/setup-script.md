# Setup script, README, and RBAC

## 1. Vaults and roles

- One vault for each app: `kv-<project>-<app>`. All vaults live in one resource group.
- Vault URL: `https://<vault>.vault.azure.net/`.
- Runtime reads need the role **Key Vault Secrets User** on each vault.
- Seeding or editing secrets needs **Key Vault Secrets Officer** on each vault. Creating a vault needs a Contributor-level role on the resource group.
- With only Secrets User, a write gives a 403 `ForbiddenByRbac`.
- The developer runs `az login --tenant <tenant-id> --skip-subscription-discovery` before the first run.

The skill does not create vaults and does not assign roles. Tell the developer which roles to request.

## 2. Setup script

If the repo has a `setup.ps1` (a script that prepares a developer machine), add these parts. Keep the style of the existing script. If it has no such script, ask the developer whether to create one.

- A parameter for the Azure tenant ID and a variable for each vault name.
- A sign-in check. Compare `az account show --query tenantId -o tsv` with the tenant ID from the inputs. Run `az login --tenant <tenant-id> --skip-subscription-discovery` when they differ or when no sign-in exists.
- Each step skips its work when already done, so the script runs again safely.
- A final summary with three lists: installed, skipped, and manual steps.
- Functions only: a step that copies each trigger secret from the Api vault into user secrets of the Functions project. Run `az keyvault secret show --vault-name <api-vault> --name "<Section>--<Key>" --query value -o tsv` and pass the value to `dotnet user-secrets set` without printing it. If Azure reports an authorization failure, add a manual step: ask for the Secrets User role on `<api-vault>` only. Report any other failure, such as a missing secret, as it is.

## 3. README section

Add a section named "Local dev secrets (Azure Key Vault)" to the README at the path from the inputs. Write every file reference and URL as a markdown link. It states:

1. The vault name of each app and the vault URL form.
2. The roles from section 1.
3. The sign-in step: `az login --tenant <tenant-id>`.
4. The secret name rules: `--` for `:` in .NET, and `-` to `_` in upper case for Next.js.
5. The override rules: user secrets win in .NET, `.env.local` wins in Next.js.
6. The full list of secret names for each vault. Names only, never values.
7. The Functions limit, if the project has a Functions app.

Write the prose in the language style of the target project. Do not hard-wrap the lines of a markdown file.

## 4. Guide files

If the project has an `AGENTS.md` or `CLAUDE.md`, add one short bullet under the local run section. The bullet names the vault of each app and points to the README section.
