# Steps

## Detection table

Add a step when its condition matches. Keep this order in the main `try` block: tools, then sign-ins, then restore, then steps from other skills.

| #   | Step                          | Add when                                                                                                               | Function                                                                                      |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | .NET SDK                      | any `*.csproj` exists                                                                                                  | `Install-DotnetSdk`                                                                           |
| 2   | Aspire CLI                    | a csproj uses `Aspire.AppHost.Sdk` or references `Aspire.Hosting.AppHost`                                              | `Install-AspireCli`                                                                           |
| 3   | Node through nvm              | any `package.json` exists                                                                                              | `Install-Node`                                                                                |
| 4   | pnpm or yarn through corepack | a `pnpm-lock.yaml` or `yarn.lock` exists                                                                               | `Enable-PackageManager`                                                                       |
| 5   | Azure CLI                     | a csproj references an `Azure.*` package, a `package.json` depends on an `@azure/*` package, or another step runs `az` | `Install-WithWinget "Azure CLI" "Microsoft.AzureCLI" "az"`                                    |
| 6   | Azure Functions Core Tools    | a csproj references `Microsoft.Azure.Functions.Worker`                                                                 | `Install-WithWinget "Azure Functions Core Tools" "Microsoft.Azure.FunctionsCoreTools" "func"` |
| 7   | GitHub CLI                    | always                                                                                                                 | `Install-WithWinget "GitHub CLI" "GitHub.cli" "gh"`                                           |
| 7a  | Extra tools                   | the developer names them in SKILL.md step 2                                                                            | `Install-WithWinget`, or a custom function                                                    |
| 8   | gh-stack (optional)           | the developer asks for it                                                                                              | `Install-GhStack`                                                                             |
| 9   | Azure sign-in                 | step 5 is in the list                                                                                                  | `Assert-AzureSignedIn`                                                                        |
| 10  | GitHub sign-in                | always                                                                                                                 | `Assert-SignedIn "GitHub" { gh auth status } { gh auth login }`                               |
| 11  | JavaScript restore            | once per package root that has a lockfile                                                                              | `Restore-PackageRoot`                                                                         |
| 12  | .NET restore                  | once per `*.sln` or `*.slnx`, or per csproj when the repo has no solution file                                         | `Invoke-Checked { dotnet restore "<path>" } "dotnet restore"`                                 |
| 13  | .NET local tools              | `.config/dotnet-tools.json` exists                                                                                     | `Restore-DotnetTools`                                                                         |
| 14  | Steps from other skills       | another skill, such as setup-keyvault, adds them                                                                       | the other skill's function                                                                    |

Values:

- **.NET SDK major:** the major version of `sdk.version` in `global.json`. Without `global.json`, the highest `net<N>.0` in any `<TargetFramework>` or `<TargetFrameworks>`.
- **Node majors:** for each package root, the major version in `.nvmrc`, then `.node-version`, then the lowest version that `engines.node` allows. Ask the developer when none exists. The default Node major is the one of the root `package.json`, or the one most package roots use.
- **Package manager:** `pnpm-lock.yaml` is pnpm, `yarn.lock` is yarn, `package-lock.json` is npm. The script has one package manager for all package roots. When roots use different ones, stop and ask the developer before you generate the script.

## Step functions

### 1. .NET SDK

```powershell
# dotnet reads global.json from the current folder, so a success here means an SDK satisfies sdk.version and sdk.rollForward.
function Test-DotnetSdk($major) {
    if (-not (Test-Command dotnet)) { return $false }
    if (-not (dotnet --list-sdks | Select-String -Pattern "^$major\.")) { return $false }

    Push-Location $repoRoot
    try { return Test-NativeSuccess { dotnet --version } }
    finally { Pop-Location }
}

function Install-DotnetSdk($major) {
    if (Test-DotnetSdk $major) {
        Write-Host "[skipped]   .NET SDK $major is already installed."
        $skipped.Add(".NET SDK $major")
        return
    }

    Write-Host "[installing] .NET SDK $major"
    Invoke-Checked {
        winget install --id "Microsoft.DotNet.SDK.$major" --exact --silent --accept-source-agreements --accept-package-agreements
    } "winget install of .NET SDK $major"
    Update-SessionEnvironment
    Assert-Command dotnet
    $installed.Add(".NET SDK $major")

    if (-not (Test-DotnetSdk $major)) {
        $manualSteps.Add("Install the .NET SDK version that global.json requires. The installed SDK does not satisfy it.")
    }
}
```

Call: `Install-DotnetSdk <major>`.

### 2. Aspire CLI

The installer is a remote script, so the step asks before it runs it.

```powershell
function Install-AspireCli {
    if (Test-Command aspire) {
        Write-Host "[skipped]   Aspire CLI is already installed."
        $skipped.Add("Aspire CLI")
        return
    }

    $confirm = Read-Host "This will download and execute a remote script from https://aspire.dev/install.ps1. Continue? [y/N]"
    if ($confirm -notmatch '^[Yy]') {
        $manualSteps.Add("Install the Aspire CLI: irm https://aspire.dev/install.ps1 | iex")
        return
    }

    Write-Host "[installing] Aspire CLI"
    Invoke-RestMethod https://aspire.dev/install.ps1 | Invoke-Expression
    Update-SessionEnvironment
    Assert-Command aspire
    $installed.Add("Aspire CLI")
}
```

### 3. Node through nvm

Add these variables after `$repoRoot`. Add a comment that names the package root of each Node major.

```powershell
$defaultNodeMajor = <default major>
$nodeMajors = <each distinct major, comma-separated>
```

With a pnpm or yarn lockfile, also add `$packageManager = "<pnpm or yarn>"` and this line, because corepack otherwise asks before it downloads the package manager:

