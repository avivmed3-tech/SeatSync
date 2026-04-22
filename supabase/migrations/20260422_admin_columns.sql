-- =====================================================
-- Admin Columns Migration
-- Date: 2026-04-22
-- Adds is_admin / is_blocked to profiles, admin_audit table,
-- and RLS policy so admin can read all profiles.
-- =====================================================

-- 1. New columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- 2. Index (partial — only true rows, minimal size)
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin   ON profiles(is_admin)   WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked) WHERE is_blocked = true;

-- 3. Backfill: mark the developer account as admin
UPDATE profiles
SET is_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'avivmed3@gmail.com'
);

-- 4. Recreate handle_new_user() to auto-set is_admin on signup
--    (SECURITY DEFINER so it can read auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    NEW.email = 'avivmed3@gmail.com'
  )
  ON CONFLICT (id) DO UPDATE
    SET is_admin = (EXCLUDED.is_admin OR profiles.is_admin);
  RETURN NEW;
END;
$$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Lock down is_admin + is_blocked so authenticated users cannot self-modify
--    (service_role bypasses RLS entirely, so edge functions are unaffected)
REVOKE UPDATE (is_admin, is_blocked) ON profiles FROM authenticated;

-- 6. RLS policy: admin can SELECT all profiles
--    (necessary for realtime and direct queries in the admin panel)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    -- own row always visible
    id = auth.uid()
    OR
    -- OR caller is admin (sub-select is indexed on is_admin partial index)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- 7. Admin audit log table (separate from audit_log which requires event_id)
CREATE TABLE IF NOT EXISTS admin_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID NOT NULL,
  action        TEXT NOT NULL,
  target_user_id UUID,
  payload       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;
-- No policies = only service_role can read/write (authenticated role is blocked by RLS)

-- 8. Ensure profiles is in the realtime publication
--    (allows admin panel to receive live user row changes)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
