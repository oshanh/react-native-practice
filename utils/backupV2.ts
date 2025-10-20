import * as FileSystem from 'expo-file-system/legacy';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import {
    getAccessToken,
    getOrCreateBackupFolder,
    isSignedInToGoogleDrive,
    uploadFileToGoogleDrive,
} from './googleDriveService';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Sharing: any = require('expo-sharing');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Constants: any = require('expo-constants');

const DOC_DIR = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
const SQLITE_DIR = `${DOC_DIR}SQLite/`;
const BACKUP_DIR = `${DOC_DIR}backups/`;
const META_FILE = `${DOC_DIR}backup_meta.json`;
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
  // Try to flush WAL and close DB to ensure a consistent main DB file
  const filename = dbPath.split('/').pop() ?? 'debitmanager';
  const nameCandidates = [filename, filename.replace(/\.db$/i, '')];
  let flushed = false;
  for (const name of nameCandidates) {
    try {
      const db: SQLiteDatabase = await openDatabaseAsync(name);
      try {
        await db.execAsync("PRAGMA wal_checkpoint(TRUNCATE);");
      } catch {}
      try { await db.closeAsync?.(); } catch {}
      flushed = true;
      break;
    } catch {
      // try next candidate
    }
  }
  if (!flushed) {
    console.log('[Backup] Could not open DB to checkpoint WAL. Proceeding with copy.');
  } else {
    // small delay to ensure file handles released
    await new Promise((r) => setTimeout(r, 150));
  }
  await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });
  const dest = `${BACKUP_DIR}debitmanager-${timestamp()}.db`;
  // Log source info
  try {
    const info = await FileSystem.getInfoAsync(dbPath);
    console.log('[Backup] Source DB info:', JSON.stringify(info));
  } catch {}
  await FileSystem.copyAsync({ from: dbPath, to: dest });
  try {
    const info = await FileSystem.getInfoAsync(dest);
    console.log('[Backup] Backup file info:', JSON.stringify(info));
  } catch {}
  
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

export async function uploadToGoogleDrive(uri: string): Promise<boolean> {
  try {
    // Check if signed in to Google Drive
    const isSignedIn = await isSignedInToGoogleDrive();
    if (!isSignedIn) {
      console.log('Not signed in to Google Drive');
      return false;
    }

    // Get access token
    const accessToken = await getAccessToken();

    // Get or create backup folder
    const folderId = await getOrCreateBackupFolder(accessToken);

    // Get filename from URI
    const fileName = uri.split('/').pop() || `debitmanager-${timestamp()}.db`;

    // Upload to Google Drive
    await uploadFileToGoogleDrive(accessToken, uri, fileName, folderId);

    console.log('Backup uploaded to Google Drive successfully');
    return true;
  } catch (error) {
    console.error('Failed to upload to Google Drive:', error);
    return false;
  }
}

export async function setLastBackupTimestamp(date: Date): Promise<void> {
  try {
    const payload = JSON.stringify({ lastBackupISO: date.toISOString() });
    await FileSystem.writeAsStringAsync(META_FILE, payload, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch (e) {
    console.warn('Failed to write last backup timestamp:', e);
  }
}

export async function getLastBackupTimestamp(): Promise<Date | null> {
  try {
    const info = await FileSystem.getInfoAsync(META_FILE);
    if (!info.exists) return null;
    const content = await FileSystem.readAsStringAsync(META_FILE, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const json = JSON.parse(content);
    if (json?.lastBackupISO) {
      const d = new Date(json.lastBackupISO);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch (e) {
    console.warn('Failed to read last backup timestamp:', e);
    return null;
  }
}

export async function backupNow(): Promise<{ uri: string; uploaded: boolean; shared: boolean; googleDrive: boolean }> {
  const { uri } = await backupDatabase();
  // Record last backup time immediately after creating the local copy
  await setLastBackupTimestamp(new Date());
  
  // Try Google Drive first
  const googleDrive = await uploadToGoogleDrive(uri);
  if (googleDrive) {
    return { uri, uploaded: false, shared: false, googleDrive };
  }
  
  // Try configured upload endpoint
  const uploaded = await uploadBackupIfConfigured(uri);
  let shared = false;
  
  if (!uploaded) {
    // Fallback to share sheet - user can choose Google Drive manually
    try {
      shared = await shareBackup(uri);
    } catch (e) {
      console.warn('Share failed:', e);
    }
  }
  
  return { uri, uploaded, shared, googleDrive };
}

