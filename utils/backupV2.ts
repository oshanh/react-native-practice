import * as FileSystem from 'expo-file-system/legacy';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sharing: any = require('expo-sharing');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Constants: any = require('expo-constants');

const DOC_DIR = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
const SQLITE_DIR = `${DOC_DIR}SQLite/`;
const BACKUP_DIR = `${DOC_DIR}backups/`;
const DB_CANDIDATES = ['debitmanager', 'debitmanager.db'];

async function ensureDir(uri: string) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
    }
  } catch (e) {
    console.warn('ensureDir:', e);
  }
}

export async function resolveDatabasePath(): Promise<string> {
  // Try each candidate
  for (const name of DB_CANDIDATES) {
    const candidate = SQLITE_DIR + name;
    try {
      const info = await FileSystem.getInfoAsync(candidate);
      if (info.exists && !info.isDirectory) {
        return candidate;
      }
    } catch {
      continue;
    }
  }
  
  // Fallback: list files
  try {
    const listing = await FileSystem.readDirectoryAsync(SQLITE_DIR);
    const match = listing.find((f: string) => f.startsWith('debitmanager'));
    if (match) return SQLITE_DIR + match;
  } catch {}
  
  throw new Error('Database file not found in SQLite directory.');
}

function timestamp(): string {
  const d = new Date();
  const iso = d.toISOString();
  return iso.replaceAll(':', '-').replaceAll('.', '-');
}

export async function backupDatabase(): Promise<{ uri: string }> {
  const dbPath = await resolveDatabasePath();
  await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  const dest = `${BACKUP_DIR}debitmanager-${timestamp()}.db`;
  
  await FileSystem.copyAsync({ from: dbPath, to: dest });
  
  return { uri: dest };
}

export async function shareBackup(uri: string): Promise<boolean> {
  const available = await Sharing.isAvailableAsync();
  if (!available) return false;
  
  // On Android, this will show Google Drive, OneDrive, etc. in the share sheet
  await Sharing.shareAsync(uri, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Save Backup to Cloud',
  });
  
  return true;
}

export async function uploadBackupIfConfigured(uri: string): Promise<boolean> {
  const extra: any = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};
  const uploadUrl: string | undefined = extra?.backup?.uploadUrl;
  const authToken: string | undefined = extra?.backup?.authToken;
  
  if (!uploadUrl) return false;
  
  try {
    const content = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Decode base64 to binary for upload
    const binaryString = atob(content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      // eslint-disable-next-line unicorn/prefer-code-point
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: bytes,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return true;
  } catch (e) {
    console.warn('Backup upload failed:', e);
    return false;
  }
}

export async function backupNow(): Promise<{ uri: string; uploaded: boolean; shared: boolean }> {
  const { uri } = await backupDatabase();
  const uploaded = await uploadBackupIfConfigured(uri);
  let shared = false;
  
  if (!uploaded) {
    // Fallback to share sheet - user can choose Google Drive
    try {
      shared = await shareBackup(uri);
    } catch (e) {
      console.warn('Share failed:', e);
    }
  }
  
  return { uri, uploaded, shared };
}

