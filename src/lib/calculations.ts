import type { Shift, JettyName, VariabelDasar, HasilPerhitungan } from './types';

export function getBaseJetty(jetty: JettyName, variabel: VariabelDasar): number {
  switch (jetty) {
    case 'Jetty 1': return variabel.jetty1;
    case 'Jetty 2': return variabel.jetty2;
    case 'Jetty 3': return variabel.jetty3;
  }
}

export function getTotalTambahanTetap(variabel: VariabelDasar): number {
  return variabel.safety + variabel.jubir;
}

export function hitungPerhitungan(
  shift: Shift,
  baseJetty: number,
  cuti: number,
  sakitPanjang: number,
  izin: number,
  pelatihanSio: number,
  offSteadyDay: number,
  cutiSteadyDay: number,
  reguler: number,
  totalTambahanTetap: number,
): HasilPerhitungan {
  const totalPengurang = cuti + sakitPanjang + izin + pelatihanSio;

  const regulerDisesuaikan = shift === 'Pagi'
    ? reguler - offSteadyDay - cutiSteadyDay
    : 0;

  let makanSiang = 0;
  let makanSore = 0;
  let makanMalam = 0;

  if (shift === 'Pagi') {
    makanSiang = baseJetty - totalPengurang + totalTambahanTetap + regulerDisesuaikan;
    makanSore = makanSiang - regulerDisesuaikan;
  } else {
    makanMalam = baseJetty - totalPengurang + totalTambahanTetap;
  }

  return {
    makanSiang,
    makanSore,
    makanMalam,
    total: makanSiang + makanSore + makanMalam,
    totalPengurang,
    regulerDisesuaikan,
  };
}
