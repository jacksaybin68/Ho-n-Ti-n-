-- ============================================================
-- SUPABASE SCHEMA — AEROREFUND
-- Chỉ lưu trữ thông tin tài khoản khách hàng
-- ============================================================

-- Bật extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- BẢNG USERS — Thông tin tài khoản khách hàng
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID        PRIMARY KEY,
  sdt             TEXT,
  display_name    TEXT,
  email           TEXT,
  role            TEXT        DEFAULT 'user',
  status          TEXT        DEFAULT 'active',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  fcm_token       TEXT,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  last_read_at    TIMESTAMPTZ
);

-- Trigger tự động cập nhật updated_at
DROP TRIGGER IF EXISTS tr_users_updated_at ON public.users;
CREATE TRIGGER tr_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Bật RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Khách hàng xem và cập nhật tài khoản của mình
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Admin xem và cập nhật tất cả tài khoản
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.users;
CREATE POLICY "Admins can update all profiles" ON public.users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role = 'admin')
  );

-- ============================================================
-- SEED DỮ LIỆU MẪU
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
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin_0999999999@aerorefund.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, created_at, last_sign_in_at, email_confirmed_at)
    VALUES (
      admin1_uid,
      'admin_0999999999@aerorefund.com',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bKHJyOs/ztKPF3.',
      NOW(), NOW(), NOW()
    );
  END IF;

  INSERT INTO public.users (id, sdt, display_name, email, role, status, created_at)
  VALUES (admin1_uid, '0999999999', 'Nguyễn Văn Minh', 'admin_0999999999@aerorefund.com', 'admin', 'active', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ADMIN 2: Trần Thị Lan
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin_0383165313@aerorefund.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, created_at, last_sign_in_at, email_confirmed_at)
    VALUES (
      admin2_uid,
      'admin_0383165313@aerorefund.com',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bKHJyOs/ztKPF3.',
      NOW(), NOW(), NOW()
    );
  END IF;

  INSERT INTO public.users (id, sdt, display_name, email, role, status, created_at)
  VALUES (admin2_uid, '0383165313', 'Trần Thị Lan', 'admin_0383165313@aerorefund.com', 'admin', 'active', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- ADMIN 3: Lê Hoàng Nam
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin_0968686868@aerorefund.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, created_at, last_sign_in_at, email_confirmed_at)
    VALUES (
      admin3_uid,
      'admin_0968686868@aerorefund.com',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bKHJyOs/ztKPF3.',
      NOW(), NOW(), NOW()
    );
  END IF;

  INSERT INTO public.users (id, sdt, display_name, email, role, status, created_at)
  VALUES (admin3_uid, '0968686868', 'Lê Hoàng Nam', 'admin_0968686868@aerorefund.com', 'admin', 'active', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- USER 1: Phạm Thị Mai
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'user_phamthimai@aerorefund.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, created_at, last_sign_in_at, email_confirmed_at)
    VALUES (
      user1_uid,
      'user_phamthimai@aerorefund.com',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bKHJyOs/ztKPF3.',
      NOW(), NOW(), NOW()
    );
  END IF;

  INSERT INTO public.users (id, sdt, display_name, email, role, status, created_at)
  VALUES (user1_uid, '0912345678', 'Phạm Thị Mai', 'phamthimai@gmail.com', 'user', 'active', NOW())
  ON CONFLICT (id) DO NOTHING;

  -- USER 2: Hoàng Đức Anh
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'user_hoangducanh@aerorefund.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, created_at, last_sign_in_at, email_confirmed_at)
    VALUES (
      user2_uid,
      'user_hoangducanh@aerorefund.com',
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bKHJyOs/ztKPF3.',
      NOW(), NOW(), NOW()
    );
  END IF;

  INSERT INTO public.users (id, sdt, display_name, email, role, status, created_at)
  VALUES (user2_uid, '0933888999', 'Hoàng Đức Anh', 'hoangducanh@yahoo.com', 'user', 'active', NOW())
  ON CONFLICT (id) DO NOTHING;

END $$;

SELECT '✅ Hoàn tất! Database chỉ lưu trữ thông tin khách hàng.' AS status;
