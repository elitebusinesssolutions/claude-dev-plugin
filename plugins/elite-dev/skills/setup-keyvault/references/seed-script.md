# Seed script

Apply this file only when the developer asked for a seed script in step 2.

The script creates each vault if it does not exist. Then it copies the existing local secrets of each app into that app's vault. The developer runs it. The skill never runs it, because the script reads secret values.

## 1. Rules

- One standalone file at the path from the inputs, for example `scripts/seed-keyvault-secrets.ps1`. Do not put it in `setup.ps1`.
- No hardcoded secret name. Every key found in a local source is pushed. A new local secret needs no script change.
- Never print a secret value. Never write a value to a file.
- Safe to run again. A vault that exists is not changed. A secret that is set again gets a new version.
- Every parameter default comes from the inputs in step 2: tenant ID, resource group, vault names, source paths. Each source path is relative to `$PSScriptRoot`.
- Write the script with the helpers below. Reuse a helper that `setup.ps1` already has for the Azure CLI check and sign-in, under any name, only if the seed script can stay standalone. Otherwise keep the copies below.

## 2. Local sources and secret names

| Source | App | Keys read | Vault secret name |
| --- | --- | --- | --- |
| `dotnet user-secrets list --json` | .NET Api, .NET Functions | every key | `:` becomes `--` |
| `local.settings.json`, `Values` object | .NET Functions | every key, except the skip list below | `:` and `__` become `--` |
| env file, for example `.env.local` | any JS/TS app: Next.js, Vue, React, Vite, plain TypeScript | every `KEY=value` line | `_` becomes `-` |

These names match the rules in section 5 of [SKILL.md](../SKILL.md). The JS/TS name rule is the same for every framework. Only the loading code in [nextjs.md](nextjs.md) is Next.js only.

Skip list for `local.settings.json`: `FUNCTIONS_WORKER_RUNTIME`, `AzureWebJobsStorage`, `KeyVaultUrl`. These keys configure the local host and do not belong in a vault.

If the solution has an Aspire AppHost, skip every .NET key that starts with `ConnectionStrings:`. The AppHost sets these keys, and a vault key would win over them (section 6 of [SKILL.md](../SKILL.md)).

## 3. Template

Build the script from these parts, in this order. Repeat the marked parts once for each app. Replace each `<...>` from the inputs.

### Parameters and guards

```powershell
# Creates each Key Vault if it is missing, then seeds it from the developer's local secrets.
# Creating a vault needs a Contributor-level role on the resource group. Setting a secret needs
# the Key Vault Secrets Officer role on that vault. Key Vault Secrets User (read-only) gives a 403.
param(
    [string]$TenantId = "<tenant-id>",
    [string]$ResourceGroupName = "<resource-group>",
    # An empty value means: use the location of the resource group.
    [string]$Location = "",
    # Repeat for each app.
    [string]$<App>VaultName = "<vault-name>",
    # .NET apps: the project folder. JS/TS apps: the env file. Repeat for each app.
    [string]$<App>ProjectPath = (Join-Path $PSScriptRoot "<path-to-project>"),
    [string]$<App>EnvFile = (Join-Path $PSScriptRoot "<path-to-env-file>")
)

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI (az) not found. Install it: https://learn.microsoft.com/cli/azure/install-azure-cli"
    exit 1
}

# Sign in to the right tenant. Subscription discovery stays on, because creating a vault needs a subscription.
$currentTenant = az account show --query tenantId -o tsv 2>$null
if ($currentTenant -ne $TenantId) {
    Write-Output "Signing in to tenant $TenantId."
    az login --tenant $TenantId --output none
    if ($LASTEXITCODE -ne 0) {
        Write-Error "az login failed. Retry it manually, then run this script again."
        exit 1
    }
}

# A wrong tenant or subscription fails here, not at the first vault call.
az group show --name $ResourceGroupName --output none 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Cannot see resource group $ResourceGroupName. Run az account set --subscription <subscription>, then retry."
    exit 1
}

if ([string]::IsNullOrWhiteSpace($Location)) {
    $Location = az group show --name $ResourceGroupName --query location -o tsv
}
```

### Vault helpers

```powershell
# Creates a vault only if it does not exist.
function Ensure-KeyVault([string]$VaultName) {
    az keyvault show --name $VaultName --resource-group $ResourceGroupName --output none 2>$null
    if ($LASTEXITCODE -eq 0) {
        return
    }
    Write-Output "Vault $VaultName not found. Creating it in $ResourceGroupName ($Location)."
    az keyvault create --name $VaultName --resource-group $ResourceGroupName --location $Location `
        --sku Standard --enable-rbac-authorization true --output none
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create vault $VaultName. Confirm you have a Contributor-level role on $ResourceGroupName."
        exit 1
    }
}

