<#
.SYNOPSIS
Uninstalls every project-scoped Claude Code plugin listed by `claude plugin list --json`.

.DESCRIPTION
Each project-scoped install is removed by running `claude plugin uninstall <id> --scope project`
from that install's projectPath, because the uninstall acts on the project in the current
directory. User and synced installs are not touched. Use -WhatIf for a dry run.

The CLI matches projectPath against the current directory with exact casing, and Windows reports
the drive letter in upper case. Records saved with a lower-case drive letter (c:\...) never match,
so the script first upper-cases the drive letter of every projectPath in installed_plugins.json.
A backup is saved next to that file as installed_plugins.json.bak.
#>
[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'

$records = Join-Path $HOME '.claude\plugins\installed_plugins.json'

# Fix the drive-letter casing in Claude's state file so the CLI can match each projectPath.
if ($PSCmdlet.ShouldProcess($records, 'Upper-case drive letters in projectPath')) {
    # Save a copy so the edit below can be undone by restoring this file.
    Copy-Item -LiteralPath $records "$records.bak" -Force

    # Edit the raw text, not parsed JSON, so the file keeps its original formatting.
    # Read and write UTF-8 explicitly, because Windows PowerShell 5.1 defaults to the ANSI code page.
    $text = [System.IO.File]::ReadAllText($records, [System.Text.Encoding]::UTF8)

    # Match each "projectPath": "x:... value. Group 1 is the key and opening quote, group 2 is the
    # drive letter, group 3 is the colon. Only a lower-case letter matches, so the edit is idempotent.
    $text = [regex]::Replace($text, '("projectPath"\s*:\s*")([a-z])(:)', {
            param($m) $m.Groups[1].Value + $m.Groups[2].Value.ToUpperInvariant() + $m.Groups[3].Value
        })
    [System.IO.File]::WriteAllText($records, $text, [System.Text.UTF8Encoding]::new($false))
}

$failed = 0
$removed = 0

# After the drive letters match, a plugin that was listed twice for one project is one record per
# pass, so repeat until a pass removes nothing.
do {
    $installs = claude plugin list --json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'claude plugin list --json failed' }

    $targets = $installs |
        Where-Object { $_.scope -eq 'project' } |
        Group-Object { "$($_.id)|$($_.projectPath.ToLowerInvariant())" } |
        ForEach-Object { $_.Group[0] }

    $passRemoved = 0

    foreach ($t in $targets) {
        if (-not (Test-Path -LiteralPath $t.projectPath)) {
            Write-Warning "Skipping $($t.id): $($t.projectPath) does not exist"
            continue
        }

        if (-not $PSCmdlet.ShouldProcess($t.projectPath, "Uninstall $($t.id)")) { continue }

        Push-Location -LiteralPath $t.projectPath
        try {
            claude plugin uninstall $t.id --scope project
            if ($LASTEXITCODE -eq 0) { $passRemoved++ } else { $failed++ }
        }
        finally {
            Pop-Location
        }
    }

    $removed += $passRemoved
} while ($passRemoved -gt 0)

Write-Host "Removed: $removed  Failed: $failed"
if ($failed -gt 0) { exit 1 }
