import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { VariabelDasar, DataHarian } from '@/lib/types';

export function useVariabelDasar() {
  const [variabel, setVariabel] = useState<VariabelDasar | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVariabel = useCallback(async () => {
    const { data, error } = await supabase
      .from('variabel_dasar')
      .select('*')
      .maybeSingle();
    if (error) {
      console.error('Error fetching variabel:', error);
    } else {
      setVariabel(data as VariabelDasar);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchVariabel();
  }, [fetchVariabel]);

  return { variabel, loading, refetch: fetchVariabel };
}

export function useDataHarian() {
  const [dataList, setDataList] = useState<DataHarian[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from('data_harian')
      .select('*')
      .order('tanggal', { ascending: true })
      .order('shift', { ascending: false });
    if (error) {
      console.error('Error fetching data harian:', error);
    } else {
      // Shift "Pagi" > "Malam" alphabetically, so ascending=false puts Pagi first
      setDataList((data as DataHarian[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { dataList, loading, refetch: fetchData };
}
