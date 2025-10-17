
import type { SQLiteDatabase } from 'expo-sqlite';
import { useSQLiteContext } from 'expo-sqlite';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const DATABASE_VERSION = 1;
  let { user_version: currentDbVersion } = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  if (currentDbVersion >= DATABASE_VERSION) {
    return;
  }
  if (currentDbVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;
      CREATE TABLE debtors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE phone_numbers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debtor_id INTEGER NOT NULL,
        phone_number TEXT NOT NULL,
        FOREIGN KEY (debtor_id) REFERENCES debtors(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_debtor_id ON phone_numbers(debtor_id);
    `);
    currentDbVersion = 1;
  }
  // if (currentDbVersion === 1) {
  //   Add more migrations here
  // }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export { useSQLiteContext };

