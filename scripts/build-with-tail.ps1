# Build and show last N lines (avoids killing build with Select-Object -First)
# Use this instead of: npm run build 2>&1 | Select-Object -First 100
#
# Why: Piping to Select-Object -First N KILLS the build - the pipe closes
#      after N lines and npm gets a broken pipe, causing "cancelled" errors.

param(
    [int]$TailLines = 100,
    [switch]$ShowAll = $false
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogFile = Join-Path $ProjectRoot "build.log"

Set-Location $ProjectRoot

Write-Host "Building (full output to $LogFile)..." -ForegroundColor Cyan
Write-Host "Do NOT pipe this command to Select-Object -First N - it kills the build!" -ForegroundColor Yellow
Write-Host ""

# Run build - capture to file (no pipe that could kill it)
# Use cmd.exe for reliable redirect; do NOT pipe to Select-Object
cmd /c "npm run build:raw > `"$LogFile`" 2>&1"
$ExitCode = $LASTEXITCODE

Write-Host ""
if ($ShowAll) {
    Write-Host "=== Full build output ===" -ForegroundColor Cyan
    Get-Content $LogFile
} else {
    Write-Host "=== Last $TailLines lines (full log: $LogFile) ===" -ForegroundColor Cyan
    Get-Content $LogFile -Tail $TailLines
}

Write-Host ""
if ($ExitCode -eq 0) {
    Write-Host "Build completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Build FAILED (exit code $ExitCode). Check $LogFile for full output." -ForegroundColor Red
    exit $ExitCode
}
