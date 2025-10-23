import { logDbStatus, useSQLiteContext } from '@/database/db';
import { getAllDebtors } from '@/database/debtorService';
import { Debtor } from '@/types/debtor';
import { useEffect, useState } from 'react';

export function useDebtors() {
  const db = useSQLiteContext();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDebtors = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      // Add small delay on retry to allow DB to stabilize
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
      }
      
      await logDbStatus(db, `useDebtors:attempt-${retryCount}`);
      const data = await getAllDebtors(db);
      setDebtors(data);
    } catch (err: any) {
      console.error('[useDebtors] Error loading debtors:', err);
      
      // Retry up to 2 times if it's a database error
      if (retryCount < 2 && (
        err?.message?.includes('NativeDatabase') || 
        err?.message?.includes('closed resource') ||
        err?.message?.includes('NullPointerException')
      )) {
        console.log(`[useDebtors] Retrying... (attempt ${retryCount + 1})`);
        return loadDebtors(retryCount + 1);
      }
      
      setError('Failed to load debtors');
      setDebtors([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebtors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { debtors, loading, error, reload: loadDebtors, db };
}
