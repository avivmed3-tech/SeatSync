-- =====================================================
-- Security Hardening Migration
-- Date: 2026-04-21
-- Fixes critical RLS and permission gaps identified in security review
-- =====================================================

-- ── 1. profiles: prevent users from self-upgrading plan/credits ──
-- Users can still update their own name/phone, but NOT billing fields.
-- Only service_role (edge functions) can write plan/credits.

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Revoke UPDATE permission on sensitive billing columns from the authenticated role.
-- service_role bypasses RLS entirely, so edge functions are unaffected.
REVOKE UPDATE (plan, plan_expires_at, call_credits, sms_credits) ON profiles FROM authenticated;

-- ── 2. transactions: block direct INSERT/UPDATE/DELETE by authenticated users ──
-- Only service_role (via edge functions) should write transactions.
-- The existing SELECT policy stays (users can view their own).

DROP POLICY IF EXISTS "Users cannot write transactions" ON transactions;
-- No INSERT policy = RLS blocks authenticated inserts (service_role bypasses RLS)

-- ── 3. audit_log: remove open INSERT policy ──
-- The current "WITH CHECK (true)" lets any authenticated user forge audit entries.
-- service_role handles all writes; no INSERT policy needed for authenticated role.

DROP POLICY IF EXISTS "System can insert audit log" ON audit_log;
-- No INSERT policy for authenticated = RLS blocks it. service_role still bypasses.

-- ── 4. rate_limits: lock down to service_role only ──
-- The "FOR ALL USING (true)" lets any authenticated user read & reset rate counters.

DROP POLICY IF EXISTS "Service role manages rate limits" ON rate_limits;
-- No policies = only service_role can access rate_limits. Authenticated role blocked.

-- ── 5. transactions: ensure RLS is enabled (guard for databases missing it) ──
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ── 6. Verify audit_log and rate_limits have RLS on ──
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
