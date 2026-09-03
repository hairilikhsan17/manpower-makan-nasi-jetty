export type Shift = 'Pagi' | 'Malam';
export type JettyName = 'Jetty 1' | 'Jetty 2' | 'Jetty 3';

export interface VariabelDasar {
  id: string;
  jetty1: number;
  jetty2: number;
  jetty3: number;
  reguler: number;
  safety: number;
  jubir: number;
  updated_at: string;
}

export interface DataHarian {
  id: string;
  tanggal: string;
  shift: Shift;
  jetty: JettyName;
  cuti: number;
  sakit_panjang: number;
  izin: number;
  pelatihan_sio: number;
  off_steady_day: number;
  cuti_steady_day: number;
  base_jetty_saat_input: number;
  hasil_makan_siang: number;
  hasil_makan_sore: number;
  hasil_makan_malam: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface LogPerubahan {
  id: string;
  data_harian_id: string | null;
  aksi: 'edit' | 'hapus';
  data_sebelum: Record<string, unknown> | null;
  data_sesudah: Record<string, unknown> | null;
  oleh_siapa: string | null;
  waktu: string;
}

export interface DataHarianInput {
  tanggal: string;
  shift: Shift;
  jetty: JettyName;
  cuti: number;
  sakit_panjang: number;
  izin: number;
  pelatihan_sio: number;
  off_steady_day: number;
  cuti_steady_day: number;
}

export interface HasilPerhitungan {
  makanSiang: number;
  makanSore: number;
  makanMalam: number;
  total: number;
  totalPengurang: number;
  regulerDisesuaikan: number;
}

export type AdminRole = 'super_admin' | 'admin';
export type AdminStatus = 'aktif' | 'nonaktif';

export interface Profile {
  id: string;
  nama: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  created_at: string;
  updated_at: string;
}
