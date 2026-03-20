-- ============================================================
-- SUPABASE DATABASE SEED SCRIPT — AEROREFUND
-- Run this ENTIRE script in Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates schema + seeds all data in one go.
-- ============================================================

-- 1. ENSURE EXTENSION
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. CREATE / UPDATE TABLES
-- ============================================================

-- SYNC: Drop/recreate auth.users extra columns if missing (migrate old projects)
-- Supabase auth.users uses: id, instance_id, aud, role, email, encrypted_password,
--   last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at,
--   updated_at, email_confirmed_at, phone_confirmed_at, confirmation_sent_at, etc.
DO $$
BEGIN
  -- Add only if missing (skip if already exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'auth' AND column_name = 'created_at') THEN
    ALTER TABLE auth.users ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'auth' AND column_name = 'last_sign_in_at') THEN
    ALTER TABLE auth.users ADD COLUMN last_sign_in_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'auth' AND column_name = 'email_confirmed_at') THEN
    ALTER TABLE auth.users ADD COLUMN email_confirmed_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END
$$;

-- USERS TABLE
-- PK column MUST be `id` (matches app: mockFirebase getDoc/setDoc uses .eq('id', ...))
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID        REFERENCES auth.users NOT NULL PRIMARY KEY,
  sdt         TEXT,
  display_name TEXT,
  email       TEXT,
  role        TEXT        DEFAULT 'user',
  status      TEXT        DEFAULT 'active',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  fcm_token   TEXT,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  last_read_at TIMESTAMPTZ
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles" ON public.users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.users;
CREATE POLICY "Admins can update all profiles" ON public.users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- REFUND REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        REFERENCES auth.users NOT NULL,
  user_sdt         TEXT,
  user_email       TEXT,
  display_name     TEXT,
  bank_name        TEXT,
  account_number   TEXT,
  account_holder   TEXT,
  amount           NUMERIC,
  order_code       TEXT,
  status           TEXT        DEFAULT 'pending',
  is_visible       BOOLEAN     DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  admin_note       TEXT,
  processing_time  TIMESTAMPTZ,
  refund_slip_code TEXT,
  approved_by      TEXT,
  approved_at      TIMESTAMPTZ,
  completed_by     TEXT,
  completed_at     TIMESTAMPTZ,
  transfer_note    TEXT,
  refund_reason    TEXT,
  flight_date      TEXT,
  ticket_number    TEXT,
  passenger_name   TEXT
);

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own requests" ON public.refund_requests;
CREATE POLICY "Users can view own requests" ON public.refund_requests FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can insert own requests" ON public.refund_requests;
CREATE POLICY "Users can insert own requests" ON public.refund_requests FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can manage all requests" ON public.refund_requests;
CREATE POLICY "Admins can manage all requests" ON public.refund_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- BASEDATA TABLE
CREATE TABLE IF NOT EXISTS public.basedata (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  order_code   TEXT        UNIQUE,
  amount       NUMERIC,
  passenger_name TEXT,
  flight_number TEXT,
  status       TEXT        DEFAULT 'valid',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.basedata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage basedata" ON public.basedata;
CREATE POLICY "Admins can manage basedata" ON public.basedata FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
);

DROP POLICY IF EXISTS "Public read basedata" ON public.basedata;
CREATE POLICY "Public read basedata" ON public.basedata FOR SELECT USING (TRUE);

