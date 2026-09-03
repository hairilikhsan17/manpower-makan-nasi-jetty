import { useState, useMemo, useEffect } from 'react';
import { useVariabelDasar, useDataHarian } from '@/hooks/useData';
import { useAuth } from '@/context/AuthContext';
import type { DataHarian, DataHarianInput } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import InputForm from '@/components/InputForm';
import { CalendarDays, ChevronLeft, ChevronRight, X, Pencil, Trash2, Plus, AlertCircle, Loader2, Clock, User } from 'lucide-react';

export default function HistoryPage() {
  const { variabel, loading: varLoading } = useVariabelDasar();
  const { dataList, loading: dataLoading, refetch } = useDataHarian();
  const { user } = useAuth();

  const [cursorMonth, setCursorMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<'detail' | 'edit' | 'add'>('detail');
  const [editTarget, setEditTarget] = useState<DataHarian | null>(null);
  const [addShift, setAddShift] = useState<'Pagi' | 'Malam'>('Pagi');
  const [confirmDelete, setConfirmDelete] = useState<DataHarian | null>(null);

  // Group data by date
  const dataByDate = useMemo(() => {
    const map = new Map<string, DataHarian[]>();
    const shiftOrder = (s: string) => (s === 'Pagi' ? 0 : 1);
    for (const d of dataList) {
      const arr = map.get(d.tanggal) ?? [];
      arr.push(d);
      arr.sort((a, b) => shiftOrder(a.shift) - shiftOrder(b.shift));
      map.set(d.tanggal, arr);
    }
    return map;
  }, [dataList]);

  const selectedData = selectedDate ? (dataByDate.get(selectedDate) ?? []) : [];

  const openDate = (date: string) => {
    setSelectedDate(date);
    setPanelMode('detail');
    setEditTarget(null);
  };

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
    setPanelMode('detail');
    refetch();
  };

  const handleUpdate = async (input: DataHarianInput, hasil: { makanSiang: number; makanSore: number; makanMalam: number; baseJettySaatInput: number }) => {
    if (!editTarget) return;
    const before = { ...editTarget };
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
    }).eq('id', editTarget.id);
    if (error) throw new Error(error.message);

    await supabase.from('log_perubahan').insert({
      data_harian_id: editTarget.id,
      aksi: 'edit',
      data_sebelum: before,
      data_sesudah: { ...input, hasil_makan_siang: hasil.makanSiang, hasil_makan_sore: hasil.makanSore, hasil_makan_malam: hasil.makanMalam },
      oleh_siapa: user?.email ?? null,
    });

    setPanelMode('detail');
    setEditTarget(null);
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

  // Calendar grid
  const calendarDays = useMemo(() => {
    const year = cursorMonth.getFullYear();
    const month = cursorMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const days: (string | null)[] = [];

    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  }, [cursorMonth]);

  const todayStr = new Date().toISOString().slice(0, 10);

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
          <CalendarDays className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">History / Kalender Rekapan</h1>
          <p className="text-sm text-slate-500">Klik tanggal untuk melihat detail atau menambah data</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            {cursorMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCursorMonth(new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() - 1, 1))}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCursorMonth(new Date(cursorMonth.getFullYear(), cursorMonth.getMonth() + 1, 1))}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((dateStr, i) => {
            if (!dateStr) return <div key={i} />;
            const dayData = dataByDate.get(dateStr) ?? [];
            const hasData = dayData.length > 0;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayNum = parseInt(dateStr.slice(-2), 10);

            return (
              <button
                key={dateStr}
                onClick={() => openDate(dateStr)}
                className={`relative aspect-square rounded-xl border text-sm transition-all flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500/20'
                    : isToday
                    ? 'border-amber-300 bg-amber-50/50'
                    : hasData
                    ? 'border-slate-200 bg-slate-50 hover:border-orange-300 hover:bg-orange-50/30'
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className={`font-medium ${isToday ? 'text-amber-600' : hasData ? 'text-slate-700' : 'text-slate-400'}`}>
                  {dayNum}
                </span>
                {hasData && (
                  <div className="flex gap-0.5">
                    {dayData.map((d) => (
                      <span
                        key={d.id}
                        className={`w-1.5 h-1.5 rounded-full ${d.shift === 'Pagi' ? 'bg-amber-400' : 'bg-indigo-400'}`}
                      />
                    ))}
                  </div>
                )}
                {hasData && (
                  <span className="absolute top-1 right-1 text-[10px] font-bold text-slate-400">{dayData.length}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-slate-500">Shift Pagi</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span className="text-xs text-slate-500">Shift Malam</span>
          </div>
        </div>
      </div>

      {/* Loading state for data */}
      {dataLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      )}

      {/* Slide-in panel */}
      {selectedDate && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30 transition-opacity"
            onClick={() => { setSelectedDate(null); setPanelMode('detail'); setEditTarget(null); }}
          />
          <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto h-full animate-slide-in">
            {/* Panel header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-800">
                {new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => { setSelectedDate(null); setPanelMode('detail'); setEditTarget(null); }}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {panelMode === 'detail' && (
                <>
                  {selectedData.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <CalendarDays className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500 mb-4">Belum ada data untuk tanggal ini.</p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => { setPanelMode('add'); setAddShift('Pagi'); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-700 font-semibold text-sm hover:bg-amber-200 transition-all"
                        >
                          <Plus className="w-4 h-4" /> Tambah Shift Pagi
                        </button>
                        <button
                          onClick={() => { setPanelMode('add'); setAddShift('Malam'); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-100 text-indigo-700 font-semibold text-sm hover:bg-indigo-200 transition-all"
                        >
                          <Plus className="w-4 h-4" /> Tambah Shift Malam
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Summary */}
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="grid grid-cols-2 gap-3">
                          {(['Pagi', 'Malam'] as const).map((shift) => {
                            const row = selectedData.find((d) => d.shift === shift);
                            return (
                              <div key={shift} className="bg-white rounded-lg p-3 border border-slate-100">
                                <p className="text-xs text-slate-500">Shift {shift}</p>
                                <p className="text-sm font-semibold text-slate-700">{row ? row.jetty : '–'}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Detail rows */}
                      {selectedData.map((d) => (
                        <div key={d.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                          <div className={`px-4 py-2.5 flex items-center justify-between ${d.shift === 'Pagi' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                            <span className={`text-sm font-semibold ${d.shift === 'Pagi' ? 'text-amber-700' : 'text-indigo-700'}`}>
                              Shift {d.shift} — {d.jetty}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setPanelMode('edit'); setEditTarget(d); }}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-amber-100 hover:text-amber-600 transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConfirmDelete(d)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            {/* Input values */}
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              {([
                                ['Cuti', d.cuti],
                                ['Sakit Panjang', d.sakit_panjang],
                                ['Izin', d.izin],
                                ['Pelatihan SIO', d.pelatihan_sio],
                                ['Off Steady Day', d.shift === 'Pagi' ? d.off_steady_day : '–'],
                                ['Cuti Steady Day', d.shift === 'Pagi' ? d.cuti_steady_day : '–'],
                              ] as const).map(([label, val]) => (
                                <div key={label}>
                                  <p className="text-xs text-slate-400">{label}</p>
                                  <p className="font-medium text-slate-700">{val}</p>
                                </div>
                              ))}
                            </div>
                            {/* Results */}
                            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                              <div>
                                <p className="text-xs text-slate-400">Siang</p>
                                <p className="font-bold text-slate-800">{d.hasil_makan_siang || '–'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Sore</p>
                                <p className="font-bold text-slate-800">{d.hasil_makan_sore || '–'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-400">Malam</p>
                                <p className="font-bold text-slate-800">{d.hasil_makan_malam || '–'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-orange-400">Total</p>
                                <p className="font-bold text-orange-600">{d.hasil_makan_siang + d.hasil_makan_sore + d.hasil_makan_malam}</p>
                              </div>
                            </div>
                            {/* Audit info */}
                            {d.updated_by && (
                              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" /> {d.updated_by}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(d.updated_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add missing shift */}
                      {selectedData.length === 1 && (
                        <button
                          onClick={() => {
                            setPanelMode('add');
                            setAddShift(selectedData[0].shift === 'Pagi' ? 'Malam' : 'Pagi');
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/30 transition-all text-sm font-medium"
                        >
                          <Plus className="w-4 h-4" />
                          Tambah Shift {selectedData[0].shift === 'Pagi' ? 'Malam' : 'Pagi'}
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Edit mode */}
              {panelMode === 'edit' && editTarget && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-4">Edit Data Shift {editTarget.shift}</h4>
                  <InputForm
                    variabel={variabel}
                    initialData={editTarget}
                    onSubmit={handleUpdate}
                    onCancel={() => { setPanelMode('detail'); setEditTarget(null); }}
                    submitLabel="Update"
                  />
                </div>
              )}

              {/* Add mode */}
              {panelMode === 'add' && (
                <div>
                  <h4 className="font-semibold text-slate-800 mb-4">Tambah Data Shift {addShift}</h4>
                  <InputForm
                    variabel={variabel}
                    defaultTanggal={selectedDate}
                    onSubmit={handleInsert}
                    onCancel={() => { setPanelMode('detail'); }}
                    submitLabel="Simpan"
                  />
                </div>
              )}
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
              <h3 className="font-bold text-slate-800">Konfirmasi Hapus</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Yakin hapus data shift <strong>{confirmDelete.shift}</strong> {confirmDelete.jetty} tanggal{' '}
              <strong>{new Date(confirmDelete.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>?
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
