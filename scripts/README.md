# SQL Scripts & `db:run`

## Run SQL against Supabase (local)

1. **Get your database URL**
   - Supabase Dashboard → **Project Settings** → **Database**
   - Under **Connection string**, choose **URI**
   - Use the **Connection pooler** (Transaction mode, port **6543**), e.g.  
     `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`  
     If the direct connection (port 5432) times out, the pooler usually works better.
   - Replace `[YOUR-PASSWORD]` with your database password.

2. **Add to `.env.local`** (root of project, same folder as `package.json`):
   ```bash
   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
   Keep `.env.local` secret; it is gitignored.

3. **Run a script**:
   ```bash
   npm run db:run -- scripts/022-appointments-backfill-doctor-id.sql
   ```
   Or directly:
   ```bash
   node scripts/run-sql.js scripts/022-appointments-backfill-doctor-id.sql
   ```

Output is printed to the terminal (rows if `SELECT`, or "Success. No rows returned." / "N row(s) affected." for DDL/DML).

## Removing test/fake data (production)

- **`026-delete-fake-data.sql`**  
  Removes hardcoded sample professionals (fixed UUIDs) and `@algeriamed.test` users.  
  Run: `node scripts/run-sql.js scripts/026-delete-fake-data.sql`

- **`027-delete-test-doctors-by-email.sql`**  
  Removes test/AI-created doctors by email. Edit the `exclude_emails` array in the script, add the test account emails (e.g. the 5 AI doctors), then run:  
  `node scripts/run-sql.js scripts/027-delete-test-doctors-by-email.sql`  
  Do **not** add your real accounts (e.g. `jijelbackup5@gmail.com`).

## Visit note (doctor note for patient)

If saving the "Note for patient" on the professional appointment page fails (column missing or RLS):

- **One-shot (recommended):** Run **`scripts/053-visit-note-feature.sql`** in Supabase SQL Editor. It adds the `doctor_note_for_patient` column and the RLS policy for professionals to update appointments.
- Or run separately: **`051-doctor-note-for-patient.sql`** (add column), then **`052-professionals-update-appointments-rls.sql`** (RLS).

The app will still work without the column: it falls back to the `notes` column and shows a toast suggesting you run 053.

## Lab test requests

If creating lab test requests fails with "violates foreign key constraint lab_test_requests_doctor_id_fkey":

- Run **`scripts/054-fix-lab-requests-doctor-fk.sql`** in Supabase SQL Editor. It fixes the foreign key to reference `professionals(id)` instead of the legacy `doctors(id)` table, matching the unified provider architecture.

### Lab test numbering (LT-DDMMYY-{visitRef}-Random)

- Run **`scripts/057-lab-test-lt-numbering.sql`**. New lab requests get IDs like LT-290129-a1b2c3-384729 (DDMMYY + 6-char visit ref from appointment_id + 6-digit random). Linked to main visit.

### Prescription numbering (RX-DDMMYY-{visitRef}-Random)

- Run **`scripts/059-prescription-rx-numbering.sql`**. New prescriptions get IDs like RX-290129-a1b2c3-847291. Linked to main visit.

### Document templates (branding for prescriptions/lab requests)

- Run **`scripts/061-document-template-column.sql`** to add `document_template` JSONB to professionals. Doctors can then customize practice name, header, logo URL, footer in Settings → Document Templates.

### Patient settings (notifications & timezone)

- Run **`scripts/062-profiles-notifications-timezone.sql`** to add `email_notifications`, `sms_notifications`, `push_notifications`, `marketing_emails`, and `timezone` to profiles. Patient dashboard Settings → Notifications and Preferences will then persist correctly.

### Profile picture (avatar upload)

- Create an **`avatars`** Storage bucket in Supabase for profile picture uploads. See **`scripts/create-avatars-bucket.md`**. Dashboard → Storage → New bucket → name `avatars`, enable **Public bucket**.

## Full cleanup (remove all data)

To wipe **all** clinical data, chats, appointments, prescriptions, lab tests, notifications, and test accounts:

1. Run **`scripts/058-full-cleanup-all-data.sql`** in Supabase SQL Editor  
   Or: `node scripts/run-sql.js scripts/058-full-cleanup-all-data.sql`

This deletes: chat messages/threads, lab test items/requests, prescriptions, appointments, notifications, healthcare tickets, wallet data. Also removes test accounts (@algeriamed.test, @test., demo@, etc.) from profiles/professionals. Auth users remain; delete them manually in Supabase Dashboard if needed.