```powershell
$env:COREPACK_ENABLE_DOWNLOAD_PROMPT = "0"
```

With only npm, add `$packageManager = "npm"`.

```powershell
function Install-Node {
    # A Node that nvm does not manage is left alone, because the nvm installer conflicts with it.
    if ((Test-Command node) -and -not (Test-Command nvm)) {
        Write-Host "[skipped]   Node is already installed at $((Get-Command node).Source), outside nvm. nvm may not take priority if you install it."
        $skipped.Add("Node")
        return
    }

    Install-WithWinget "nvm for Windows" "CoreyButler.NVMforWindows" "nvm"

    $nvmList = nvm list | Out-String
    foreach ($major in $nodeMajors) {
        if ($nvmList -match "\b$major\.\d+\.\d+") {
            Write-Host "[skipped]   Node $major is already installed in nvm."
            $skipped.Add("Node $major")
            continue
        }

        Write-Host "[installing] Node $major"
        Invoke-Checked { nvm install $major } "nvm install $major"
        $installed.Add("Node $major")
    }

    if ((Get-NodeMajor) -eq $defaultNodeMajor) {
        return
    }

    Use-NodeVersion $defaultNodeMajor
}

# Corepack shims live in the active Node folder, so the package manager is enabled again after every switch.
function Use-NodeVersion($major) {
    Assert-Command nvm
    Invoke-Checked { nvm use $major | Out-Host } "nvm use $major"
    Update-SessionEnvironment
    Assert-Command node
    if ($packageManager -ne "npm") {
        # Node 25 and later does not ship corepack.
        if (-not (Test-Command corepack)) {
            Invoke-Checked { npm install --global corepack } "npm install of corepack"
        }

        Invoke-Checked { corepack enable $packageManager } "corepack enable $packageManager"
    }
}

function Get-NodeMajor {
    if (-not (Test-Command node)) { return $null }
    return [int](((node --version) -replace '^v(\d+).*', '$1'))
}
```

### 4. pnpm or yarn through corepack

```powershell
function Enable-PackageManager {
    if (Test-Command $packageManager) {
        Write-Host "[skipped]   $packageManager is already installed."
        $skipped.Add($packageManager)
        return
    }

    if (-not (Test-Command corepack)) {
        return
    }

    Write-Host "[installing] $packageManager through corepack"
    Invoke-Checked { corepack enable $packageManager } "corepack enable $packageManager"
    $installed.Add($packageManager)
}
```

### 8. gh-stack

```powershell
function Install-GhStack {
    $extensions = gh extension list
    if ($extensions | Select-String -Pattern "gh-stack" -Quiet) {
        Write-Host "[skipped]   gh-stack is already installed."
        $skipped.Add("gh-stack")
        return
    }

    Write-Host "[installing] gh-stack"
    Invoke-Checked { gh extension install github/gh-stack } "gh extension install of gh-stack"
    $installed.Add("gh-stack")
}
```

### 9. Azure sign-in

Add the tenant ID to the `param` block. A tenant ID is not a secret.

```powershell
    [string]$azureTenantId = "<tenant-id>"
```

```powershell
function Assert-AzureSignedIn {
    $currentTenant = $null
    if (Test-NativeSuccess { az account show }) {
        $currentTenant = az account show --query tenantId -o tsv
    }

    if ($currentTenant -eq $azureTenantId) {
        Write-Host "[skipped]   Already signed in to Azure tenant $azureTenantId."
        $skipped.Add("Azure sign-in")
        return
    }

    Write-Host "[sign-in]   Azure tenant $azureTenantId"
    Invoke-Checked { az login --tenant $azureTenantId --skip-subscription-discovery } "Azure sign-in"
    $installed.Add("Azure sign-in")
}
```

### 11. JavaScript restore

Call it once per package root, for example `Restore-PackageRoot "$repoRoot/src/client" 22`. After the last call, switch back to the default Node major, so that the apps run on it after the script ends. Use this block only when `$nodeMajors` has more than one major:

```powershell
if ((Test-Command nvm) -and (Get-NodeMajor) -ne $defaultNodeMajor) {
    Use-NodeVersion $defaultNodeMajor
}
```

```powershell
function Restore-PackageRoot($path, $major) {
    if ((Get-NodeMajor) -ne $major) {
        if (-not (Test-Command nvm)) {
            $manualSteps.Add("Node $major is required in $path, but nvm does not manage Node here. Switch Node, then restore the packages there.")
            return
        }

        Use-NodeVersion $major
    }

    Assert-Command $packageManager

    Write-Host "[restoring] $packageManager install in $path on Node $major"
    Push-Location $path
    try {
        switch ($packageManager) {
            "pnpm" { Invoke-Checked { pnpm install --frozen-lockfile } "pnpm install in $path" }
            "yarn" { Invoke-Checked { yarn install --immutable } "yarn install in $path" }
            "npm" { Invoke-Checked { npm ci } "npm ci in $path" }
        }
    }
    finally { Pop-Location }
}
```

For yarn 1 (a `yarn.lock` without `.yarnrc.yml`), use `yarn install --frozen-lockfile` in place of `--immutable`.

### 13. .NET local tools

```powershell
function Restore-DotnetTools {
    Write-Host "[restoring] dotnet tool restore"
    Push-Location $repoRoot
    try { Invoke-Checked { dotnet tool restore } "dotnet tool restore" }
    finally { Pop-Location }
}
```

### 14. Steps from other skills

Another skill adds its function after the step functions above and its call at the end of the main `try` block. The function follows the same rules: it skips work that is done, it uses `Invoke-Checked`, and it adds to `$installed`, `$skipped`, or `$manualSteps`.