-- CHATS TABLE
CREATE TABLE IF NOT EXISTS public.chats (
  id             TEXT        PRIMARY KEY, -- TEXT to match project reality
  user_name      TEXT,
  last_message   TEXT,
  last_time      TIMESTAMPTZ,
  unread_count   INTEGER     DEFAULT 0
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chat" ON public.chats;
CREATE POLICY "Users can view own chat" ON public.chats FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Admins can manage all chats" ON public.chats;
CREATE POLICY "Admins can manage all chats" ON public.chats FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id      TEXT        REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id    TEXT,
  sender_name  TEXT,
  sender_role  TEXT,
  text         TEXT,
  timestamp    TIMESTAMPTZ DEFAULT NOW(),
  is_read      BOOLEAN     DEFAULT FALSE
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (
  chat_id::text = auth.uid()::text OR
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
);

DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT WITH CHECK (
  chat_id::text = auth.uid()::text OR
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email  TEXT,
  action       TEXT,
  target_id    TEXT,
  target_type  TEXT,
  changes      JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.config (
  id                 TEXT        PRIMARY KEY DEFAULT 'system',
  support_phone      TEXT,
  support_email      TEXT,
  working_hours      TEXT,
  brand_name         TEXT,
  footer_description TEXT,
  copyright          TEXT,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_config" ON public.config;
CREATE POLICY "public_read_config" ON public.config FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins update config" ON public.config;
CREATE POLICY "Admins update config" ON public.config FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- ============================================================
-- SYNC: Add missing columns to existing tables
-- (skip silently if columns already exist)
-- ============================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

ALTER TABLE public.basedata ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.basedata ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS processing_time TIMESTAMPTZ;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS refund_slip_code TEXT;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS completed_by TEXT;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.refund_requests ADD COLUMN IF NOT EXISTS transfer_note TEXT;

ALTER TABLE public.config ADD COLUMN IF NOT EXISTS support_phone TEXT;
ALTER TABLE public.config ADD COLUMN IF NOT EXISTS support_email TEXT;
ALTER TABLE public.config ADD COLUMN IF NOT EXISTS working_hours TEXT;
ALTER TABLE public.config ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE public.config ADD COLUMN IF NOT EXISTS footer_description TEXT;
ALTER TABLE public.config ADD COLUMN IF NOT EXISTS copyright TEXT;

-- ============================================================
-- SEED DATA
-- Default password for ALL accounts: Admin@123
-- ============================================================

DO $$
DECLARE
  admin1_uid UUID := gen_random_uuid();
  admin2_uid UUID := gen_random_uuid();
  admin3_uid UUID := gen_random_uuid();
  user1_uid  UUID := gen_random_uuid();
  user2_uid  UUID := gen_random_uuid();
BEGIN

  -- ADMIN 1: Nguyễn Văn Minh
  INSERT INTO auth.users (id, email, encrypted_password, created_at, last_sign_in_at, email_confirmed_at)
  VALUES (
    admin1_uid,
    'admin_0999999999@aerorefund.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bKHJyOs/ztKPF3.',
    NOW(), NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.users (id, sdt, display_name, email, role, status, created_at)
  VALUES (admin1_uid, '0999999999', 'Nguyễn Văn Minh', 'admin_0999999999@aerorefund.com', 'admin', 'active', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ADMIN 2: Trần Thị Lan
  INSERT INTO auth.users (id, email, encrypted_password, created_at, last_sign_in_at, email_confirmed_at)
  VALUES (
    admin2_uid,
    'admin_0383165313@aerorefund.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bKHJyOs/ztKPF3.',
    NOW(), NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.users (id, sdt, display_name, email, role, status, created_at)
  VALUES (admin2_uid, '0383165313', 'Trần Thị Lan', 'admin_0383165313@aerorefund.com', 'admin', 'active', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ADMIN 3: Lê Hoàng Nam
  INSERT INTO auth.users (id, email, encrypted_password, created_at, last_sign_in_at, email_confirmed_at)
  VALUES (
    admin3_uid,
    'admin_0968686868@aerorefund.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bKHJyOs/ztKPF3.',
    NOW(), NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.users (id, sdt, display_name, email, role, status, created_at)
  VALUES (admin3_uid, '0968686868', 'Lê Hoàng Nam', 'admin_0968686868@aerorefund.com', 'admin', 'active', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- USER 1: Phạm Thị Mai
  INSERT INTO auth.users (id, email, encrypted_password, created_at, last_sign_in_at, email_confirmed_at)
  VALUES (
    user1_uid,
    'user_phamthimai@aerorefund.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bKHJyOs/ztKPF3.',
    NOW(), NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.users (id, sdt, display_name, email, role, status, created_at)
  VALUES (user1_uid, '0912345678', 'Phạm Thị Mai', 'phamthimai@gmail.com', 'user', 'active', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- USER 2: Hoàng Đức Anh
  INSERT INTO auth.users (id, email, encrypted_password, created_at, last_sign_in_at, email_confirmed_at)
  VALUES (
    user2_uid,
    'user_hoangducanh@aerorefund.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bKHJyOs/ztKPF3.',
    NOW(), NOW(), NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.users (id, sdt, display_name, email, role, status, created_at)
  VALUES (user2_uid, '0933888999', 'Hoàng Đức Anh', 'hoangducanh@yahoo.com', 'user', 'active', NOW())
  ON CONFLICT (id) DO NOTHING;

END $$;

-- ============================================================
-- SEED: BASEDATA
-- ============================================================

INSERT INTO public.basedata (order_code, amount, passenger_name, flight_number, status, created_at) VALUES
  ('VN-2024-SGN-HAN-001', 1450000, 'Nguyễn Văn Minh',  'VN601',  'valid',    NOW() - INTERVAL '10 days'),
  ('VN-2024-HAN-SGN-002', 1380000, 'Trần Thị Lan',      'VN602',  'valid',    NOW() - INTERVAL '9 days'),
  ('VJ-2024-SGN-DAD-003',  890000, 'Lê Hoàng Nam',      'VJ541',  'valid',    NOW() - INTERVAL '8 days'),
  ('QH-2024-HAN-UIH-004',  650000, 'Phạm Thị Mai',       'QH1523', 'valid',    NOW() - INTERVAL '7 days'),
  ('VN-2024-DAD-SGN-005', 1720000, 'Hoàng Đức Anh',     'VN683',  'valid',    NOW() - INTERVAL '6 days'),
  ('VJ-2024-SGN-PXU-006',  780000, 'Nguyễn Thị Hương', 'VJ311',  'valid',    NOW() - INTERVAL '5 days'),
  ('VN-2024-HAN-CXR-007', 1100000, 'Trần Đình Khoa',    'VN1892', 'valid',    NOW() - INTERVAL '4 days'),
  ('QH-2024-SGN-PQC-008',  550000, 'Lê Thị Thu',         'QH1841', 'valid',    NOW() - INTERVAL '3 days'),
  ('VJ-2024-HAN-DAD-009',  950000, 'Phạm Văn Hùng',      'VJ241',  'valid',    NOW() - INTERVAL '2 days'),
  ('VN-2024-SGN-VCA-010',  720000, 'Ngô Thị Lan',        'VN1403', 'valid',    NOW() - INTERVAL '1 day'),
  ('VN-2024-HAN-SGN-011', 1500000, 'Đặng Đức Thắng',    'VN605',  'valid',    NOW() - INTERVAL '12 hours'),
  ('VJ-2024-SGN-HAN-012', 1250000, 'Vũ Thị Mai',          'VJ501',  'valid',    NOW() - INTERVAL '6 hours'),
  ('VN-2024-SGN-HAN-013', 1350000, 'Bùi Văn Tân',        'VN609',  'refunded', NOW() - INTERVAL '15 days'),
  ('VN-2024-DAD-HAN-014', 1050000, 'Trịnh Thị Phương',   'VN1632', 'valid',    NOW() - INTERVAL '20 hours'),
  ('QH-2024-SGN-DAD-015',  820000, 'Nguyễn Đình Hùng',  'QH151',  'valid',    NOW() - INTERVAL '4 hours')
ON CONFLICT (order_code) DO NOTHING;

-- ============================================================
-- SEED: REFUND REQUESTS (for user accounts only)
-- ============================================================

INSERT INTO public.refund_requests (
  user_id, user_sdt, user_email, display_name,
  bank_name, account_number, account_holder, amount, order_code,
  status, refund_reason, flight_date, ticket_number, passenger_name,
  created_at, admin_note, approved_by, approved_at, completed_by, completed_at, refund_slip_code
)
SELECT
  u.id, u.sdt, u.email, u.display_name,
  CASE (rn)
    WHEN 1 THEN 'Vietcombank'
    WHEN 2 THEN 'Techcombank'
    WHEN 3 THEN 'VPBank'
    WHEN 4 THEN 'ACB'
  END,
  '123456' || LPAD(CAST(rn AS TEXT), 4, '0'),
  u.display_name,
  CASE (rn)
    WHEN 1 THEN 1450000
    WHEN 2 THEN 1380000
    WHEN 3 THEN 890000
    WHEN 4 THEN 650000
  END,
  CASE (rn)
    WHEN 1 THEN 'VN-2024-SGN-HAN-001'
    WHEN 2 THEN 'VN-2024-HAN-SGN-002'
    WHEN 3 THEN 'VJ-2024-SGN-DAD-003'
    WHEN 4 THEN 'QH-2024-HAN-UIH-004'
  END,
  CASE (rn)
    WHEN 1 THEN 'pending'
    WHEN 2 THEN 'approved'
    WHEN 3 THEN 'processing'
    WHEN 4 THEN 'completed'
  END,
  'Hủy chuyến do công việc đột xuất',
  (CURRENT_DATE + (rn * INTERVAL '3 days'))::TEXT,
  '689' || LPAD(CAST(rn AS TEXT), 10, '0'),
  u.display_name,
  NOW() - (rn * INTERVAL '5 hours'),
  CASE WHEN rn = 2 THEN 'Đã xác minh đủ điều kiện hoàn' END,
  CASE WHEN rn = 2 THEN 'Nguyễn Văn Minh' END,
  CASE WHEN rn = 2 THEN NOW() - INTERVAL '2 hours' END,
  CASE WHEN rn = 4 THEN 'Nguyễn Văn Minh' END,
  CASE WHEN rn = 4 THEN NOW() - INTERVAL '30 minutes' END,
  CASE WHEN rn = 4 THEN 'TT-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(CAST(rn AS TEXT), 4, '0') END
FROM public.users u
CROSS JOIN generate_series(1, 4) AS rn
WHERE u.role = 'user';

-- ============================================================
-- SEED: CONFIG
-- ============================================================

INSERT INTO public.config (id, support_phone, support_email, working_hours, brand_name, footer_description, copyright)
VALUES (
  'system',
  '1900 6091',
  'hotro@aerorefund.com',
  '0h - 24h',
  'TRUNG TÂM HỖ TRỢ HÀNG KHÔNG VIỆT NAM',
  'Hệ thống quản lý đại lý & hoàn vé máy bay tự động',
  '© 2026 TRUNG TÂM HỖ TRỢ HÀNG KHÔNG VIỆT NAM — Hệ thống quản lý đại lý & hoàn vé tự động.'
)
ON CONFLICT (id) DO UPDATE SET
  support_phone      = EXCLUDED.support_phone,
  support_email     = EXCLUDED.support_email,
  working_hours     = EXCLUDED.working_hours,
  brand_name        = EXCLUDED.brand_name,
  footer_description = EXCLUDED.footer_description,
  copyright         = EXCLUDED.copyright;

-- ============================================================
-- DONE — Summary
-- ============================================================

SELECT '✅ Hoàn tất seed!' AS status;
