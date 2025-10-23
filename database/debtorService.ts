// Add a transaction (debt or received payment)
export const addTransaction = async (
  db: SQLiteDatabase,
  debtorId: number,
  type: 'IN' | 'OUT',
  date: string,
  time: string,
  amount: number,
  note?: string
): Promise<number> => {
  if (!db) {
    console.warn('[addTransaction] Database is null, cannot add transaction');
    throw new Error('Database not available');
  }
  
  try {
    const stmt = await db.prepareAsync(
      'INSERT INTO transactions (debtor_id, type, date, time, amount, note) VALUES (?, ?, ?, ?, ?, ?)'
    );
    try {
      const result = await stmt.executeAsync([
        debtorId,
        type,
        date,
        time,
        amount,
        note ?? null
      ]);
      return result.lastInsertRowId;
    } finally {
      await stmt.finalizeAsync();
    }
  } catch (error: any) {
    console.error('[addTransaction] Error adding transaction:', error);
    if (error?.message?.includes('NativeDatabase') || error?.message?.includes('closed resource')) {
      throw new Error('Database not available. Please try again.');
    }
    throw error;
  }
};

// Get all transactions for a debtor, optionally filtered by type
export const getTransactionsForDebtor = async (
  db: SQLiteDatabase,
  debtorId: number,
  type?: 'IN' | 'OUT'
): Promise<Array<{
  id: number;
  type: 'IN' | 'OUT';
  date: string;
  time: string;
  amount: number;
  note: string | null;
  created_at: string;
}>> => {
  if (!db) {
    console.warn('[getTransactionsForDebtor] Database is null, returning empty array');
    return [];
  }
  
  try {
    let query = 'SELECT * FROM transactions WHERE debtor_id = ?';
    const params: any[] = [debtorId];
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    query += ' ORDER BY date DESC, time DESC';
    const stmt = await db.prepareAsync(query);
    try {
      const result = await stmt.executeAsync(params);
      return await result.getAllAsync() as Array<{
        id: number;
        type: 'IN' | 'OUT';
        date: string;
        time: string;
        amount: number;
        note: string | null;
        created_at: string;
      }>;
    } finally {
      await stmt.finalizeAsync();
    }
  } catch (error: any) {
    console.error('[getTransactionsForDebtor] Error fetching transactions:', error);
    const msg = String(error?.message ?? error);
    if (msg.includes('NativeDatabase') || msg.includes('NullPointerException') || msg.includes('closed resource')) {
      console.warn('[getTransactionsForDebtor] Database not available, requesting provider refresh');
      try {
        await refreshSQLiteProvider();
        console.log('[getTransactionsForDebtor] refreshSQLiteProvider resolved');
      } catch (e) {
        console.warn('[getTransactionsForDebtor] refreshSQLiteProvider failed:', e);
      }
      return [];
    }
    throw error;
  }
};
import { refreshSQLiteProvider } from '@/database/db';
import { Debtor } from '@/types/debtor';
import type { SQLiteDatabase } from 'expo-sqlite';

// Add a new debtor with phone numbers using prepared statements
export const addDebtor = async (
  db: SQLiteDatabase,
  name: string,
  phoneNumbers: string[],
  balance: number = 0
): Promise<number> => {
  if (!db) {
    console.warn('[addDebtor] Database is null, cannot add debtor');
    throw new Error('Database not available');
  }
  
  try {
    // Use prepared statement for inserting debtor
    const insertDebtorStmt = await db.prepareAsync(
      'INSERT INTO debtors (name, balance) VALUES (?, ?)'
    );
    
    try {
      const result = await insertDebtorStmt.executeAsync([name, balance]);
      const debtorId = result.lastInsertRowId;

      // Use prepared statement for inserting phone numbers
      const insertPhoneStmt = await db.prepareAsync(
        'INSERT INTO phone_numbers (debtor_id, phone_number) VALUES (?, ?)'
      );
      
      try {
        for (const phoneNumber of phoneNumbers) {
          await insertPhoneStmt.executeAsync([debtorId, phoneNumber]);
        }
      } finally {
        await insertPhoneStmt.finalizeAsync();
      }

      return debtorId;
    } finally {
      await insertDebtorStmt.finalizeAsync();
    }
  } catch (error: any) {
    console.error('[addDebtor] Error adding debtor:', error);
    if (error?.message?.includes('NativeDatabase') || error?.message?.includes('closed resource')) {
      throw new Error('Database not available. Please try again.');
    }
    throw error;
  }
};

