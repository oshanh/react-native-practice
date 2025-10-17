// Example usage of the debtorService with prepared statements

import { useSQLiteContext } from '@/database/db';
import { addDebtor, getAllDebtors, updateDebtorBalance } from '@/database/debtorService';

// In your component:
export function ExampleComponent() {
  const db = useSQLiteContext(); // Use the hook from expo-sqlite

  const example = async () => {
    try {
      // Add a new debtor with multiple phone numbers
      const debtorId = await addDebtor(
        db,
        'John Doe',
        ['+1234567890', '+0987654321'],
        100.50
      );
      console.log('Created debtor with ID:', debtorId);

      // Get all debtors
      const debtors = await getAllDebtors(db);
      console.log('All debtors:', debtors);

      // Update balance
      await updateDebtorBalance(db, debtorId, 150.75);
      console.log('Balance updated');
    } catch (error) {
      console.error('Database error:', error);
    }
  };

  return null; // Your component JSX here
}
