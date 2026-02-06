# DZDoc Project Guide

## 🚀 Quick Start

```bash
cd dzd-oc
pnpm install
pnpm dev
```

Open: http://localhost:3000

---

## 📁 Project Structure

```
dzd-oc/
├── app/                    # Next.js pages
│   ├── api/               # API routes
│   ├── booking/           # Booking flow
│   ├── dashboard/         # Patient dashboard
│   ├── professional/      # Doctor/Pharmacy dashboard
│   └── super-admin/       # Admin panel
├── components/            # React components
├── lib/
│   ├── supabase/         # Database client
│   └── i18n/             # Translations
├── scripts/              # SQL setup files
└── .env.local            # Environment variables (REQUIRED!)
```

---

## 🗄️ Database Setup (ONE TIME)

1. Go to Supabase Dashboard → SQL Editor
2. Run: `scripts/MASTER-SETUP.sql`
3. Done!

### Make yourself admin:
```sql
SELECT make_super_admin('your-email@example.com');
```

### Link user to doctor record:
```sql
SELECT link_user_to_professional('doctor@email.com', '11111111-1111-1111-1111-111111111111');
```

---

## 🔑 Environment File (.env.local)

**REQUIRED** - Create this file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://npgbjwqaltplatgodqfx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZ2Jqd3FhbHRwbGF0Z29kcWZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDE3MzcsImV4cCI6MjA4NDY3NzczN30.V3AYUaMXi8KoaccZx5X3xqj70Si6byvnOHlGqbrui6s
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wZ2Jqd3FhbHRwbGF0Z29kcWZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTEwMTczNywiZXhwIjoyMDg0Njc3NzM3fQ.deQofz4RpHYaV_NItS7_kLB2izLzK8VvLsQDETVSksY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 📊 Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts (auto-created on signup) |
| `professionals` | Doctors, pharmacies, labs, clinics |
| `appointments` | Bookings between patients & doctors |
| `chat_threads` | Conversation threads |
| `chat_messages` | Messages in threads |
| `prescriptions` | Doctor prescriptions |
| `lab_requests` | Lab test requests |
| `reviews` | Patient reviews |

---

## 🧪 Test Accounts

After running MASTER-SETUP.sql, create accounts via signup, then:

```sql
-- Make admin
SELECT make_super_admin('f.onthenet@gmail.com');

-- Link to doctor
SELECT link_user_to_professional('doctor@test.com', '11111111-1111-1111-1111-111111111111');
```

---

## 🛠️ Common Issues

### "Can't login"
- Check .env.local exists
- Run MASTER-SETUP.sql in Supabase

### "No doctors showing"
- Run MASTER-SETUP.sql (creates test doctors)
- Check: `SELECT * FROM professionals WHERE type='doctor';`

### "pnpm dev not found"
- Make sure you're in the `dzd-oc` folder (not parent folder)
- Run: `pnpm install` first

### "Slow loading"
- Check browser console for errors
- Verify Supabase connection in .env.local

---

## 📝 Key Files to Know

| File | What it does |
|------|--------------|
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client |
| `components/auth-provider.tsx` | Auth context for whole app |
| `app/booking/new/page.tsx` | Main booking flow |
| `app/professional/dashboard/page.tsx` | Doctor/Pharmacy dashboard |

---

## 🎯 Development Phases

### Phase 1: Foundation ✅
- [x] Auth (login/register)
- [x] Profiles
- [x] Database schema
- [x] Navigation

### Phase 2: Booking MVP
- [x] Doctor listing
- [x] Booking flow UI
- [ ] Real appointment creation
- [ ] Patient appointment view

### Phase 3: Professional Side
- [x] Professional dashboard UI
- [ ] View appointments
- [ ] Accept/reject

### Phase 4: Communication
- [x] Chat UI
- [ ] Real-time messaging
- [ ] Notifications

### Phase 5: Advanced
- [ ] Prescriptions workflow
- [ ] Lab requests
- [ ] Payments
- [ ] Reviews

---

## 💡 Tips for AI Assistance

When asking Claude for help, always provide:
1. The exact error message
2. Which page/feature you're working on
3. What you expected vs what happened

Keep this file updated as you make progress!
