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

The `setup-script` skill owns `setup.ps1`: its skeleton, its helpers, and its rules. This skill adds only the Key Vault steps.

If the repo has no `setup.ps1` (a script that prepares a developer machine), ask the developer whether to create one. If yes, follow the `setup-script` skill (`/elite-dev:setup-script`) to create it, and put its steps in this skill's plan. If no, add the Key Vault steps to the manual steps you report and skip the rest of this section.

Add these parts to `setup.ps1`. Reuse a part that the script already has, under any name.

1. The Azure CLI install step and the Azure sign-in step from the `setup-script` skill. The sign-in step compares the current tenant with the `$azureTenantId` parameter. Set the parameter default to the tenant ID from the inputs.
2. A variable for each vault name, after `$repoRoot`.
3. Functions only: a function that copies each trigger secret from the vault of the Functions app into user secrets of the Functions project. Call it at the end of the main `try` block. Use this template, once for each trigger key:

```powershell
# The Functions host reads user secrets, but it cannot read Key Vault. See the Functions README.
function Set-FunctionsTriggerSecret($key) {
    $existing = dotnet user-secrets list --project $functionsProject
    if ($existing | Select-String -Pattern "^$([regex]::Escape($key))\s*=" -Quiet) {
        Write-Host "[skipped]   Functions user secret $key is already set."
        $skipped.Add("Functions user secret $key")
        return
    }

    $secretName = $key -replace ":", "--"
    Write-Host "[setting]   Functions user secret $key from $functionsVaultName"
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $errorFile = New-TemporaryFile
    try {
        # stdout only: stderr goes to a file, so a warning never ends up in the secret value.
        $value = az keyvault secret show --vault-name $functionsVaultName --name $secretName --query value -o tsv 2>$errorFile
        $exitCode = $LASTEXITCODE
        $errorText = Get-Content $errorFile -Raw
    }
    finally {
        $ErrorActionPreference = $previous
        Remove-Item $errorFile -ErrorAction SilentlyContinue
    }

    if ($exitCode -ne 0) {
        Write-Host "Could not read $secretName from ${functionsVaultName}: $errorText" -ForegroundColor Yellow
        if ($errorText -match "Forbidden|AuthorizationFailed") {
            $manualSteps.Add("Ask the vault owner for the Key Vault Secrets User role on $functionsVaultName, then run setup.ps1 again.")
            return
        }

        throw "Reading $secretName from $functionsVaultName failed."
    }

    Invoke-Checked { dotnet user-secrets set $key $value --project $functionsProject | Out-Null } "dotnet user-secrets set"
    $installed.Add("Functions user secret $key")
}
```

Set `$functionsProject` to the path of the Functions project, relative to `$repoRoot`. Never print the secret value.

## 3. README section

Add a section named "Local dev secrets (Azure Key Vault)" to the README at the path from the inputs. Write every file reference and URL as a markdown link. It states:

1. The vault name of each app and the vault URL form.
2. The roles from section 1.
3. The sign-in step: `az login --tenant <tenant-id>`.
4. The secret name rules: `--` for `:` in .NET, and `-` to `_` in upper case for Next.js.
5. The override rules: user secrets win in .NET, `.env.local` wins in Next.js. In .NET the vault also wins over environment variables, so a vault key must not repeat a value that the AppHost sets.
6. The full list of secret names for each vault. Names only, never values.
7. The Functions limit, if the project has a Functions app.

Write the prose in the language style of the target project. Do not hard-wrap the lines of a markdown file.

## 4. Guide files

If the project has an `AGENTS.md` or `CLAUDE.md`, add one short bullet under the local run section. The bullet names the vault of each app and points to the README section.
