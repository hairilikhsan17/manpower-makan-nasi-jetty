/*
# Create admin profiles table and admin management functions

1. New Tables
- `profiles`: Stores admin account metadata linked to auth.users. Columns: id (uuid, FK to auth.users), nama (text), email (text, unique), role (text: 'super_admin' or 'admin'), status (text: 'aktif' or 'nonaktif'), created_at, updated_at.

2. Security
- RLS enabled on `profiles`. SELECT only for authenticated. No INSERT/UPDATE/DELETE via RLS — all mutations go through SECURITY DEFINER functions that enforce super_admin checks server-side.

3. Functions (SECURITY DEFINER)
- `is_super_admin()`: Returns true if caller's email is 'hairilikhsan11@gmail.com' with role 'super_admin'.
- `get_profiles()`: Returns all profiles ordered by created_at.
- `create_admin(p_email, p_password, p_nama)`: Creates auth user + profile. Super admin only.
- `update_admin_status(p_admin_id, p_status)`: Updates profile status. Super admin only. Cannot change super admin status.
- `delete_admin(p_admin_id)`: Deletes auth user + profile. Super admin only. Cannot delete super admin.

4. Trigger
- `handle_new_user()`: Auto-creates profile row for new auth users with role='admin', status='aktif'.

5. Seed
- Create super admin auth user (hairilikhsan11@gmail.com) and profile with role='super_admin'.
*/

-- ============================================================
-- Table: profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  status text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_profiles" ON profiles;
CREATE POLICY "auth_select_profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- ============================================================
-- Function: is_super_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND email = 'hairilikhsan11@gmail.com'
      AND role = 'super_admin'
  );
$$;

-- ============================================================
-- Function: get_profiles()
-- ============================================================
CREATE OR REPLACE FUNCTION get_profiles()
RETURNS TABLE (
  id uuid,
  nama text,
  email text,
  role text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, nama, email, role, status, created_at, updated_at
  FROM profiles
  ORDER BY created_at ASC;
$$;

-- ============================================================
-- Function: create_admin(p_email, p_password, p_nama)
-- ============================================================
CREATE OR REPLACE FUNCTION create_admin(p_email text, p_password text, p_nama text)
RETURNS TABLE (id uuid, nama text, email text, role text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'ACCESS_DENIED: Hanya Super Admin yang dapat menambahkan admin baru.';
  END IF;

  IF length(p_password) < 6 THEN
    RAISE EXCEPTION 'Password minimal 6 karakter.';
  END IF;

  INSERT INTO auth.users (instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated'
  )
  RETURNING id INTO v_user_id;

  INSERT INTO profiles (id, nama, email, role, status)
  VALUES (v_user_id, p_nama, lower(p_email), 'admin', 'aktif');

  RETURN QUERY
  SELECT profiles.id, profiles.nama, profiles.email, profiles.role, profiles.status
  FROM profiles
  WHERE profiles.id = v_user_id;
END;
$$;

-- ============================================================
-- Function: update_admin_status(p_admin_id, p_status)
-- ============================================================
CREATE OR REPLACE FUNCTION update_admin_status(p_admin_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'ACCESS_DENIED: Hanya Super Admin yang dapat mengubah status admin.';
  END IF;

  IF p_status NOT IN ('aktif', 'nonaktif') THEN
    RAISE EXCEPTION 'Status harus aktif atau nonaktif.';
  END IF;

  SELECT email INTO v_email FROM profiles WHERE id = p_admin_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Admin tidak ditemukan.';
  END IF;
  IF v_email = 'hairilikhsan11@gmail.com' THEN
    RAISE EXCEPTION 'Status Super Admin tidak dapat diubah.';
  END IF;

  UPDATE profiles SET status = p_status, updated_at = now()
  WHERE id = p_admin_id;
END;
$$;

-- ============================================================
-- Function: delete_admin(p_admin_id)
-- ============================================================
CREATE OR REPLACE FUNCTION delete_admin(p_admin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'ACCESS_DENIED: Hanya Super Admin yang dapat menghapus admin.';
  END IF;

  SELECT email INTO v_email FROM profiles WHERE id = p_admin_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Admin tidak ditemukan.';
  END IF;
  IF v_email = 'hairilikhsan11@gmail.com' THEN
    RAISE EXCEPTION 'Super Admin tidak dapat dihapus.';
  END IF;

  DELETE FROM auth.users WHERE id = p_admin_id;
END;
$$;

-- ============================================================
-- Trigger: auto-create profile for new auth users
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
    INSERT INTO profiles (id, nama, email, role, status)
    VALUES (NEW.id, '', NEW.email, 'admin', 'aktif');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Seed: Super Admin account (hairilikhsan11@gmail.com)
-- ============================================================
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if super admin auth user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'hairilikhsan11@gmail.com';

  IF v_user_id IS NULL THEN
    -- Create the auth user
    INSERT INTO auth.users (instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      'hairilikhsan11@gmail.com',
      crypt(':hairil123@', gen_salt('bf')),
      now(),
      now(),
      now(),
      'authenticated',
      'authenticated'
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- Upsert super_admin profile
  INSERT INTO profiles (id, nama, email, role, status)
  VALUES (v_user_id, 'Hairil Ikhsan', 'hairilikhsan11@gmail.com', 'super_admin', 'aktif')
  ON CONFLICT (id) DO UPDATE SET
    nama = EXCLUDED.nama,
    role = 'super_admin',
    status = 'aktif',
    updated_at = now();
END;
$$;

-- Grant execute on functions to authenticated role
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION create_admin(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_admin_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_admin(uuid) TO authenticated;