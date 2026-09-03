import { useState, useMemo } from 'react';
import { useDataHarian } from '@/hooks/useData';
import { LayoutDashboard, Download, Loader2, Utensils, Sunset, Moon, TrendingUp } from 'lucide-react';

type RangeKey = 'today' | 'week' | 'month' | 'custom';

export default function DashboardPage() {
  const { dataList, loading } = useDataHarian();
  const [range, setRange] = useState<RangeKey>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { filtered, startDate, endDate } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    let start: string;
    let end: string;

    if (range === 'today') {
      start = todayStr;
      end = todayStr;
    } else if (range === 'week') {
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      start = monday.toISOString().slice(0, 10);
      end = sunday.toISOString().slice(0, 10);
    } else if (range === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else {
      start = customStart || '1900-01-01';
      end = customEnd || todayStr;
    }

    const filtered = dataList.filter((d) => d.tanggal >= start && d.tanggal <= end);
    return { filtered, startDate: start, endDate: end };
  }, [dataList, range, customStart, customEnd]);

  const totals = useMemo(() => {
    let siang = 0, sore = 0, malam = 0;
    for (const d of filtered) {
      siang += d.hasil_makan_siang;
      sore += d.hasil_makan_sore;
      malam += d.hasil_makan_malam;
    }
    return { siang, sore, malam, total: siang + sore + malam };
  }, [filtered]);

  // Group by date for table and chart
  const byDate = useMemo(() => {
    const map = new Map<string, { siang: number; sore: number; malam: number; total: number }>();
    for (const d of filtered) {
      const entry = map.get(d.tanggal) ?? { siang: 0, sore: 0, malam: 0, total: 0 };
      entry.siang += d.hasil_makan_siang;
      entry.sore += d.hasil_makan_sore;
      entry.malam += d.hasil_makan_malam;
      entry.total = entry.siang + entry.sore + entry.malam;
      map.set(d.tanggal, entry);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // Chart max for scaling
  const chartMax = Math.max(1, ...byDate.map(([, v]) => v.total));

  const exportCSV = () => {
    const headers = ['Tanggal', 'Makan Siang', 'Makan Sore', 'Makan Malam', 'Total'];
    const rows = byDate.map(([date, v]) => [date, v.siang, v.sore, v.malam, v.total]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-makan-${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const cards = [
    { label: 'Makan Siang', value: totals.siang, icon: Utensils, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700' },
    { label: 'Makan Sore', value: totals.sore, icon: Sunset, color: 'from-orange-400 to-red-500', bg: 'bg-orange-50', text: 'text-orange-700' },
    { label: 'Makan Malam', value: totals.malam, icon: Moon, color: 'from-indigo-400 to-blue-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
    { label: 'Total Keseluruhan', value: totals.total, icon: TrendingUp, color: 'from-emerald-400 to-green-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard / Rekap</h1>
          <p className="text-sm text-slate-500">Ringkasan total perhitungan makan</p>
        </div>
      </div>

      {/* Range selector */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          ['today', 'Hari Ini'],
          ['week', 'Minggu Ini'],
          ['month', 'Bulan Ini'],
          ['custom', 'Custom'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              range === key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
        {range === 'custom' && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
            <span className="text-slate-400 text-sm">s/d</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}
        <button
          onClick={exportCSV}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition-all"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.text}`}>{card.value.toLocaleString('id-ID')}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {byDate.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Grafik Tren Total Makan per Hari</h2>
          <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
            {byDate.map(([date, v]) => (
              <div key={date} className="flex flex-col items-center gap-1 min-w-[40px] flex-1">
                <span className="text-xs font-bold text-slate-600">{v.total}</span>
                <div className="w-full flex flex-col justify-end" style={{ height: '140px' }}>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-amber-500 to-orange-400 transition-all hover:from-amber-600 hover:to-orange-500"
                    style={{ height: `${(v.total / chartMax) * 100}%`, minHeight: '4px' }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recap table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Rekap per Tanggal</h2>
        </div>
        {byDate.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Tidak ada data dalam rentang tanggal ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                  <th className="px-4 py-3 text-center font-semibold">Makan Siang</th>
                  <th className="px-4 py-3 text-center font-semibold">Makan Sore</th>
                  <th className="px-4 py-3 text-center font-semibold">Makan Malam</th>
                  <th className="px-4 py-3 text-center font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byDate.map(([date, v]) => (
                  <tr key={date} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{v.siang || '–'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{v.sore || '–'}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{v.malam || '–'}</td>
                    <td className="px-4 py-3 text-center font-bold text-orange-600">{v.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 py-3 text-slate-800">Total</td>
                  <td className="px-4 py-3 text-center text-slate-800">{totals.siang}</td>
                  <td className="px-4 py-3 text-center text-slate-800">{totals.sore}</td>
                  <td className="px-4 py-3 text-center text-slate-800">{totals.malam}</td>
                  <td className="px-4 py-3 text-center text-orange-600">{totals.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
