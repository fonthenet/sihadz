# DZDoc Test Scenarios & Troubleshooting Guide

This document describes how to systematically discover, document, and test edge cases across the platform—chat, booking, tickets, payments, and more.

---

## 1. Where to Find & Create Test Scenarios

### Current State
- **`TEST_CREDENTIALS.md`** – Test accounts (pharmacies, labs)
- **`SUPABASE_AUTH_SETUP.md`** – Auth setup and test emails
- **No formal test scenario list** – This guide and the companion file below fill that gap

### Recommended Structure
```
docs/
├── TEST-SCENARIOS-GUIDE.md     ← This file (methodology)
├── TEST-SCENARIOS.md           ← Concrete scenarios by feature
├── TESTING-REMOVAL.md          ← How to remove tests / duplicate check
└── EDGE-CASES-LOG.md           ← Log of discovered bugs/edge cases
```

---

## 2. How to Discover Edge Cases

### A. Boundary & Invalid Input
For every user input, ask:
- **Empty**: What if the user submits empty?
- **Too long**: Max length exceeded?
- **Special chars**: `<>'"&`, emoji, RTL, SQL-like strings
- **Wrong type**: Number where string expected, etc.

### B. State & Concurrency
- **Already exists**: Create X when X already exists (e.g. duplicate group name)
- **Race conditions**: Two tabs creating the same thing
- **Stale data**: User A deletes; User B still sees it
- **Session expiry**: Action after long idle

### C. Permissions & Auth
- **Unauthenticated**: Access protected route
- **Wrong role**: Patient does doctor action
- **RLS**: User sees another user's data?

### D. Network & Errors
- **Offline**: Action when network fails
- **Slow**: Timeout handling
- **Partial failure**: Some steps succeed, some fail

### E. Data Integrity
- **Orphaned records**: Delete parent, child still references it
- **Missing FK**: Invalid IDs in requests
- **Schema mismatch**: Old client, new DB

---

## 3. Chat-Specific Scenarios

### Direct Chat
| Scenario | Expected | How to Test |
|----------|----------|-------------|
| Start chat with user you already chat with | Reuse existing thread, show history | New Conversation → search → click existing contact |
| Start chat with blocked user | Blocked or error | Block user, then try to start chat |
| Start chat with user who disabled new chats | Clear message / disabled | Set `accepting_new_chats: false`, try from another account |
| Contact name for professional | Business name (e.g. "Pharmacie de Nuit") | Chat with pharmacy, check header/thread list |
| Search by email | User found | Search by email in New Conversation |
| Search by business name | Professional found | Search "Pharmacie de Nuit" |

### Group Chat
| Scenario | Expected | How to Test |
|----------|----------|-------------|
| Create group with duplicate name | **Current**: Allowed (no DB unique on title) | Create "Team Alpha", create another "Team Alpha" |
| Create group with empty name | Validation error or disabled button | Try submit with empty title |
| Create group with 0 members | Validation error or disabled | Try create without selecting anyone |
| Add member already in group | No duplicate / clear feedback | Add same person twice |
| Leave group as owner | Transfer or block? | Owner leaves – check behavior |
| Delete group | All members lose access | Delete, check other members |

### Messages
| Scenario | Expected | How to Test |
|----------|----------|-------------|
| Send empty message | Blocked or trimmed | Try send blank |
| Send very long message | Truncate or limit | Paste 10k chars |
| Edit deleted message | Error or no-op | Delete, then edit |
| React to deleted message | Graceful handling | React, then delete |
| Attachment too large | Clear error | Upload 50MB file |

---

## 4. Platform-Wide Scenarios (Examples)

### Booking
- Book when slot just taken (race)
- Book without login (redirect)
- Cancel past appointment
- Reschedule to same slot

### Tickets
- Create ticket with invalid doctor ID
- Close ticket with pending orders
- Refund outside allowed window

### Payments / Wallet
- Pay with insufficient balance
- Double-click pay button
- Refund already refunded

### Auth
- Login with wrong password
- Session expired mid-action
- Sign up with existing email

---

## 5. Technical Troubleshooting

### A. Inspect Actual Behavior
1. **Browser DevTools** – Network tab for API errors, Console for JS errors
2. **Supabase Dashboard** – Logs, Table Editor, SQL Editor
3. **React DevTools** – Component state, props
4. **Application tab** – `localStorage`, `sessionStorage`

### B. Reproduce Consistently
1. Note exact steps
2. Note user role, test account
3. Note URL, query params
4. Note any prior actions (e.g. "after creating 2 groups")

### C. Trace the Code
1. Find the handler (e.g. `createGroup`, `createDirectThread`)
2. Check validation before DB call
3. Check error handling after DB call
4. Check DB constraints (unique, FK, RLS)

### D. Example: "Group name already exists"
```
1. DB: chat_threads has NO UNIQUE on title → duplicate names allowed
2. Code: createGroup() does not check for existing name
3. Result: Two groups can have same name (confusing but not an error)
4. Fix options:
   - Add unique constraint (breaking if duplicates exist)
   - Add app-level check + friendly message
   - Allow duplicates but improve UX (e.g. show member count, last activity)
```

---

## 6. Automated Testing (Future)

### Unit Tests (Vitest) – 75 tests
- **chat-error-and-hydrate**: getErrorMessage, isSchemaRelError
- **chat-utils**: getInitials, truncate, formatFileSize, getFileIcon, extractUrls, getThemeColors, etc.
- **lib/utils**: cn (class merge)
- **security/input-validation**: sanitizeHtml, validateEmail, validatePassword, detectMaliciousInput, etc.
- **payment/validation**: validateWalletPayment, calculateRefundInfo, parseApiError

### Integration Tests
- API routes: `/api/threads/[id]/messages`, `/api/appointments`
- Supabase RPC: `find_or_create_direct_thread`

### E2E Tests (Playwright / Cypress)
- Critical flows: login → book → pay
- Chat: new conversation → send message
- Cross-browser, mobile viewport

### Suggested `package.json` scripts
```json
"test": "vitest",
"test:e2e": "playwright test",
"test:coverage": "vitest run --coverage"
```

---

## 7. Quick Reference: Test Accounts

See `TEST_CREDENTIALS.md` and `SUPABASE_AUTH_SETUP.md` for:
- Pharmacy: pharmacy1@algeriamed.test … pharmacy5@algeriamed.test
- Lab: lab1@algeriamed.test … lab3@algeriamed.test
- Patient: create via signup or use existing

---

## 8. Logging Discovered Edge Cases

Use `EDGE-CASES-LOG.md` (or similar) to record:

```markdown
## [Date] Duplicate group name
- **Feature**: Chat / Group creation
- **Steps**: Create group "Team A", create another "Team A"
- **Actual**: Both created, no error
- **Expected**: Either allow with message, or prevent
- **Status**: Documented / Fixed / Won't fix
```

---

## Summary

1. **No single “full list”** – Scenarios come from systematic exploration (boundaries, state, auth, network).
2. **Document as you go** – Use `TEST-SCENARIOS.md` and `EDGE-CASES-LOG.md`.
3. **Trace code + DB** – Understand validation, errors, and constraints.
4. **Automate over time** – Start with critical paths (auth, booking, chat).
5. **SOP as reference** – `app/dashboard/sop/initial-sop-data.ts` defines expected behavior; tests should align with it.
