# Safe Build Script for DZDoc
# This script ensures builds complete without being killed by output limiters

param(
    [string]$LogFile = "build.log",
    [switch]$Quiet = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Starting safe build process..." -ForegroundColor Cyan
Write-Host ""

# Change to project directory (parent of scripts folder)
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

# Build command - NEVER pipe to Select-Object or head
# Use build:raw to avoid recursion (build now invokes this script)
if ($Quiet) {
    # Redirect to file only (no live output)
    Write-Host "Building (output to $LogFile)..." -ForegroundColor Yellow
    npm run build:raw > $LogFile 2>&1
    $ExitCode = $LASTEXITCODE
} else {
    # Use Tee-Object to capture AND display (build completes - never pipe to Select-Object!)
    Write-Host "Building (live output + log file)..." -ForegroundColor Yellow
    npm run build:raw 2>&1 | Tee-Object -FilePath $LogFile
    $ExitCode = $LASTEXITCODE
}

Write-Host ""

if ($ExitCode -eq 0) {
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host "Full output saved to: $LogFile" -ForegroundColor Gray
} else {
    Write-Host "Build failed with exit code: $ExitCode" -ForegroundColor Red
    Write-Host "Check $LogFile for details" -ForegroundColor Yellow
    exit $ExitCode
}
