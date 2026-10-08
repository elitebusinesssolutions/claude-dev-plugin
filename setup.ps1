<#
.SYNOPSIS
Sets up a developer machine for this repo.

.DESCRIPTION
Installs Node through nvm, the GitHub CLI, and the Claude CLI with winget or their installers, signs in
to GitHub, installs the Claude plugins and the ASD-STE100 skill, generates the elite-dev mod's
TypeScript types with one short Claude session, and restores the npm packages. Safe to
run again: it skips every tool and step that is already done. In a terminal that is not elevated, it
opens an elevated window through a UAC prompt and runs there. Run it from a local administrator
account: the elevated window runs as the account that approves the prompt, so per-user setup lands in
that account's profile.

.EXAMPLE
./setup.ps1
#>

param(
    [switch]$Relaunched
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

# Node 20 is the lowest major that the root package.json engines.node allows.
$defaultNodeMajor = 20
$nodeMajors = 20
$packageManager = "npm"

$installed = [System.Collections.Generic.List[string]]::new()
$skipped = [System.Collections.Generic.List[string]]::new()
$manualSteps = [System.Collections.Generic.List[string]]::new()

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

# Runs a native command with its output hidden. Returns true when the exit code is 0.
function Test-NativeSuccess([scriptblock]$command) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & $command *> $null
        return $LASTEXITCODE -eq 0
    }
    finally {
        $ErrorActionPreference = $previous
    }
}

function Invoke-Checked([scriptblock]$command, $description) {
    & $command
    if ($LASTEXITCODE -ne 0) {
        throw "$description failed with exit code $LASTEXITCODE."
    }
}

