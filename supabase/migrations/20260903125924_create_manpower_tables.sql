/*
# Create tables for Manpower Makan Nasi app

1. New Tables
- `variabel_dasar`: Single shared config row storing base manpower values (jetty1, jetty2, jetty3, reguler, safety, jubir) and updated_at. All authenticated admins share this config.
- `data_harian`: Daily catering data rows. Each row = one (tanggal, shift, jetty) combination. Stores all input fields (cuti, sakit_panjang, izin, pelatihan_sio, off_steady_day, cuti_steady_day), the base_jetty value at time of input (for historical preservation), computed results (hasil_makan_siang, hasil_makan_sore, hasil_makan_malam), and audit fields (created_at, updated_at, updated_by).
- `log_perubahan`: Audit trail for edit/delete actions on data_harian. Stores data_sebelum (jsonb), data_sesudah (jsonb), aksi (edit/hapus), oleh_siapa, waktu.

2. Constraints
- `data_harian` has a UNIQUE constraint on (tanggal, shift) to prevent duplicate shifts on the same date (only one Pagi and one Malam per day).
- Check constraints: all numeric input fields must be >= 0.

3. Security
- RLS enabled on all three tables.
- Policies scoped TO authenticated (app has login). All authenticated admins share the data (USING true / WITH CHECK true) since this is an internal admin tool where every signed-in user is authorized.
- variabel_dasar: authenticated can SELECT and UPDATE (no insert/delete needed — seeded row).
- data_harian: full CRUD for authenticated.
- log_perubahan: authenticated can SELECT and INSERT (audit logs are append-only, no update/delete).

4. Seed data
- Insert one row into variabel_dasar with default values: jetty1=122, jetty2=124, jetty3=125, reguler=12, safety=2, jubir=1.
*/

-- ============================================================
-- Table: variabel_dasar
-- ============================================================
CREATE TABLE IF NOT EXISTS variabel_dasar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jetty1 integer NOT NULL DEFAULT 122,
  jetty2 integer NOT NULL DEFAULT 124,
  jetty3 integer NOT NULL DEFAULT 125,
  reguler integer NOT NULL DEFAULT 12,
  safety integer NOT NULL DEFAULT 2,
  jubir integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE variabel_dasar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_variabel_dasar" ON variabel_dasar;
CREATE POLICY "auth_select_variabel_dasar" ON variabel_dasar
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_update_variabel_dasar" ON variabel_dasar;
CREATE POLICY "auth_update_variabel_dasar" ON variabel_dasar
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed default config row
INSERT INTO variabel_dasar (jetty1, jetty2, jetty3, reguler, safety, jubir)
VALUES (122, 124, 125, 12, 2, 1)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Table: data_harian
-- ============================================================
CREATE TABLE IF NOT EXISTS data_harian (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('Pagi', 'Malam')),
  jetty text NOT NULL CHECK (jetty IN ('Jetty 1', 'Jetty 2', 'Jetty 3')),
  cuti integer NOT NULL DEFAULT 0 CHECK (cuti >= 0),
  sakit_panjang integer NOT NULL DEFAULT 0 CHECK (sakit_panjang >= 0),
  izin integer NOT NULL DEFAULT 0 CHECK (izin >= 0),
  pelatihan_sio integer NOT NULL DEFAULT 0 CHECK (pelatihan_sio >= 0),
  off_steady_day integer NOT NULL DEFAULT 0 CHECK (off_steady_day >= 0),
  cuti_steady_day integer NOT NULL DEFAULT 0 CHECK (cuti_steady_day >= 0),
  base_jetty_saat_input integer NOT NULL,
  hasil_makan_siang integer NOT NULL DEFAULT 0,
  hasil_makan_sore integer NOT NULL DEFAULT 0,
  hasil_makan_malam integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  UNIQUE (tanggal, shift)
);

ALTER TABLE data_harian ENABLE ROW LEVEL SECURITY;

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_data_harian_tanggal ON data_harian (tanggal);

DROP POLICY IF EXISTS "auth_select_data_harian" ON data_harian;
CREATE POLICY "auth_select_data_harian" ON data_harian
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_data_harian" ON data_harian;
CREATE POLICY "auth_insert_data_harian" ON data_harian
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_data_harian" ON data_harian;
CREATE POLICY "auth_update_data_harian" ON data_harian
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_data_harian" ON data_harian;
CREATE POLICY "auth_delete_data_harian" ON data_harian
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- Table: log_perubahan
-- ============================================================
CREATE TABLE IF NOT EXISTS log_perubahan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_harian_id uuid,
  aksi text NOT NULL CHECK (aksi IN ('edit', 'hapus')),
  data_sebelum jsonb,
  data_sesudah jsonb,
  oleh_siapa text,
  waktu timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE log_perubahan ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_log_perubahan_data_harian_id ON log_perubahan (data_harian_id);

DROP POLICY IF EXISTS "auth_select_log_perubahan" ON log_perubahan;
CREATE POLICY "auth_select_log_perubahan" ON log_perubahan
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_log_perubahan" ON log_perubahan;
CREATE POLICY "auth_insert_log_perubahan" ON log_perubahan
  FOR INSERT TO authenticated WITH CHECK (true);

-- Auto-update updated_at on data_harian modifications
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_data_harian_updated_at ON data_harian;
CREATE TRIGGER trg_data_harian_updated_at
  BEFORE UPDATE ON data_harian
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_variabel_dasar_updated_at ON variabel_dasar;
CREATE TRIGGER trg_variabel_dasar_updated_at
  BEFORE UPDATE ON variabel_dasar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();