import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import { ShieldCheck, Plus, Trash2, Loader2, AlertCircle, X, UserCog, ShieldAlert, Power } from 'lucide-react';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-management`;

async function callAdminApi(sessionToken: string, payload: Record<string, unknown>) {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionToken}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export default function HakAksesPage() {
  const { isSuperAdmin, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [newNama, setNewNama] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_profiles');
    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles((data as Profile[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleAddClick = () => {
    if (!isSuperAdmin) {
      setAccessDenied(true);
      return;
    }
    setShowAddForm(true);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
      await callAdminApi(token, {
        action: 'create',
        email: newEmail,
        password: newPassword,
        nama: newNama,
      });
      setShowAddForm(false);
      setNewNama('');
      setNewEmail('');
      setNewPassword('');
      fetchProfiles();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan.';
      setError(msg.includes('ACCESS_DENIED')
        ? 'Akses Ditolak: Hanya Super Admin yang dapat menambahkan admin baru.'
        : msg);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (profile: Profile) => {
    if (!isSuperAdmin) return;
    const newStatus = profile.status === 'aktif' ? 'nonaktif' : 'aktif';
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
      await callAdminApi(token, {
        action: 'toggle_status',
        adminId: profile.id,
        status: newStatus,
      });
      fetchProfiles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || !isSuperAdmin) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error('Sesi tidak ditemukan. Silakan login ulang.');
      await callAdminApi(token, {
        action: 'delete',
        adminId: confirmDelete.id,
      });
      setConfirmDelete(null);
      fetchProfiles();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Hak Akses</h1>
          <p className="text-sm text-slate-500">Kelola akun admin dan hak akses</p>
        </div>
      </div>

      {/* Add admin button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {isSuperAdmin
            ? 'Anda adalah Super Admin. Anda dapat menambah, mengubah, dan menghapus admin.'
            : 'Anda adalah Admin. Anda dapat melihat daftar admin namun tidak dapat menambah admin baru.'}
        </p>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Admin
        </button>
      </div>

      {/* Admin table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">No</th>
                <th className="px-4 py-3 text-left font-semibold">Nama</th>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Role</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-center font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profiles.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{p.nama || '(Tanpa Nama)'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.role === 'super_admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.role === 'super_admin' && <ShieldAlert className="w-3 h-3" />}
                      {p.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.email === 'hairilikhsan11@gmail.com' ? (
                      <span className="text-xs text-slate-400 text-center block">—</span>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              title={p.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(p)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Hapus Admin"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {!isSuperAdmin && (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add admin modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <UserCog className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-800">Tambah Admin Baru</h3>
              </div>
              <button
                onClick={() => { setShowAddForm(false); setError(null); }}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  placeholder="Nama lengkap admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  placeholder="Minimal 6 karakter"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setError(null); }}
                  className="px-5 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Access denied modal */}
      {accessDenied && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-bold text-slate-800">Akses Ditolak</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Hanya Super Admin (<strong>hairilikhsan11@gmail.com</strong>) yang memiliki izin untuk menambahkan admin baru.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setAccessDenied(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-bold text-slate-800">Konfirmasi Hapus Admin</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Yakin hapus admin <strong>{confirmDelete.nama || confirmDelete.email}</strong>? Akun ini akan dihapus permanen dan tidak bisa login lagi.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-all"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
