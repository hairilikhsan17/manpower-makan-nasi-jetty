import { useState, useEffect, useMemo } from 'react';
import type { Shift, JettyName, VariabelDasar, DataHarian, DataHarianInput } from '@/lib/types';
import { getBaseJetty, getTotalTambahanTetap, hitungPerhitungan } from '@/lib/calculations';
import { Loader2, Save, X, Calculator } from 'lucide-react';

interface InputFormProps {
  variabel: VariabelDasar;
  initialData?: DataHarian | null;
  defaultTanggal?: string;
  onSubmit: (input: DataHarianInput, hasil: { makanSiang: number; makanSore: number; makanMalam: number; baseJettySaatInput: number }) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

const emptyForm: DataHarianInput = {
  tanggal: '',
  shift: 'Pagi',
  jetty: 'Jetty 1',
  cuti: 0,
  sakit_panjang: 0,
  izin: 0,
  pelatihan_sio: 0,
  off_steady_day: 0,
  cuti_steady_day: 0,
};

export default function InputForm({ variabel, initialData, defaultTanggal, onSubmit, onCancel, submitLabel = 'Simpan Data' }: InputFormProps) {
  const [form, setForm] = useState<DataHarianInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setForm({
        tanggal: initialData.tanggal,
        shift: initialData.shift,
        jetty: initialData.jetty,
        cuti: initialData.cuti,
        sakit_panjang: initialData.sakit_panjang,
        izin: initialData.izin,
        pelatihan_sio: initialData.pelatihan_sio,
        off_steady_day: initialData.off_steady_day,
        cuti_steady_day: initialData.cuti_steady_day,
      });
    } else {
      setForm({ ...emptyForm, tanggal: defaultTanggal ?? '' });
    }
  }, [initialData, defaultTanggal]);

  const baseJetty = getBaseJetty(form.jetty, variabel);
  const totalTambahanTetap = getTotalTambahanTetap(variabel);

  const hasil = useMemo(
    () => hitungPerhitungan(
      form.shift, baseJetty,
      form.cuti, form.sakit_panjang, form.izin, form.pelatihan_sio,
      form.off_steady_day, form.cuti_steady_day,
      variabel.reguler, totalTambahanTetap,
    ),
    [form, baseJetty, variabel.reguler, totalTambahanTetap],
  );

  const update = (field: keyof DataHarianInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateNumber = (field: keyof DataHarianInput, value: string) => {
    const num = Math.max(0, parseInt(value, 10));
    setForm((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.tanggal) {
      setError('Tanggal wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(form, {
        makanSiang: hasil.makanSiang,
        makanSore: hasil.makanSore,
        makanMalam: hasil.makanMalam,
        baseJettySaatInput: baseJetty,
      });
      if (!initialData) {
        setForm({ ...emptyForm, tanggal: form.tanggal });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Date + Shift + Jetty */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal <span className="text-red-500">*</span></label>
          <input
            type="date"
            required
            value={form.tanggal}
            onChange={(e) => update('tanggal', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Shift <span className="text-red-500">*</span></label>
          <select
            value={form.shift}
            onChange={(e) => update('shift', e.target.value as Shift)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all bg-white"
          >
            <option value="Pagi">Pagi</option>
            <option value="Malam">Malam</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Jetty <span className="text-red-500">*</span></label>
          <select
            value={form.jetty}
            onChange={(e) => update('jetty', e.target.value as JettyName)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all bg-white"
          >
            <option value="Jetty 1">Jetty 1</option>
            <option value="Jetty 2">Jetty 2</option>
            <option value="Jetty 3">Jetty 3</option>
          </select>
        </div>
      </div>

      {/* Numeric inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([
          ['cuti', 'Cuti'],
          ['sakit_panjang', 'Sakit Panjang'],
          ['izin', 'Izin'],
          ['pelatihan_sio', 'Pelatihan SIO'],
        ] as const).map(([field, label]) => (
          <div key={field}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
            <input
              type="number"
              min={0}
              value={form[field]}
              onChange={(e) => updateNumber(field, e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        ))}
      </div>

      {/* Steady Day fields — only for Pagi */}
      <div className={`grid grid-cols-2 gap-4 transition-all ${form.shift === 'Pagi' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        {([
          ['off_steady_day', 'Off Steady Day'],
          ['cuti_steady_day', 'Cuti Steady Day'],
        ] as const).map(([field, label]) => (
          <div key={field}>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {label}
              {form.shift === 'Malam' && <span className="text-xs text-slate-400 ml-1">(khusus Pagi)</span>}
            </label>
            <input
              type="number"
              min={0}
              value={form.shift === 'Pagi' ? form[field] : 0}
              disabled={form.shift !== 'Pagi'}
              onChange={(e) => updateNumber(field, e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all disabled:bg-slate-50"
            />
          </div>
        ))}
      </div>

      {/* Live calculation preview */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-4 h-4 text-orange-500" />
          <h4 className="text-sm font-semibold text-slate-700">Pratinjau Perhitungan</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-xs text-slate-500">Makan Siang</p>
            <p className="text-lg font-bold text-slate-800">{form.shift === 'Pagi' ? hasil.makanSiang : '–'}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-xs text-slate-500">Makan Sore</p>
            <p className="text-lg font-bold text-slate-800">{form.shift === 'Pagi' ? hasil.makanSore : '–'}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-100">
            <p className="text-xs text-slate-500">Makan Malam</p>
            <p className="text-lg font-bold text-slate-800">{form.shift === 'Malam' ? hasil.makanMalam : '–'}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 border border-orange-200">
            <p className="text-xs text-orange-600">Total</p>
            <p className="text-lg font-bold text-orange-700">{hasil.total}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition-all"
          >
            <X className="w-4 h-4" />
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