function Set-KeyVaultSecret([string]$VaultName, [string]$SecretName, [string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-Warning "Skipping $SecretName in $VaultName - no local value found"
        return
    }
    az keyvault secret set --vault-name $VaultName --name $SecretName --value $Value --output none
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to set $SecretName in $VaultName. Confirm you have the Key Vault Secrets Officer role on that vault."
        exit 1
    }
}

# Repeat for each vault.
Ensure-KeyVault -VaultName $<App>VaultName
```

### Source helpers

Include only the helpers that the project needs.

```powershell
# .NET Api or Functions: every user secret. The vault uses '--' where user secrets use ':'.
function Push-UserSecrets([string]$VaultName, [string]$ProjectPath) {
    $lines = dotnet user-secrets list --project $ProjectPath --json |
        Where-Object { $_ -notmatch '^//(BEGIN|END)' }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "dotnet user-secrets list failed for $ProjectPath. Confirm the project has a UserSecretsId and the path is correct."
        exit 1
    }
    $secrets = ($lines -join "`n") | ConvertFrom-Json
    foreach ($property in $secrets.PSObject.Properties) {
        # AppHost solutions only: the AppHost sets ConnectionStrings:*, so the vault must not hold it.
        if ($property.Name -like 'ConnectionStrings:*') { continue }
        Set-KeyVaultSecret -VaultName $VaultName -SecretName $property.Name.Replace(':', '--') -Value $property.Value
    }
}

# Functions only: the Values object of local.settings.json, without the local host keys.
function Push-FunctionsSettings([string]$VaultName, [string]$ProjectPath) {
    $file = Join-Path $ProjectPath "local.settings.json"
    if (-not (Test-Path $file)) {
        Write-Error "$file not found. Create it from the Functions README, then run this script again."
        exit 1
    }
    $skip = @('FUNCTIONS_WORKER_RUNTIME', 'AzureWebJobsStorage', 'KeyVaultUrl')
    $values = (Get-Content $file -Raw | ConvertFrom-Json).Values
    foreach ($property in $values.PSObject.Properties) {
        if ($skip -contains $property.Name) { continue }
        $secretName = $property.Name.Replace(':', '--').Replace('__', '--')
        Set-KeyVaultSecret -VaultName $VaultName -SecretName $secretName -Value $property.Value
    }
}

# Any JS/TS app: every KEY=value line of the env file. One dash replaces each underscore.
function Get-EnvValues([string]$FilePath) {
    if (-not (Test-Path $FilePath)) {
        Write-Error "$FilePath not found. Copy it from .env.example first, then run this script again."
        exit 1
    }
    $values = @{}
    Get-Content $FilePath |
        Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } |
        ForEach-Object {
            $parts = $_ -split '=', 2
            $value = $parts[1]
            if ($value -match '^["'']' -and $value -notmatch '^(["''])(.*)\1$') {
                Write-Error "$($parts[0]) in $FilePath opens a quote with no closing quote on the same line. Put the value on one line."
                exit 1
            }
            # Strips one matching pair of quotes, as the env loaders of Next.js and Vite do.
            $values[$parts[0]] = $value -replace '^(["''])(.*)\1$', '$2'
        }
    return $values
}

function Push-EnvFile([string]$VaultName, [string]$FilePath) {
    $values = Get-EnvValues $FilePath
    foreach ($name in $values.Keys) {
        Set-KeyVaultSecret -VaultName $VaultName -SecretName $name.Replace('_', '-') -Value $values[$name]
    }
}
```

### Calls and closing line

```powershell
# One call for each app.
Push-UserSecrets -VaultName $<App>VaultName -ProjectPath $<App>ProjectPath
Push-FunctionsSettings -VaultName $<FunctionsApp>VaultName -ProjectPath $<FunctionsApp>ProjectPath
Push-EnvFile -VaultName $<App>VaultName -FilePath $<App>EnvFile

Write-Output "Done. Verify with: az keyvault secret list --vault-name <vault-name> --query '[].name'"
```

## 4. Limits to document in the README

- Env file values that span several lines are not supported.
- A key with an empty value is skipped with a warning.
- The script needs the roles from section 1 of [setup-script.md](setup-script.md), plus a Contributor-level role on the resource group when a vault does not exist yet.
