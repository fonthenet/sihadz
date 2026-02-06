# Safe Build Commands - Quick Reference

## ⚠️ STOP USING DANGEROUS COMMANDS

**This kills your build:**
```powershell
npm run build 2>&1 | Select-Object -First 50  # ❌ NEVER USE THIS
```

## ✅ USE THESE INSTEAD

### Option 1: Safe Build Script (RECOMMENDED)
```powershell
npm run build:safe
```
- ✅ Shows live output
- ✅ Saves to `build.log`
- ✅ Build completes successfully
- ✅ No data loss

### Option 2: Normal Build
```powershell
npm run build
```
- ✅ Full output in terminal
- ✅ Build completes successfully

### Option 3: Quiet Build
```powershell
npm run build:quiet
```
- ✅ No terminal output
- ✅ Saves to `build.log`
- ✅ Check file after completion

## Why This Matters

When you use `Select-Object -First 50`:
1. It reads 50 lines then exits
2. The pipe closes
3. npm gets a broken pipe signal
4. npm terminates the build
5. Build artifacts are incomplete
6. Data loss occurs
7. If retried → endless loop

## Files Created

- `scripts/safe-build.ps1` - Safe build script
- `BUILD-SAFE.md` - Quick reference guide
- `.cursor/rules/prevent-build-kill.mdc` - Detailed rule

## Always Remember

**Never pipe long-running processes (builds, tests, etc.) to output limiters.**

Use `npm run build:safe` for all builds.
