import { useSQLiteContext } from '@/database/db';
import { getAllDebtors } from '@/database/debtorService';
import { Debtor } from '@/types/debtor';
import { useEffect, useState } from 'react';

export function useDebtors() {
  const db = useSQLiteContext();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDebtors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllDebtors(db);
      setDebtors(data);
    } catch (err) {
      setError('Failed to load debtors');
      // Optionally rethrow or log
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
