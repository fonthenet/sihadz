# Build Guard - Prevents dangerous build commands
# This script intercepts and fixes dangerous build command patterns

param(
    [string[]]$Command
)

# Dangerous patterns that kill builds
$DangerousPatterns = @(
    'Select-Object -First',
    'Select-Object -Head',
    '\| head -',
    '\| head$',
    '\.First\(',
    '\.Head\('
)

$CommandString = $Command -join ' '

# Check for dangerous patterns
foreach ($pattern in $DangerousPatterns) {
    if ($CommandString -match $pattern) {
        Write-Host "⚠️  WARNING: Dangerous build command detected!" -ForegroundColor Red
        Write-Host "   Pattern: $pattern" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "❌ This command will KILL your build and cause data loss!" -ForegroundColor Red
        Write-Host ""
        Write-Host "✅ Safe alternatives:" -ForegroundColor Green
        Write-Host "   npm run build:safe          (live output + log file)" -ForegroundColor Cyan
        Write-Host "   npm run build:quiet         (log file only)" -ForegroundColor Cyan
        Write-Host "   npm run build               (normal build)" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📖 See .cursor/rules/build-commands.mdc for details" -ForegroundColor Gray
        exit 1
    }
}

# If safe, proceed
& $Command[0] $Command[1..($Command.Length-1)]