function Test-IsElevated {
    $principal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# A relaunched window closes when the script ends, so it waits for Enter first.
function Exit-Setup($code) {
    if ($Relaunched) {
        Read-Host "Press Enter to close this window" | Out-Null
    }

    exit $code
}

# nvm use and corepack write to protected folders, so the whole script runs elevated.
if (-not (Test-IsElevated)) {
    Write-Host "Setup needs an elevated terminal. Approve the prompt to continue in a new window."
    $shell = (Get-Process -Id $PID).Path
    $shellArguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Relaunched"
    try {
        # -Wait would also wait for child processes such as .NET build servers, which stay running.
        $process = Start-Process $shell -ArgumentList $shellArguments -WorkingDirectory $repoRoot -Verb RunAs -PassThru
        $process.WaitForExit()
    }
    catch {
        Write-Host "Setup stopped: the elevation prompt was declined." -ForegroundColor Red
        exit 1
    }

    exit $process.ExitCode
}

# Installers change the machine and user environment, but not this session's copy.
function Update-SessionEnvironment {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"

    foreach ($name in "NVM_HOME", "NVM_SYMLINK") {
        $value = [Environment]::GetEnvironmentVariable($name, "User")
        if (-not $value) { $value = [Environment]::GetEnvironmentVariable($name, "Machine") }
        if ($value) { Set-Item "env:$name" $value }
    }
}

# Stops the script when a command is still missing, because a new terminal is then needed.
function Assert-Command($name) {
    if (-not (Test-Command $name)) {
        throw "'$name' is not available yet. Open a new terminal and run setup.ps1 again."
    }
}

function Install-WithWinget($label, $wingetId, $command) {
    if (Test-Command $command) {
        Write-Host "[skipped]   $label is already installed."
        $skipped.Add($label)
        return
    }

    Write-Host "[installing] $label"
    Invoke-Checked {
        winget install --id $wingetId --exact --silent --accept-source-agreements --accept-package-agreements
    } "winget install of $label"
    Update-SessionEnvironment
    Assert-Command $command
    $installed.Add($label)
}

function Assert-SignedIn($label, [scriptblock]$check, [scriptblock]$login) {
    if (Test-NativeSuccess $check) {
        Write-Host "[skipped]   Already signed in to $label."
        $skipped.Add("$label sign-in")
        return
    }

    Write-Host "[sign-in]   $label"
    Invoke-Checked $login "$label sign-in"
    $installed.Add("$label sign-in")
}

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

function Install-ClaudeCli {
    if (Test-Command claude) {
        Write-Host "[skipped]   Claude CLI is already installed."
        $skipped.Add("Claude CLI")
        return
    }

    $confirm = Read-Host "This will download and execute a remote script from https://claude.ai/install.ps1. Continue? [y/N]"
    if ($confirm -notmatch '^[Yy]') {
        $manualSteps.Add("Install the Claude CLI: irm https://claude.ai/install.ps1 | iex")
        return
    }

    Write-Host "[installing] Claude CLI"
    $installer = Join-Path ([IO.Path]::GetTempPath()) "claude-install.ps1"
    Invoke-RestMethod https://claude.ai/install.ps1 -OutFile $installer
    try {
        Invoke-Checked { & (Get-Process -Id $PID).Path -NoProfile -ExecutionPolicy Bypass -File $installer } "Claude CLI install"
    }
    finally { Remove-Item $installer -ErrorAction SilentlyContinue }
    Update-SessionEnvironment
    Assert-Command claude
    $installed.Add("Claude CLI")
}

function Install-ClaudePlugins {
    $marketplaces = [ordered]@{
        "claude-plugins-official" = "anthropics/claude-plugins-official"
        "elitebusinesssolutions"  = "elitebusinesssolutions/claude-dev-plugin"
        "ponytail"                = "DietrichGebert/ponytail"
    }
    $plugins = @(
        "auth0@claude-plugins-official"
        "claude-md-management@claude-plugins-official"
        "code-review@claude-plugins-official"
        "csharp-lsp@claude-plugins-official"
        "elite-dev@elitebusinesssolutions"
        "elite-ts@elitebusinesssolutions"
        "github@claude-plugins-official"
        "ponytail@ponytail"
        "skill-creator@claude-plugins-official"
        "typescript-lsp@claude-plugins-official"
    )

    if (-not (Test-Command claude)) {
        $manualSteps.Add("Install the Claude CLI, then run setup.ps1 again to install the Claude plugins.")
        return
    }

    $marketplaceJson = claude plugin marketplace list --json
    if ($LASTEXITCODE -ne 0) { throw "claude plugin marketplace list failed with exit code $LASTEXITCODE." }
    $knownMarketplaces = ($marketplaceJson | ConvertFrom-Json).name
    foreach ($name in $marketplaces.Keys) {
        if ($knownMarketplaces -contains $name) {
            # The plugin updates below read the catalog, so the catalog is refreshed first.
            Write-Host "[updating]  Claude marketplace $name"
            if (Test-NativeSuccess { claude plugin marketplace update $name }) {
                $installed.Add("Claude marketplace $name (update checked)")
            }
            else {
                $manualSteps.Add("Update the Claude marketplace: claude plugin marketplace update $name")
            }

            continue
        }

        Write-Host "[installing] Claude marketplace $name"
        Invoke-Checked { claude plugin marketplace add $marketplaces[$name] } "claude plugin marketplace add of $name"
        $installed.Add("Claude marketplace $name")
    }

    $pluginJson = claude plugin list --json
    if ($LASTEXITCODE -ne 0) { throw "claude plugin list failed with exit code $LASTEXITCODE." }
    $installedPlugins = @(($pluginJson | ConvertFrom-Json) | Where-Object { $_.scope -eq "user" } | ForEach-Object { $_.id })
    $pluginUpdated = $false
    foreach ($plugin in $plugins) {
        if ($installedPlugins -contains $plugin) {
            Write-Host "[updating]  Claude plugin $plugin"
            if (Test-NativeSuccess { claude plugin update $plugin --scope user }) {
                $installed.Add("Claude plugin $plugin (update checked)")
                $pluginUpdated = $true
            }
            else {
                $manualSteps.Add("Update the Claude plugin: claude plugin update $plugin --scope user")
            }

            continue
        }

        Write-Host "[installing] Claude plugin $plugin"
        Invoke-Checked { claude plugin install $plugin --scope user } "claude plugin install of $plugin"
        $installed.Add("Claude plugin $plugin")
    }

    if ($pluginUpdated) {
        $manualSteps.Add("Restart Claude Code to apply any plugin updates.")
    }
}

function Install-Asdste100Skill {
    if (Test-Path (Join-Path $HOME ".claude/skills/asd-ste100/SKILL.md")) {
        Write-Host "[skipped]   ASD-STE100 skill is already installed."
        $skipped.Add("ASD-STE100 skill")
        return
    }

    if (-not (Test-Command npx)) {
        $manualSteps.Add("Install the ASD-STE100 skill: npx skills add danyuchn/asd-ste100-skill -g -a claude-code -y")
        return
    }

    $confirm = Read-Host "This will download and run the npm package 'skills' to install danyuchn/asd-ste100-skill. Continue? [y/N]"
    if ($confirm -notmatch '^[Yy]') {
        $manualSteps.Add("Install the ASD-STE100 skill: npx skills add danyuchn/asd-ste100-skill -g -a claude-code -y")
        return
    }

    Write-Host "[installing] ASD-STE100 skill"
    Invoke-Checked { npx --yes skills add danyuchn/asd-ste100-skill -g -a claude-code -y } "npx skills add of the ASD-STE100 skill"
    $installed.Add("ASD-STE100 skill")
}

# The engine writes the TypeScript types of a mod when a session loads it from its folder, and
# the editor needs them to resolve the mod's "claude-code" imports.
function Initialize-ModTypes {
    $modTypes = Join-Path $repoRoot "plugins/elite-dev/.claude-plugin/types/claude-code/index.d.ts"
    $manualStep = "Run claude --plugin-dir plugins/elite-dev once, then restart the TypeScript server in the editor, to generate the elite-dev mod's TypeScript types."

    if (Test-Path $modTypes) {
        Write-Host "[skipped]   The elite-dev mod's TypeScript types already exist."
        $skipped.Add("elite-dev mod types")
        return
    }

    if (-not (Test-Command claude)) {
        $manualSteps.Add($manualStep)
        return
    }

    Write-Host "[installing] elite-dev mod types"
    Push-Location $repoRoot
    try { Test-NativeSuccess { claude --plugin-dir plugins/elite-dev -p "Reply with the word ok." } | Out-Null }
    finally { Pop-Location }

    if (Test-Path $modTypes) {
        $installed.Add("elite-dev mod types")
    }
    else {
        $manualSteps.Add($manualStep)
    }
}

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

try {
    Install-Node
    Install-WithWinget "GitHub CLI" "GitHub.cli" "gh"
    Install-ClaudeCli

    Assert-SignedIn "GitHub" { gh auth status } { gh auth login }

    Install-ClaudePlugins
    Install-Asdste100Skill
    Initialize-ModTypes

    Restore-PackageRoot $repoRoot 20
}
catch {
    Write-Host "Setup stopped: $($_.Exception.Message)" -ForegroundColor Red
    Exit-Setup 1
}

Write-Host "`nSummary"
Write-Host "  Done:    $(if ($installed.Count) { $installed -join ', ' } else { 'nothing new' })"
Write-Host "  Skipped: $(if ($skipped.Count) { $skipped -join ', ' } else { 'nothing' })"
if ($manualSteps.Count) {
    Write-Host "  Manual steps:" -ForegroundColor Yellow
    $manualSteps | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
}

Exit-Setup 0
