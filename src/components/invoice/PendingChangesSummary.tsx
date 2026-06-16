import React from 'react';
import { Info } from 'lucide-react';
import { useInvoiceEditStore } from '../../store/useInvoiceEditStore';

export default function PendingChangesSummary() {
  const { state } = useInvoiceEditStore();
  if (!state) return null;

  const newCount = state.items.filter((i) => i._action === 'new').length;
  const updatedCount = state.items.filter((i) => i._action === 'updated').length;
  const deletedCount = state.items.filter((i) => i._action === 'deleted').length;

  const hasAnyItemChange = newCount + updatedCount + deletedCount > 0;
  if (!hasAnyItemChange) return null;

  return (
    <div className="bg-indigo-950/30 border border-indigo-900/60 rounded-xl p-4 flex items-start gap-2.5 shadow-md">
      <Info className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
      <div className="text-indigo-300 text-xs space-y-1">
        <p className="font-semibold text-indigo-200">تعديلات معلّقة على البنود (لم تُحفظ بعد):</p>
        <div className="space-y-0.5">
          {newCount > 0 && <p>• {newCount} صنف جديد مضاف</p>}
          {updatedCount > 0 && <p>• {updatedCount} صنف تم تعديله</p>}
          {deletedCount > 0 && <p>• {deletedCount} صنف سيتم حذفه عند الحفظ</p>}
        </div>
      </div>
    </div>
  );
}
