import { useState, useMemo } from 'react';
import { useVariabelDasar, useDataHarian } from '@/hooks/useData';
import { useAuth } from '@/context/AuthContext';
import InputForm from '@/components/InputForm';
import type { DataHarian, DataHarianInput } from '@/lib/types';
import { getBaseJetty, getTotalTambahanTetap, hitungPerhitungan } from '@/lib/calculations';
import { supabase } from '@/lib/supabase';
import { ClipboardList, Search, Trash2, Pencil, Loader2, AlertCircle } from 'lucide-react';

export default function InputHarianPage() {
  const { variabel, loading: varLoading } = useVariabelDasar();
  const { dataList, loading: dataLoading, refetch } = useDataHarian();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DataHarian | null>(null);

  const editingData = dataList.find((d) => d.id === editingId) ?? null;

  const filtered = useMemo(() => {
    const shiftOrder = (s: string) => (s === 'Pagi' ? 0 : 1);
    const sorted = [...dataList].sort((a, b) => {
      if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
      return shiftOrder(a.shift) - shiftOrder(b.shift);
    });
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(
      (d) => d.tanggal.includes(search) || d.jetty.toLowerCase().includes(q) || d.shift.toLowerCase().includes(q),
    );
  }, [dataList, search]);

  const handleInsert = async (input: DataHarianInput, hasil: { makanSiang: number; makanSore: number; makanMalam: number; baseJettySaatInput: number }) => {
    const { error } = await supabase.from('data_harian').insert({
      tanggal: input.tanggal,
      shift: input.shift,
      jetty: input.jetty,
      cuti: input.cuti,
      sakit_panjang: input.sakit_panjang,
      izin: input.izin,
      pelatihan_sio: input.pelatihan_sio,
      off_steady_day: input.off_steady_day,
      cuti_steady_day: input.cuti_steady_day,
      base_jetty_saat_input: hasil.baseJettySaatInput,
      hasil_makan_siang: hasil.makanSiang,
      hasil_makan_sore: hasil.makanSore,
      hasil_makan_malam: hasil.makanMalam,
      updated_by: user?.email ?? null,
    });
    if (error) throw new Error(error.message);
    refetch();
  };

  const handleUpdate = async (input: DataHarianInput, hasil: { makanSiang: number; makanSore: number; makanMalam: number; baseJettySaatInput: number }) => {
    if (!editingData) return;
    const before = { ...editingData };
    const { error } = await supabase.from('data_harian').update({
      tanggal: input.tanggal,
      shift: input.shift,
      jetty: input.jetty,
      cuti: input.cuti,
      sakit_panjang: input.sakit_panjang,
      izin: input.izin,
      pelatihan_sio: input.pelatihan_sio,
      off_steady_day: input.off_steady_day,
      cuti_steady_day: input.cuti_steady_day,
      base_jetty_saat_input: hasil.baseJettySaatInput,
      hasil_makan_siang: hasil.makanSiang,
      hasil_makan_sore: hasil.makanSore,
      hasil_makan_malam: hasil.makanMalam,
      updated_by: user?.email ?? null,
    }).eq('id', editingData.id);
    if (error) throw new Error(error.message);

    await supabase.from('log_perubahan').insert({
      data_harian_id: editingData.id,
      aksi: 'edit',
      data_sebelum: before,
      data_sesudah: { ...input, hasil_makan_siang: hasil.makanSiang, hasil_makan_sore: hasil.makanSore, hasil_makan_malam: hasil.makanMalam },
      oleh_siapa: user?.email ?? null,
    });

    setEditingId(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const before = { ...confirmDelete };
    const { error } = await supabase.from('data_harian').delete().eq('id', confirmDelete.id);
    if (error) {
      alert('Gagal menghapus: ' + error.message);
      return;
    }
    await supabase.from('log_perubahan').insert({
      data_harian_id: confirmDelete.id,
      aksi: 'hapus',
      data_sebelum: before,
      data_sesudah: null,
      oleh_siapa: user?.email ?? null,
    });
    setConfirmDelete(null);
    refetch();
  };

  if (varLoading || !variabel) {
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
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Input Harian</h1>
          <p className="text-sm text-slate-500">Tambah dan kelola data perhitungan makan harian</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          {editingData ? 'Edit Data' : 'Tambah Data Baru'}
        </h2>
        <InputForm
          variabel={variabel}
          initialData={editingData}
          onSubmit={editingData ? handleUpdate : handleInsert}
          onCancel={editingData ? () => setEditingId(null) : undefined}
          submitLabel={editingData ? 'Update Data' : 'Simpan Data'}
        />
      </div>

      {/* Data table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tanggal, jetty, atau shift..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-sm transition-all"
            />
          </div>
          <span className="text-sm text-slate-400">{filtered.length} baris</span>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Belum ada data. Tambahkan data baru menggunakan form di atas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                  <th className="px-4 py-3 text-left font-semibold">Shift</th>
                  <th className="px-4 py-3 text-left font-semibold">Jetty</th>
                  <th className="px-4 py-3 text-center font-semibold">Cuti</th>
                  <th className="px-4 py-3 text-center font-semibold">Sakit</th>
                  <th className="px-4 py-3 text-center font-semibold">Izin</th>
                  <th className="px-4 py-3 text-center font-semibold">SIO</th>
                  <th className="px-4 py-3 text-center font-semibold">Off SD</th>
                  <th className="px-4 py-3 text-center font-semibold">Cuti SD</th>
                  <th className="px-4 py-3 text-center font-semibold">Siang</th>
                  <th className="px-4 py-3 text-center font-semibold">Sore</th>
                  <th className="px-4 py-3 text-center font-semibold">Malam</th>
                  <th className="px-4 py-3 text-center font-semibold">Total</th>
                  <th className="px-4 py-3 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {new Date(d.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${d.shift === 'Pagi' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {d.shift}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{d.jetty}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{d.cuti}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{d.sakit_panjang}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{d.izin}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{d.pelatihan_sio}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{d.shift === 'Pagi' ? d.off_steady_day : '–'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{d.shift === 'Pagi' ? d.cuti_steady_day : '–'}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-800">{d.hasil_makan_siang || '–'}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-800">{d.hasil_makan_sore || '–'}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-800">{d.hasil_makan_malam || '–'}</td>
                    <td className="px-4 py-3 text-center font-bold text-orange-600">{d.hasil_makan_siang + d.hasil_makan_sore + d.hasil_makan_malam}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingId(d.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(d)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-bold text-slate-800">Konfirmasi Hapus</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Yakin hapus data shift <strong>{confirmDelete.shift}</strong> {confirmDelete.jetty} tanggal{' '}
              <strong>{new Date(confirmDelete.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>?
              Data yang dihapus tidak bisa dikembalikan.
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
