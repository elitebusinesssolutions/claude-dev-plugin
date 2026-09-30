# Prepares a developer machine for this repo. Safe to run again.
$installed = @()
$skipped = @()
$manual = @()

if (Get-Command dotnet -ErrorAction SilentlyContinue) {
    $skipped += ".NET SDK"
} else {
    $manual += "Install the .NET 9 SDK"
}

Write-Host "Installed: $($installed -join ', ')"
Write-Host "Skipped: $($skipped -join ', ')"
Write-Host "Manual steps: $($manual -join ', ')"
