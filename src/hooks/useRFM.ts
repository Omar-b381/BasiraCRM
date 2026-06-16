import { useState, useCallback } from 'react';
import { runRFMAnalysis, InvoiceRecord } from '../lib/rfm';
import { useContactsStore } from '../store/useContactsStore';
import type { Contact } from '../types/contact.types';

export function useRFM() {
  const { fetchContacts } = useContactsStore();
  const [analyzedContacts, setAnalyzedContacts] = useState<Contact[]>([]);
  const [segmentAffinities, setSegmentAffinities] = useState<any>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async (dateRange?: { from?: string; to?: string }) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      // 1. جلب جهات الاتصال الأساسية من قاعدة البيانات
      await fetchContacts();
      const currentContacts = useContactsStore.getState().contacts;

      // 2. جلب فواتير المبيعات (مع عناصر الفواتير invoice_items) للتحليل
      const res = await window.electronAPI.db.getRFMData(dateRange);
      if (!res.success) {
        throw new Error(res.error || 'فشل جلب فواتير المبيعات من قاعدة البيانات');
      }

      // 3. تشغيل خوارزمية RFM وحساب تكرار المنتجات
      const invoices: InvoiceRecord[] = res.data;
      const { contactsWithScores, segmentAffinities: affinities } = runRFMAnalysis(invoices, currentContacts);

      setAnalyzedContacts(contactsWithScores);
      setSegmentAffinities(affinities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء تحليل RFM');
    } finally {
      setIsAnalyzing(false);
    }
  }, [fetchContacts]);

  return {
    analyzedContacts,
    segmentAffinities,
    isAnalyzing,
    error,
    runAnalysis
  };
}