// Get all debtors with their phone numbers using prepared statements
export const getAllDebtors = async (db: SQLiteDatabase): Promise<Debtor[]> => {
  // Check if DB is accessible before attempting query
  if (!db) {
    console.warn('[getAllDebtors] Database connection is null or undefined');
    return [];
  }

  try {
    const debtorsStmt = await db.prepareAsync(
      'SELECT * FROM debtors ORDER BY name ASC'
    );
    
    try {
      const result = await debtorsStmt.executeAsync();
      const debtors = await result.getAllAsync() as {
        id: number;
        name: string;
        balance: number;
        created_at: string;
        updated_at: string;
      }[];

      // Prepare statement for fetching phone numbers
      const phonesStmt = await db.prepareAsync(
        'SELECT phone_number FROM phone_numbers WHERE debtor_id = ?'
      );

      try {
        // Fetch phone numbers for each debtor sequentially to avoid reuse issues
        const debtorsWithPhones: Debtor[] = [];
        for (const debtor of debtors) {
          const phoneResult = await phonesStmt.executeAsync([debtor.id]);
          const phones = await phoneResult.getAllAsync() as { phone_number: string }[];

          debtorsWithPhones.push({
            id: debtor.id,
            name: debtor.name,
            phoneNumbers: phones.map(p => p.phone_number),
            balance: debtor.balance,
            createdAt: debtor.created_at,
            updatedAt: debtor.updated_at,
          });
        }

        return debtorsWithPhones;
      } finally {
        await phonesStmt.finalizeAsync();
      }
    } finally {
      await debtorsStmt.finalizeAsync();
    }
  } catch (error: any) {
    console.error('[getAllDebtors] Error fetching debtors:', error);
    const msg = String(error?.message ?? error);
    if (msg.includes('NativeDatabase') || msg.includes('NullPointerException') || msg.includes('closed resource')) {
      console.warn('[getAllDebtors] Database not available, requesting provider refresh');
      try {
        await refreshSQLiteProvider();
        console.log('[getAllDebtors] refreshSQLiteProvider resolved');
      } catch (e) {
        console.warn('[getAllDebtors] refreshSQLiteProvider failed:', e);
      }
      return [];
    }
    throw error;
  }
};

// Get a single debtor by ID using prepared statements
export const getDebtorById = async (
  db: SQLiteDatabase,
  id: number
): Promise<Debtor | null> => {
  try {
    // Check if DB is accessible before attempting query
    if (!db) {
      console.warn('[getDebtorById] Database connection is null or undefined');
      return null;
    }

    const debtorStmt = await db.prepareAsync(
      'SELECT * FROM debtors WHERE id = ?'
    );
    
    try {
      const result = await debtorStmt.executeAsync([id]);
      const debtor = await result.getFirstAsync() as {
        id: number;
        name: string;
        balance: number;
        created_at: string;
        updated_at: string;
      } | null;

      if (!debtor) return null;

      const phonesStmt = await db.prepareAsync(
        'SELECT phone_number FROM phone_numbers WHERE debtor_id = ?'
      );
      
      try {
        const phoneResult = await phonesStmt.executeAsync([id]);
        const phones = await phoneResult.getAllAsync() as { phone_number: string }[];

        return {
          id: debtor.id,
          name: debtor.name,
          phoneNumbers: phones.map(p => p.phone_number),
          balance: debtor.balance,
          createdAt: debtor.created_at,
          updatedAt: debtor.updated_at,
        };
      } finally {
        await phonesStmt.finalizeAsync();
      }
    } finally {
      await debtorStmt.finalizeAsync();
    }
  } catch (error: any) {
    console.error('[getDebtorById] Error fetching debtor:', error);
    const msg = String(error?.message ?? error);
    if (msg.includes('NativeDatabase') || msg.includes('NullPointerException') || msg.includes('closed resource')) {
      console.warn('[getDebtorById] Database not available, requesting provider refresh');
      try {
        await refreshSQLiteProvider();
        console.log('[getDebtorById] refreshSQLiteProvider resolved');
      } catch (e) {
        console.warn('[getDebtorById] refreshSQLiteProvider failed:', e);
      }
      return null;
    }
    throw error;
  }
};

