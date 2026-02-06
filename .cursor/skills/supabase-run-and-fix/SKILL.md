---
name: supabase-run-and-fix
description: Runs scripts and SQL using the Supabase MCP connection, then auto-corrects and fixes errors until the code succeeds. Use when writing or changing code that uses Supabase, when testing database logic, or when the user asks to run or validate Supabase-related code.
---

# Supabase Run and Fix

## Rule

**Always run your own scripts using the connection to Supabase. Auto-correct and fix until the code is finished (runs successfully).**

## Instructions

1. **Use the Supabase connection**  
   When you write or change code that touches Supabase (SQL, migrations, queries, scripts that hit the DB), run it via the **user-supabase** MCP server instead of only describing or simulating it.

2. **Which tools to use**
   - **execute_sql**: For running SELECT/INSERT/UPDATE/DELETE or ad-hoc SQL. Check the tool schema in `mcps/user-supabase/tools/execute_sql.json` before calling.
   - **apply_migration**: For DDL (CREATE/ALTER/DROP). Prefer this over raw DDL in `execute_sql`.
   - List other tools in `mcps/user-supabase/tools/` when you need migrations, branches, types, etc. Always read the tool’s JSON descriptor before calling.

3. **Run, then fix**
   - After running (e.g. `call_mcp_tool` with server `user-supabase` and the right tool), read the result.
   - If there are errors (SQL errors, type errors, missing tables, bad schema): fix the code or the query.
   - Run again with the same connection.
   - Repeat until the code/script runs successfully and the task is done.

4. **No “assume it works”**
   - Do not leave Supabase-dependent code untested. Execute it with your Supabase connection, then iterate on errors until it is finished.

## Workflow summary

```
Write or change code → Run via Supabase (MCP user-supabase) → Errors? → Fix code → Run again → Repeat until success
```

## Checklist

- [ ] Used the Supabase MCP connection (user-supabase) to run the script/SQL
- [ ] Checked the tool schema before calling (e.g. execute_sql, apply_migration)
- [ ] On failure: fixed the code and re-ran
- [ ] Stopped only when the code runs successfully and the task is complete
