# Script skeleton

Copy this skeleton for a new `setup.ps1`. Replace `<...>` placeholders. Put the step functions from [steps.md](steps.md) after the helpers, and their calls in the main `try` block.

Include the elevation block only when the script has the Node step. `nvm use` and `corepack enable` write to protected folders. Without the Node step, delete the elevation block, its comment, and `Test-IsElevated`. Keep `Exit-Setup` and the `$Relaunched` parameter either way, because `Exit-Setup` reads `$Relaunched`.

```powershell
<#
.SYNOPSIS
Sets up a developer machine for this repo.

.DESCRIPTION
<One sentence per group of steps, for example: Installs the required tools with winget, signs in to
Azure and GitHub, and restores dependencies.> Safe to run again: it skips every tool and step that is
already done. In a terminal that is not elevated, it opens an elevated window through a UAC prompt
and runs there. Run it from a local administrator account: the elevated window runs as the account
that approves the prompt, so per-user setup lands in that account's profile.

.EXAMPLE
./setup.ps1
#>

param(
    [switch]$Relaunched
)

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

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

# <step functions from steps.md>

try {
    # <step calls, in the order of the detection table in steps.md>
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
```
