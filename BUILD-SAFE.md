# Safe Build Commands - READ THIS FIRST

## ⚠️ CRITICAL: Never Use Output Limiters on Builds

**Using `Select-Object -First N` or `head -N` on build commands WILL KILL YOUR BUILD and cause data loss.**

## ✅ Always Use These Commands

### Recommended: Safe Build Script
```powershell
npm run build:safe
```
- Shows live output
- Saves to `build.log`
- **Build completes successfully**

### Alternative: Normal Build
```powershell
cd c:\Users\Faycel\Documents\dzd-oc; npm run build
```
- Full output in terminal
- **Build completes successfully**

### Quiet Build (No Terminal Output)
```powershell
npm run build:quiet
```
- No terminal output
- Saves to `build.log`
- Check file after completion

## ❌ NEVER Use These Commands

```powershell
# ❌ THIS KILLS YOUR BUILD
npm run build 2>&1 | Select-Object -First 50

# ❌ THIS ALSO KILLS YOUR BUILD  
npm run build | head -50
```

**Why?** The output limiter exits after N lines, closing the pipe. npm receives a broken pipe signal and terminates the build mid-execution, causing:
- Incomplete builds
- Corrupted files
- Data loss
- Endless loops
- System freezing

## What to Do If Build Keeps Failing

1. **Stop using** `Select-Object -First` or `head` on builds
2. **Use** `npm run build:safe` instead
3. **Check** `build.log` for errors
4. **Never** pipe long-running processes to line limiters

## Quick Reference

| Command | Safe? | Use When |
|---------|-------|----------|
| `npm run build:safe` | ✅ Yes | **Always use this** |
| `npm run build` | ✅ Yes | Normal build |
| `npm run build:quiet` | ✅ Yes | No terminal output needed |
| `npm run build \| Select-Object -First 50` | ❌ **NO** | **NEVER** |
| `npm run build \| head -50` | ❌ **NO** | **NEVER** |

## Need Help?

See `.cursor/rules/build-commands.mdc` for detailed explanation.