// Update debtor information using prepared statements
export const updateDebtor = async (
  db: SQLiteDatabase,
  id: number,
  name: string,
  phoneNumbers: string[],
  balance: number
): Promise<void> => {
  if (!db) {
    console.warn('[updateDebtor] Database is null, cannot update debtor');
    throw new Error('Database not available');
  }
  
  try {
    // Update debtor using prepared statement
    const updateStmt = await db.prepareAsync(
      'UPDATE debtors SET name = ?, balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    
    try {
      await updateStmt.executeAsync([name, balance, id]);
    } finally {
      await updateStmt.finalizeAsync();
    }

    // Delete existing phone numbers
    const deleteStmt = await db.prepareAsync(
      'DELETE FROM phone_numbers WHERE debtor_id = ?'
    );
    
    try {
      await deleteStmt.executeAsync([id]);
    } finally {
      await deleteStmt.finalizeAsync();
    }

    // Insert new phone numbers
    const insertStmt = await db.prepareAsync(
      'INSERT INTO phone_numbers (debtor_id, phone_number) VALUES (?, ?)'
    );
    
    try {
      for (const phoneNumber of phoneNumbers) {
        await insertStmt.executeAsync([id, phoneNumber]);
      }
    } finally {
      await insertStmt.finalizeAsync();
    }
  } catch (error: any) {
    console.error('[updateDebtor] Error updating debtor:', error);
    if (error?.message?.includes('NativeDatabase') || error?.message?.includes('closed resource')) {
      throw new Error('Database not available. Please try again.');
    }
    throw error;
  }
};

// Delete a debtor using prepared statements (cascade will delete phone numbers automatically)
export const deleteDebtor = async (
  db: SQLiteDatabase,
  id: number
): Promise<void> => {
  if (!db) {
    console.warn('[deleteDebtor] Database is null, cannot delete debtor');
    throw new Error('Database not available');
  }
  
  try {
    const stmt = await db.prepareAsync('DELETE FROM debtors WHERE id = ?');
    try {
      await stmt.executeAsync([id]);
    } finally {
      await stmt.finalizeAsync();
    }
  } catch (error: any) {
    console.error('[deleteDebtor] Error deleting debtor:', error);
    if (error?.message?.includes('NativeDatabase') || error?.message?.includes('closed resource')) {
      throw new Error('Database not available. Please try again.');
    }
    throw error;
  }
};

// Update debtor balance using prepared statements
export const updateDebtorBalance = async (
  db: SQLiteDatabase,
  id: number,
  newBalance: number
): Promise<void> => {
  if (!db) {
    console.warn('[updateDebtorBalance] Database is null, cannot update balance');
    throw new Error('Database not available');
  }
  
  try {
    const stmt = await db.prepareAsync(
      'UPDATE debtors SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    try {
      await stmt.executeAsync([newBalance, id]);
    } finally {
      await stmt.finalizeAsync();
    }
  } catch (error: any) {
    console.error('[updateDebtorBalance] Error updating balance:', error);
    if (error?.message?.includes('NativeDatabase') || error?.message?.includes('closed resource')) {
      throw new Error('Database not available. Please try again.');
    }
    throw error;
  }
};

// Get statistics for all debtors and transactions
export const getStatistics = async (
  db: SQLiteDatabase
): Promise<{
  totalBalance: number;
  totalIn: number;
  totalOut: number;
}> => {
  try {
    // Check if DB is accessible before attempting query
    if (!db) {
      console.warn('[getStatistics] Database connection is null or undefined');
      return { totalBalance: 0, totalIn: 0, totalOut: 0 };
    }

    // Get total balance from all debtors
    const balanceStmt = await db.prepareAsync(
      'SELECT COALESCE(SUM(balance), 0) as total FROM debtors'
    );
    let totalBalance = 0;
    try {
      const balanceResult = await balanceStmt.executeAsync();
      const balanceData = await balanceResult.getFirstAsync() as { total: number } | null;
      totalBalance = balanceData?.total ?? 0;
    } finally {
      await balanceStmt.finalizeAsync();
    }

    // Get total IN transactions
    const inStmt = await db.prepareAsync(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = ?'
    );
    let totalIn = 0;
    try {
      const inResult = await inStmt.executeAsync(['IN']);
      const inData = await inResult.getFirstAsync() as { total: number } | null;
      totalIn = inData?.total ?? 0;
    } finally {
      await inStmt.finalizeAsync();
    }

    // Get total OUT transactions
    const outStmt = await db.prepareAsync(
      'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = ?'
    );
    let totalOut = 0;
    try {
      const outResult = await outStmt.executeAsync(['OUT']);
      const outData = await outResult.getFirstAsync() as { total: number } | null;
      totalOut = outData?.total ?? 0;
    } finally {
      await outStmt.finalizeAsync();
    }

    return {
      totalBalance,
      totalIn,
      totalOut,
    };
  } catch (error: any) {
    console.error('[getStatistics] Error fetching statistics:', error);
    // If DB is closed/null, try to request a provider remount and let caller retry
    const msg = String(error?.message ?? error);
    if (msg.includes('NativeDatabase') || msg.includes('NullPointerException') || msg.includes('closed resource')) {
        console.warn('[getStatistics] Database not available, requesting provider refresh');
        try {
          await refreshSQLiteProvider();
          console.log('[getStatistics] refreshSQLiteProvider resolved');
        } catch (e) {
          console.warn('[getStatistics] refreshSQLiteProvider failed:', e);
        }
    }
    // Re-throw so caller (which may have retry logic) can attempt again after provider remount
    throw error;
  }
};
