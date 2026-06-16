import { useState, useCallback } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import type { ConnectionTestResult } from '../types/settings.types';

export function useConnectionTest() {
  const { testSupabase, testTwilio, testWebhook } = useSettingsStore();
  const [tests, setTests] = useState<Record<string, ConnectionTestResult>>({});

  const runTest = useCallback(
    async (service: 'supabase' | 'twilio' | 'webhook', config?: any) => {
      setTests((prev) => ({
        ...prev,
        [service]: { service, status: 'testing', message: 'جارٍ الفحص...' },
      }));

      let result: ConnectionTestResult;
      try {
        if (service === 'supabase') {
          result = await testSupabase(config);
        } else if (service === 'twilio') {
          result = await testTwilio(config);
        } else {
          result = await testWebhook();
        }
      } catch (err) {
        result = {
          service,
          status: 'failed',
          message: `فشل الاتصال: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`,
        };
      }

      setTests((prev) => ({ ...prev, [service]: result }));
      return result;
    },
    [testSupabase, testTwilio, testWebhook]
  );

  return {
    tests,
    runTest,
  };
}
