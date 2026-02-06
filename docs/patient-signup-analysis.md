# Patient Signup Error Analysis

## Problem
Patients get errors when trying to sign up, but the account is still created. There is no redirect or confirmation shown.

## Root Cause Analysis

### 1. **Profile update failure blocks success flow (most likely)**

**Location:** `app/register/page.tsx` lines 82–97

The flow:
1. `signUp()` succeeds → auth user is created
2. `handle_new_user` trigger creates a profile (id, email, full_name, user_type)
3. Code runs `profiles.update()` to add phone, date_of_birth, gender, etc.

If the profile update fails (RLS, schema, timing), the error is only logged:

```ts
if (profileError) {
  console.error('Profile update error:', profileError)
}
```

The code does not rethrow, so execution continues. However, if the Supabase client throws instead of returning an error (e.g. network issues, unexpected responses), the exception is caught by the outer `catch`, which:

- Sets a generic error message
- Calls `setIsLoading(false)`
- Never runs `router.push()` or `setSuccess(true)`

Result: account exists, user sees an error, no redirect or success state.

### 2. **`redirectTo` is never read from the URL**

**Location:** `app/register/page.tsx` line 102

The page uses `redirectTo` but never defines it:

```ts
const path = redirectTo && typeof redirectTo === 'string' && ... ? redirectTo : '/dashboard'
```

`redirectTo` is undefined because `searchParams.get('redirect')` is never called. The login page links to `/register?redirect=...`, but the register page ignores it.

Impact: redirects still happen (to `/dashboard`), but the intended post-login destination is lost.

### 3. **Auth signup page uses wrong profile columns**

**Location:** `app/auth/signup/page.tsx` lines 65–76

This page uses `INSERT` with `first_name` and `last_name`:

```ts
.insert({
  id: authData.user.id,
  first_name: formData.firstName,
  last_name: formData.lastName,
  ...
})
```

The `profiles` table (see `scripts/MASTER-SETUP.sql`) has `full_name`, not `first_name`/`last_name`. The insert will fail with a column error.

The error is only logged, so the code still calls `router.push('/dashboard')`. If the client throws on this error instead of returning it, the outer `catch` would run and the user would see an error with no redirect.

### 4. **Profile creation timing**

The `handle_new_user` trigger runs after `auth.users` insert. In theory the profile exists before the client receives the signup response. In practice:

- Trigger missing or failing
- Different DB setup
- Replication lag

If the profile does not exist yet, `UPDATE` would affect 0 rows and return no error. The redirect would still run. So timing alone is unlikely to cause “no redirect,” but it can cause incomplete profile data.

### 5. **Email confirmation configuration**

When email confirmation is required:

- `data.session` is `null`
- Code should call `setSuccess(true)` and show “check your email”

If `data.user` is null or the structure differs from expectations, the `if (data.user)` block is skipped. Then neither redirect nor success is shown, which matches “no redirect or confirmation.”

## Recommended Fixes

1. **Treat profile update as non-blocking**  
   Do not let profile update failure prevent redirect or success. Always redirect or show success when `data.user` exists, and handle profile errors separately (e.g. toast or background retry).

2. **Read `redirect` from URL**  
   Use `searchParams.get('redirect')` and pass it through to the post-signup redirect.

3. **Align auth signup with schema**  
   Use `full_name` instead of `first_name`/`last_name` in the profile insert, or switch to `UPDATE` if the trigger already creates the profile.

4. **Improve error handling**  
   - Differentiate between auth errors and profile errors  
   - On auth success, always either redirect or show success  
   - Surface profile update failures without blocking the main flow

5. **Add defensive checks**  
   - Ensure `data.user` exists before continuing  
   - Handle `data.session === null` explicitly for email confirmation flows
