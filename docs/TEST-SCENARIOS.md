# DZDoc Test Scenarios

Concrete test cases for manual and automated testing. See `TEST-SCENARIOS-GUIDE.md` for methodology.

---

## Chat

### Direct conversations
| # | Scenario | Steps | Expected | Status |
|---|----------|-------|----------|--------|
| C1 | Reuse existing thread | New Conversation → search "Pharmacie de Nuit" → click | Opens existing chat, shows history | ✅ Fixed |
| C2 | Contact name = business name | Chat with pharmacy | Header shows "Pharmacie de Nuit" not personal name | ✅ Fixed |
| C3 | Search by email | New Conversation → type user email | User appears in results | ✅ Implemented |
| C4 | Search by business name | New Conversation → type "nuit" | Pharmacie de Nuit appears | ✅ Implemented |
| C5 | Blocked user | Block user, try start chat | Blocked or clear error | ⬜ To verify |
| C6 | User not accepting chats | Target has accepting_new_chats=false | Disabled or message | ⬜ To verify |

### Group chat
| # | Scenario | Steps | Expected | Status |
|---|----------|-------|----------|--------|
| G1 | Duplicate group name | Create "Team Alpha", create another "Team Alpha" | Reuses existing group, opens it instead | ✅ Fixed |
| G2 | Empty group name | Create group with blank title | Validation error or button disabled | ⬜ To verify |
| G3 | Zero members | Create group without selecting anyone | Button disabled or validation | ⬜ To verify |
| G4 | Add existing member | Add same person twice to group | No duplicate / clear feedback | ⬜ To verify |

### Messages
| # | Scenario | Steps | Expected | Status |
|---|----------|-------|----------|--------|
| M1 | Empty message | Try send blank | Blocked or trimmed | ⬜ To verify |
| M2 | Very long message | Paste 10k+ chars | Limit or truncate | ⬜ To verify |
| M3 | Edit deleted message | Delete message, then edit | Error or no-op | ⬜ To verify |

---

## Booking

| # | Scenario | Steps | Expected | Status |
|---|----------|-------|----------|--------|
| B1 | Book without login | Try book as guest | Redirect to login | ⬜ To verify |
| B2 | Book taken slot | Two users book same slot (race) | One succeeds, one gets error | ⬜ To verify |
| B3 | Cancel past appointment | Cancel appointment in the past | Allowed or clear error | ⬜ To verify |

---

## Auth

| # | Scenario | Steps | Expected | Status |
|---|----------|-------|----------|--------|
| A1 | Wrong password | Login with wrong password | Clear error message | ⬜ To verify |
| A2 | Sign up existing email | Register with used email | Error from Supabase | ⬜ To verify |
| A3 | Session expired | Idle long, then action | Redirect to login or refresh | ⬜ To verify |

---

## Tickets (SOP-based)

| # | Scenario | Steps | Expected | Status |
|---|----------|-------|----------|--------|
| T1 | Invalid doctor ID | Create ticket with bad doctor_id | Error | ⬜ To verify |
| T2 | Refund outside window | Refund <24h before | 0% per SOP | ⬜ To verify |

---

## How to Use

1. **Manual test**: Follow steps, check expected, update status.
2. **Automate**: Convert high-value scenarios to Playwright/Vitest.
3. **Log bugs**: Add to `EDGE-CASES-LOG.md` with reproduction steps.
