# Commercial-Grade Security Framework

## Overview

This document describes the security measures implemented in the Multi-Service Health Platform. These controls meet or exceed industry standards for healthcare applications (HIPAA, OWASP).

---

## 1. Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      MIDDLEWARE LAYER                        │
│  - Security headers (XSS, CSRF, Clickjacking protection)   │
│  - Rate limiting (per IP + per user)                        │
│  - Bot/attack detection                                      │
│  - Request ID tracing                                        │
├─────────────────────────────────────────────────────────────┤
│                      API LAYER                               │
│  - Input validation & sanitization                          │
│  - Request body validation                                   │
│  - Malicious input detection                                │
│  - Safe error responses (no stack traces)                   │
├─────────────────────────────────────────────────────────────┤
│                      DATA ACCESS LAYER                       │
│  - Row-Level Security (RLS)                                 │
│  - Audit logging                                             │
│  - Access verification                                       │
│  - Circuit breakers                                          │
├─────────────────────────────────────────────────────────────┤
│                      DATABASE LAYER                          │
│  - Parameterized queries (Supabase)                         │
│  - Encrypted at rest & in transit                           │
│  - Automatic backups                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Security Modules

### 2.1 Input Validation (`lib/security/input-validation.ts`)

**Purpose**: Prevent injection attacks (SQL, XSS, NoSQL, Command injection)

**Features**:
- `sanitizeHtml()` - Remove dangerous HTML/script content
- `sanitizePhone()` - Clean phone numbers
- `sanitizeEmail()` - Normalize and validate emails
- `sanitizeUuid()` - Validate UUID format
- `validatePassword()` - Enforce password strength
- `detectMaliciousInput()` - Detect attack patterns

**Usage**:
```typescript
import { validateEmail, detectMaliciousInput } from '@/lib/security/input-validation'

const emailResult = validateEmail(userInput)
if (!emailResult.valid) {
  return { error: emailResult.errors }
}

const maliciousCheck = detectMaliciousInput(userInput)
if (maliciousCheck.isMalicious) {
  logSecurityEvent('malicious_input', { threats: maliciousCheck.threats })
  return { error: 'Invalid input' }
}
```

---

### 2.2 Rate Limiting (`lib/security/rate-limiting.ts`)

**Purpose**: Prevent brute force, DoS, and API abuse

**Preset Configurations**:
| Endpoint Type | Requests/Window | Block Duration |
|---------------|-----------------|----------------|
| Auth Login | 5/15min | 30 min |
| Auth Signup | 3/hour | 24 hours |
| Password Reset | 3/hour | 1 hour |
| API Read | 100/min | 1 min |
| API Write | 30/min | 1 min |
| Prescription Create | 50/hour | 30 min |
| File Upload | 20/hour | 1 hour |
| Chat Message | 30/min | 5 min |

**Usage**:
```typescript
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limiting'

const result = checkRateLimit(userIdentifier, RATE_LIMITS.AUTH_LOGIN)
if (!result.allowed) {
  return Response.json(
    { error: 'Too many attempts' },
    { status: 429, headers: { 'Retry-After': '1800' } }
  )
}
```

---

### 2.3 API Security (`lib/security/api-security.ts`)

**Purpose**: Comprehensive API protection

**Features**:
- Security headers (OWASP recommended)
- CORS configuration
- Request validation
- Safe error responses
- Request logging

**Security Headers Applied**:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: ...`
- `Strict-Transport-Security` (production only)

**Usage**:
```typescript
import { validateApiRequest, createErrorResponse } from '@/lib/security/api-security'

export async function POST(request: NextRequest) {
  const securityCheck = await validateApiRequest(request, {
    requireAuth: true,
    userId: user?.id,
    rateLimit: 'API_WRITE',
    checkMaliciousInput: true,
  })
  
  if (!securityCheck.allowed) {
    return createErrorResponse(securityCheck.reason, {
      statusCode: securityCheck.statusCode,
    })
  }
  
  // ... handle request
}
```

---

### 2.4 Data Masking (`lib/security/data-masking.ts`)

**Purpose**: Prevent sensitive data leakage in logs and errors

**What Gets Masked**:
- Email addresses → `us***@domain.com`
- Phone numbers → `***1234`
- Credit cards → `****-****-****-1234`
- Passwords → `[REDACTED]`
- JWT tokens → `[JWT_REDACTED]`
- Medical data (diagnosis, medications, notes)

**Usage**:
```typescript
import { maskObject, safeLog } from '@/lib/security/data-masking'

// Safe logging
safeLog('info', 'User action', { userId, prescription: prescriptionData })

