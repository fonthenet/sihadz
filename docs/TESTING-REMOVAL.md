# How to Remove Testing Setup or Take Over Manually

Everything added for testing is **optional and removable**. Removing it will not break the app.

---

## 1. Remove Vitest (Unit Tests)

### Remove test files and config
```bash
# Delete test config
del vitest.config.ts

# Delete test folder
rmdir /s /q __tests__
# On macOS/Linux: rm -rf __tests__
```

### Remove from package.json
- Delete the `"test"` and `"test:watch"` scripts
- Run: `npm uninstall vitest`

### Result
- `npm run build` and `npm run dev` are unchanged
- No impact on production

---

## 2. Remove Duplicate Group Name Check

The check reuses an existing group when you try to create one with the same name. To allow duplicate names again:

### In `lib/chat/use-chat-hooks.ts`
Find and **delete** the block between:
```
// --- DUPLICATE_GROUP_CHECK: Reuse existing group with same name (remove this block to allow duplicates) ---
...
// --- END DUPLICATE_GROUP_CHECK ---
```

### In `app/professional/dashboard/components/pro-messages-section.tsx`
Find and **delete** the same block (between the same comments).

### Revert loadThreads return (pro-messages only)
In `pro-messages-section.tsx`, remove the `return enrichedThreads` line from `loadThreads` (after `setThreads(enrichedThreads)`).

### Result
- Creating a group with an existing name will create a new group again
- No other behavior changes

---

## 3. Take Over Manually

### Run tests yourself
```bash
npm run test          # Run once
npm run test:watch    # Watch mode
```

### Add more tests
- Create `__tests__/**/*.test.ts` files
- Import from `@/` as in app code
- Use `describe`, `it`, `expect` from Vitest

### Disable duplicate check temporarily
- Comment out the `DUPLICATE_GROUP_CHECK` blocks instead of deleting
- Uncomment to re-enable

---

## 4. Summary

| What              | Remove by                                      | Breaks app? |
|-------------------|------------------------------------------------|-------------|
| Vitest            | Delete `vitest.config.ts`, `__tests__/`, uninstall | No          |
| Duplicate check   | Delete the two commented blocks                | No          |
| Test scripts      | Remove from package.json                       | No          |
