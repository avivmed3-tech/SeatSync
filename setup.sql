-- =====================================================
-- SeatSync — Full Database Setup
-- Run this in Supabase SQL Editor (supabase.com → project → SQL Editor)
-- =====================================================

-- =====================================================
-- 1. TABLES
-- =====================================================

-- Profiles (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  plan_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT DEFAULT 'wedding'
    CHECK (event_type IN ('wedding', 'bar_mitzvah', 'bat_mitzvah', 'corporate', 'birthday', 'other')),
  event_date DATE,
  event_time TIME,
  venue_name TEXT,
  venue_address TEXT,
  message_template TEXT,
  rsvp_enabled BOOLEAN DEFAULT false,
  rsvp_deadline DATE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tables (seating)
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  table_type TEXT DEFAULT 'round'
    CHECK (table_type IN ('round', 'rectangle', 'square')),
  seats INT NOT NULL DEFAULT 10 CHECK (seats >= 1 AND seats <= 30),
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  rotation FLOAT DEFAULT 0,
  scale FLOAT DEFAULT 1,
  group_label TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Guests
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  group_name TEXT DEFAULT 'כללי',
  expected_guests INT DEFAULT 1 CHECK (expected_guests >= 1 AND expected_guests <= 20),
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'declined', 'maybe')),
  confirmed_guests INT DEFAULT 0 CHECK (confirmed_guests >= 0 AND confirmed_guests <= 20),
  dietary_notes TEXT,
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  seat_index INT,
  rsvp_token TEXT UNIQUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Message Rounds
CREATE TABLE IF NOT EXISTS message_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  message_template TEXT NOT NULL,
  channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'both')),
  target_filter TEXT DEFAULT 'all'
    CHECK (target_filter IN ('all', 'pending', 'maybe', 'declined', 'custom')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  total_sent INT DEFAULT 0,
  total_delivered INT DEFAULT 0,
  total_replied INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages (individual)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  round_id UUID REFERENCES message_rounds(id) ON DELETE SET NULL,
  channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'rsvp_link')),
  message_text TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  reply_text TEXT,
  status TEXT DEFAULT 'sent'
    CHECK (status IN ('sent', 'delivered', 'read', 'replied', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Rate Limits
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_token ON guests(rsvp_token);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(event_id, status);
CREATE INDEX IF NOT EXISTS idx_guests_table ON guests(table_id);
CREATE INDEX IF NOT EXISTS idx_messages_event ON messages(event_id);
CREATE INDEX IF NOT EXISTS idx_messages_guest ON messages(guest_id);
CREATE INDEX IF NOT EXISTS idx_tables_event ON tables(event_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(identifier, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_audit_log_event ON audit_log(event_id);

-- =====================================================
-- 3. TRIGGERS — auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_events ON events;
CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_guests ON guests;
CREATE TRIGGER set_updated_at_guests
  BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 4. AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ── Profiles ──
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid());

-- ── Events ──
DROP POLICY IF EXISTS "Users can view own events" ON events;
CREATE POLICY "Users can view own events"
  ON events FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own events" ON events;
CREATE POLICY "Users can insert own events"
  ON events FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own events" ON events;
CREATE POLICY "Users can update own events"
  ON events FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own events" ON events;
CREATE POLICY "Users can delete own events"
  ON events FOR DELETE USING (user_id = auth.uid());

-- RSVP ACCESS HAS BEEN SECURED
-- Policies have been removed to prevent data leaks. Use RPC functions instead.

-- ── Guests ──
DROP POLICY IF EXISTS "Users can manage guests of own events" ON guests;
CREATE POLICY "Users can manage guests of own events"
  ON guests FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

-- GUEST RSVP POLICIES MOVED TO SECURE RPC
-- Unauthenticated users should access and update their RSVP via RPC functions only.

-- ── Tables ──
DROP POLICY IF EXISTS "Users can manage tables of own events" ON tables;
CREATE POLICY "Users can manage tables of own events"
  ON tables FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

-- ── Messages ──
DROP POLICY IF EXISTS "Users can manage messages of own events" ON messages;
CREATE POLICY "Users can manage messages of own events"
  ON messages FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

-- ── Message Rounds ──
DROP POLICY IF EXISTS "Users can manage rounds of own events" ON message_rounds;
CREATE POLICY "Users can manage rounds of own events"
  ON message_rounds FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

-- ── Audit Log ──
DROP POLICY IF EXISTS "Users can view audit log of own events" ON audit_log;
CREATE POLICY "Users can view audit log of own events"
  ON audit_log FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "System can insert audit log" ON audit_log;
CREATE POLICY "System can insert audit log"
  ON audit_log FOR INSERT WITH CHECK (true);

-- ── Rate Limits ──
DROP POLICY IF EXISTS "Service role manages rate limits" ON rate_limits;
CREATE POLICY "Service role manages rate limits"
  ON rate_limits FOR ALL USING (true);

-- =====================================================
-- 6. ENABLE REALTIME on guests table
-- =====================================================
-- Go to Supabase Dashboard → Database → Replication
-- and enable replication for the 'guests' table.
-- Or run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE guests;

-- =====================================================
-- 7. SECURE RPC FUNCTIONS FOR PUBLIC RSVP
-- =====================================================

-- Securely get a specific guest and event by token
CREATE OR REPLACE FUNCTION get_rsvp_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest record;
  v_event record;
BEGIN
  SELECT * INTO v_guest FROM guests WHERE rsvp_token = p_token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_event FROM events WHERE id = v_guest.event_id;

  RETURN jsonb_build_object(
    'guest', row_to_json(v_guest),
    'event', row_to_json(v_event)
  );
END;
$$;

-- Securely update a specific guest by token
CREATE OR REPLACE FUNCTION update_rsvp_by_token(
  p_token text,
  p_status text,
  p_confirmed_guests int,
  p_dietary_notes text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guest record;
BEGIN
  SELECT * INTO v_guest FROM guests WHERE rsvp_token = p_token;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE guests 
  SET 
    status = p_status,
    confirmed_guests = p_confirmed_guests,
    dietary_notes = p_dietary_notes,
    updated_at = now()
  WHERE rsvp_token = p_token;

  RETURN true;
END;
$$;

-- =====================================================
-- 7. EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'custom',
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_per_person BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_event ON expenses(event_id);

DROP TRIGGER IF EXISTS set_updated_at_expenses ON expenses;
CREATE TRIGGER set_updated_at_expenses
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage expenses of own events" ON expenses;
CREATE POLICY "Users can manage expenses of own events"
  ON expenses FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

-- =====================================================
-- 8. GIFTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL DEFAULT '',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gifts_event ON gifts(event_id);
CREATE INDEX IF NOT EXISTS idx_gifts_guest ON gifts(guest_id);

DROP TRIGGER IF EXISTS set_updated_at_gifts ON gifts;
CREATE TRIGGER set_updated_at_gifts
  BEFORE UPDATE ON gifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage gifts of own events" ON gifts;
CREATE POLICY "Users can manage gifts of own events"
  ON gifts FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

-- =====================================================
-- MIGRATIONS (run these if upgrading an existing database)
-- =====================================================

ALTER TABLE tables ADD COLUMN IF NOT EXISTS scale FLOAT DEFAULT 1;

-- =====================================================
-- DONE! Now create a user via the app's registration form.
-- =====================================================
