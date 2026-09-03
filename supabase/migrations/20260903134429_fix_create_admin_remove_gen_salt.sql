/*
# Fix create_admin function: remove gen_salt/crypt, use profile-only insert

The create_admin function previously used gen_salt() and crypt() to manually
hash passwords in SQL. The pgcrypto extension's gen_salt() is not available
in this Supabase instance, causing "function gen_salt(unknown) does not exist".

Admin user creation is now handled by the edge function (admin-management)
which uses supabase.auth.admin.createUser() — the proper Supabase Auth Admin API.
Password hashing is managed entirely by Supabase Auth, never in SQL.

Changes:
1. Replace create_admin() with a simplified version that only inserts a profile row
   (the edge function creates the auth user first, then calls this to insert the profile).
   This is kept as a fallback/compatibility function but is no longer the primary path.
2. The seed section for the super admin also used gen_salt/crypt — but that migration
   already ran successfully (the super admin exists). No re-seeding needed.
3. No data is lost — existing profiles and auth users remain untouched.
*/

-- Drop the old create_admin that used gen_salt/crypt
DROP FUNCTION IF EXISTS create_admin(text, text, text);

-- Re-create as a profile-only insert (called by edge function after auth user is created)
CREATE OR REPLACE FUNCTION create_admin_profile(p_user_id uuid, p_email text, p_nama text)
RETURNS TABLE (id uuid, nama text, email text, role text, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'ACCESS_DENIED: Hanya Super Admin yang dapat menambahkan admin baru.';
  END IF;

  INSERT INTO profiles (id, nama, email, role, status)
  VALUES (p_user_id, p_nama, lower(p_email), 'admin', 'aktif')
  ON CONFLICT (id) DO UPDATE SET
    nama = EXCLUDED.nama,
    email = EXCLUDED.email,
    role = 'admin',
    status = 'aktif',
    updated_at = now();

  RETURN QUERY
  SELECT profiles.id, profiles.nama, profiles.email, profiles.role, profiles.status
  FROM profiles
  WHERE profiles.id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_admin_profile(uuid, text, text) TO authenticated;