import { useState, useEffect } from 'react';
import { useVariabelDasar } from '@/hooks/useData';
import { supabase } from '@/lib/supabase';
import { Settings, Save, Loader2, Shield, Users } from 'lucide-react';

export default function SettingsPage() {
  const { variabel, loading, refetch } = useVariabelDasar();
  const [form, setForm] = useState({
    jetty1: 122,
    jetty2: 124,
    jetty3: 125,
    reguler: 12,
    safety: 2,
    jubir: 1,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (variabel) {
      setForm({
        jetty1: variabel.jetty1,
        jetty2: variabel.jetty2,
        jetty3: variabel.jetty3,
        reguler: variabel.reguler,
        safety: variabel.safety,
        jubir: variabel.jubir,
      });
    }
  }, [variabel]);

  const totalTambahan = form.safety + form.jubir;

  const updateNumber = (field: keyof typeof form, value: string) => {
    const num = Math.max(0, parseInt(value, 10));
    setForm((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('variabel_dasar')
      .update({
        jetty1: form.jetty1,
        jetty2: form.jetty2,
        jetty3: form.jetty3,
        reguler: form.reguler,
        safety: form.safety,
        jubir: form.jubir,
      })
      .eq('id', variabel?.id);
    setSaving(false);
    if (error) {
      setMessage({ type: 'error', text: 'Gagal menyimpan: ' + error.message });
    } else {
      setMessage({ type: 'success', text: 'Pengaturan variabel berhasil disimpan.' });
      refetch();
    }
  };

  if (loading || !variabel) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const fields: { key: keyof typeof form; label: string; icon: typeof Users }[] = [
    { key: 'jetty1', label: 'Jetty 1', icon: Users },
    { key: 'jetty2', label: 'Jetty 2', icon: Users },
    { key: 'jetty3', label: 'Jetty 3', icon: Users },
    { key: 'reguler', label: 'Reguler', icon: Users },
    { key: 'safety', label: 'Safety', icon: Shield },
    { key: 'jubir', label: 'Jubir', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pengaturan Variabel</h1>
          <p className="text-sm text-slate-500">Ubah nilai dasar manpower yang dipakai untuk perhitungan</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {fields.map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    min={0}
                    value={form[key]}
                    onChange={(e) => updateNumber(key, e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total Tambahan Tetap */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Tambahan Tetap</p>
              <p className="text-xs text-slate-400">Safety + Jubir (dihitung otomatis)</p>
            </div>
            <span className="text-2xl font-bold text-slate-800">{totalTambahan}</span>
          </div>

          {/* Info note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700">
              Perubahan variabel akan otomatis mempengaruhi semua perhitungan data baru. Data histori tetap menggunakan nilai variabel yang berlaku saat data tersebut diinput.
            </p>
          </div>

          {message && (
            <div className={`text-sm rounded-lg px-4 py-2.5 ${
              message.type === 'success' ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' : 'text-red-600 bg-red-50 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Perubahan
          </button>
        </form>
      </div>
    </div>
  );
}
