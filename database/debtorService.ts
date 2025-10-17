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
};
import { Debtor } from '@/types/debtor';
import type { SQLiteDatabase } from 'expo-sqlite';

// Add a new debtor with phone numbers using prepared statements
export const addDebtor = async (
  db: SQLiteDatabase,
  name: string,
  phoneNumbers: string[],
  balance: number = 0
): Promise<number> => {
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
  } catch (error) {
    console.error('Error adding debtor:', error);
    throw error;
  }
};

// Get all debtors with their phone numbers using prepared statements
export const getAllDebtors = async (db: SQLiteDatabase): Promise<Debtor[]> => {
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
        // Fetch phone numbers for each debtor
        const debtorsWithPhones = await Promise.all(
          debtors.map(async (debtor) => {
            const phoneResult = await phonesStmt.executeAsync([debtor.id]);
            const phones = await phoneResult.getAllAsync() as { phone_number: string }[];

            return {
              id: debtor.id,
              name: debtor.name,
              phoneNumbers: phones.map(p => p.phone_number),
              balance: debtor.balance,
              createdAt: debtor.created_at,
              updatedAt: debtor.updated_at,
            };
          })
        );

        return debtorsWithPhones;
      } finally {
        await phonesStmt.finalizeAsync();
      }
    } finally {
      await debtorsStmt.finalizeAsync();
    }
  } catch (error) {
    console.error('Error fetching debtors:', error);
    throw error;
  }
};

// Get a single debtor by ID using prepared statements
export const getDebtorById = async (
  db: SQLiteDatabase,
  id: number
): Promise<Debtor | null> => {
  try {
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
  } catch (error) {
    console.error('Error fetching debtor:', error);
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
  } catch (error) {
    console.error('Error updating debtor:', error);
    throw error;
  }
};

// Delete a debtor using prepared statements (cascade will delete phone numbers automatically)
export const deleteDebtor = async (
  db: SQLiteDatabase,
  id: number
): Promise<void> => {
  try {
    const stmt = await db.prepareAsync('DELETE FROM debtors WHERE id = ?');
    try {
      await stmt.executeAsync([id]);
    } finally {
      await stmt.finalizeAsync();
    }
  } catch (error) {
    console.error('Error deleting debtor:', error);
    throw error;
  }
};

// Update debtor balance using prepared statements
export const updateDebtorBalance = async (
  db: SQLiteDatabase,
  id: number,
  newBalance: number
): Promise<void> => {
  try {
    const stmt = await db.prepareAsync(
      'UPDATE debtors SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    try {
      await stmt.executeAsync([newBalance, id]);
    } finally {
      await stmt.finalizeAsync();
    }
  } catch (error) {
    console.error('Error updating balance:', error);
    throw error;
  }
};
