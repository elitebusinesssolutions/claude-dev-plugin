param(
    [string]$SettingsPath = ".claude/settings.json",
    [string]$Scope = "project",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# The claude CLI writes UTF-8 status symbols (checkmarks, etc.); without this the
# console's default OEM codepage mangles them into mojibake.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Executes a claude CLI command, streaming its output live while also capturing
# it so callers can surface the exact error text on failure.
function Invoke-Claude {
    param(
        [string[]]$CommandArgs,
        [switch]$AllowFailure
    )

    $display = "claude " + ($CommandArgs -join " ")
    Write-Host "`n> $display" -ForegroundColor Cyan

    if ($DryRun) {
        return [pscustomobject]@{ Success = $true; Output = "" }
    }

    $output = & claude @CommandArgs 2>&1 | ForEach-Object {
        Write-Host $_
        $_
    } | Out-String
    $exitCode = $LASTEXITCODE
    $success = ($exitCode -eq 0)

    if (-not $success -and -not $AllowFailure) {
        throw "Command failed (exit ${exitCode}): $display`n$output"
    }

    return [pscustomobject]@{ Success = $success; Output = $output }
}

# Bootstrap: install Claude CLI if missing so the rest of the script can run.
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "Claude CLI not found. Installing latest..." -ForegroundColor Yellow

    if ($DryRun) {
        Write-Host "[DryRun] Would run: & ([scriptblock]::Create((irm https://claude.ai/install.ps1))) latest" -ForegroundColor DarkYellow
    }
    else {
        $confirm = Read-Host "This will download and execute a remote script from https://claude.ai/install.ps1. Continue? [y/N]"
        if ($confirm -notmatch '^[Yy]') {
            throw "Installation aborted by user."
        }
        & ([scriptblock]::Create((Invoke-RestMethod https://claude.ai/install.ps1))) latest
    }

    if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
        throw "Claude CLI installation completed but 'claude' is still not available in PATH. Open a new terminal and rerun this script."
    }

    Write-Host "Succeeded: installed Claude CLI" -ForegroundColor Green
}

# Resolve a relative SettingsPath against the script's own directory so invocation
# is location-independent regardless of the caller's working directory.
if (-not [System.IO.Path]::IsPathRooted($SettingsPath)) {
    $SettingsPath = Join-Path $PSScriptRoot $SettingsPath
}

# Always bring the CLI to the latest available version before plugin operations.
Write-Host "Ensuring Claude CLI is up to date..." -ForegroundColor Yellow
[void](Invoke-Claude -CommandArgs @("update"))
Write-Host "Succeeded: Claude CLI is up to date" -ForegroundColor Green

if (-not (Test-Path -LiteralPath $SettingsPath)) {
    throw "Settings file not found: $SettingsPath"
}

# Load project plugin settings (enabledPlugins + extraKnownMarketplaces).
$settingsRaw = Get-Content -LiteralPath $SettingsPath -Raw
$settings = $settingsRaw | ConvertFrom-Json -Depth 100

Write-Host "Reading config from: $SettingsPath" -ForegroundColor Yellow

$marketplaces = @()
if ($null -ne $settings.extraKnownMarketplaces) {
    $marketplaces = $settings.extraKnownMarketplaces.PSObject.Properties
}

foreach ($market in $marketplaces) {
    $marketName = $market.Name
    $marketValue = $market.Value
    $sourceType = $marketValue.source.source
    $sourceArg = $null

    # Normalize supported marketplace source shapes into the single <source> arg.
    if ($sourceType -eq "github" -and -not [string]::IsNullOrWhiteSpace($marketValue.source.repo)) {
        $sourceArg = "https://github.com/$($marketValue.source.repo)"
    }
    elseif (($sourceType -eq "url" -or $sourceType -eq "git") -and -not [string]::IsNullOrWhiteSpace($marketValue.source.url)) {
        $sourceArg = $marketValue.source.url
    }
    elseif (($sourceType -eq "path" -or $sourceType -eq "local") -and -not [string]::IsNullOrWhiteSpace($marketValue.source.path)) {
        $sourceArg = $marketValue.source.path
    }

    if ([string]::IsNullOrWhiteSpace($sourceArg)) {
        Write-Warning "Skipping marketplace '$marketName' (unsupported source config)."
        continue
    }

    # `update` only succeeds for an already-registered marketplace, so try it first
    # and fall back to `add` (a no-op if already registered) for a new one.
    $verb = "refresh"
    $result = Invoke-Claude -CommandArgs @("plugin", "marketplace", "update", $marketName) -AllowFailure
    if (-not $result.Success) {
        $verb = "register"
        $result = Invoke-Claude -CommandArgs @("plugin", "marketplace", "add", $sourceArg, "--scope", $Scope) -AllowFailure
    }

    if ($result.Success) {
        Write-Host "Succeeded: $verb marketplace '$marketName'" -ForegroundColor Green
    }
    else {
        Write-Warning "Failed to $verb marketplace '${marketName}':`n$($result.Output)"
    }
}

$enabledPlugins = @()
if ($null -ne $settings.enabledPlugins) {
    # Only install plugins explicitly enabled in settings.
    $enabledPlugins = $settings.enabledPlugins.PSObject.Properties | Where-Object { $_.Value -eq $true }
}

foreach ($plugin in $enabledPlugins) {
    $pluginId = $plugin.Name

    # `update` only succeeds for an already-installed plugin (at this scope), so try
    # it first and fall back to `install` (a no-op if already installed) for a new one.
    $verb = "update"
    $result = Invoke-Claude -CommandArgs @("plugin", "update", $pluginId, "--scope", $Scope) -AllowFailure
    if (-not $result.Success) {
        $verb = "install"
        $result = Invoke-Claude -CommandArgs @("plugin", "install", $pluginId, "--scope", $Scope) -AllowFailure
    }

    if ($result.Success) {
        Write-Host "Succeeded: $verb plugin '$pluginId'" -ForegroundColor Green
    }
    else {
        Write-Warning "Failed to $verb plugin '${pluginId}':`n$($result.Output)"
    }
}

Write-Host "`nCompleted syncing marketplaces and plugins from $SettingsPath" -ForegroundColor Green