// Manual masking
const safeData = maskObject(sensitiveData)
console.log(safeData) // Sensitive fields are redacted
```

---

### 2.5 Circuit Breaker (`lib/security/circuit-breaker.ts`)

**Purpose**: Prevent cascade failures, enable graceful degradation

**States**:
- `CLOSED` - Normal operation
- `OPEN` - Service failing, reject requests immediately
- `HALF_OPEN` - Testing if service recovered

**Configurations**:
| Service | Failure Threshold | Timeout | Recovery |
|---------|-------------------|---------|----------|
| Database | 5 failures | 30s | 3 successes |
| Payment | 2 failures | 2min | 1 success |
| Storage | 3 failures | 1min | 2 successes |
| Notifications | 5 failures | 30s | 3 successes |

**Usage**:
```typescript
import { DatabaseCircuit } from '@/lib/security/circuit-breaker'

const result = await DatabaseCircuit.execute(
  () => supabase.from('prescriptions').select('*'),
  () => getCachedData() // Fallback
)

if (result.fromFallback) {
  console.warn('Using cached data - database circuit is open')
}
```

---

### 2.6 Audit Logging (`lib/security/data-integrity.ts`)

**Purpose**: Complete audit trail for compliance

**What Gets Logged**:
- All data reads (who, what, when)
- All data modifications (before/after)
- Access denied attempts
- Errors and failures
- Authentication events

**Severity Levels**:
| Level | Description | Action |
|-------|-------------|--------|
| INFO | Normal operations | Archive after 90 days |
| WARNING | Unusual but not critical | Review daily |
| ERROR | Operation failed | Investigate within 4 hours |
| CRITICAL | Security/data issue | Immediate escalation |

**Usage**:
```typescript
import { logAudit, escalateCriticalError } from '@/lib/security/data-integrity'

// Log access
await logAudit(supabase, {
  user_id: userId,
  action: 'READ',
  resource_type: 'prescription',
  resource_id: prescriptionId,
  details: { reason: 'patient_view' },
  severity: 'INFO',
})

// Escalate critical issues
escalateCriticalError(
  'Data Visibility Failure',
  error,
  { prescriptionId, userId }
)
```

---

## 3. Middleware (`middleware.ts`)

Applied to all requests automatically:

1. **Security Headers** - Applied to every response
2. **Rate Limiting** - For API routes
3. **Bot Detection** - Block malicious bots and scanners
4. **Attack Detection** - Block SQL injection, path traversal
5. **Request Tracing** - Add unique request ID

---

## 4. Health Endpoint (`/api/health`)

Monitor system health:

```bash
# Basic health check
curl http://localhost:3000/api/health

# With data integrity checks (slower)
curl http://localhost:3000/api/health?integrity=true
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-30T12:00:00Z",
  "checks": {
    "database": { "status": "ok", "latency_ms": 45 },
    "circuitBreakers": {
      "database": { "state": "CLOSED", "failures": 0 }
    }
  }
}
```

---

## 5. Database Security

### Row-Level Security (RLS)
- Patients can only see their own data
- Doctors can only see their patients' data
- Pharmacies can only see assigned prescriptions
- All policies enforced at database level

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID,
  action TEXT,         -- READ, CREATE, UPDATE, DELETE, ERROR
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  severity TEXT,       -- INFO, WARNING, ERROR, CRITICAL
  created_at TIMESTAMPTZ
);
```

### Data Integrity Checks
```sql
-- Run periodically
SELECT * FROM check_data_integrity();
```

---

## 6. Incident Response

### Severity Levels
- **P0 (Critical)**: Data loss, security breach → Immediate response
- **P1 (High)**: Major feature broken → 1 hour response
- **P2 (Medium)**: Minor issues → 4 hour response
- **P3 (Low)**: Cosmetic → Next business day

### Response Steps
1. **Detect** - Automated monitoring + user reports
2. **Acknowledge** - Confirm within SLA
3. **Investigate** - Root cause analysis
4. **Mitigate** - Fix or workaround
5. **Resolve** - Permanent fix
6. **Post-mortem** - Document and prevent recurrence

---

## 7. Deployment Checklist

Before deploying:

- [ ] Run `scripts/060-audit-logs-table.sql` in Supabase
- [ ] Verify RLS policies are enabled
- [ ] Test rate limiting endpoints
- [ ] Check `/api/health` returns healthy
- [ ] Review audit logs for test data
- [ ] Verify error escalation works

---

## 8. Monitoring & Alerts

Integrate with:
- **Sentry** - Error tracking
- **DataDog/NewRelic** - APM
- **PagerDuty** - Incident management
- **Slack** - Alert notifications

Configure alerts for:
- CRITICAL audit log entries
- Circuit breaker OPEN state
- Health check failures
- Rate limit blocks > threshold
- Failed authentication spikes
