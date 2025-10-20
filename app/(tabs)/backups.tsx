import { useSQLiteContext } from '@/database/db';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View,Alert, DevSettings,TouchableOpacity } from 'react-native';
import { getAccessToken, getOrCreateBackupFolder, isSignedInToGoogleDrive,restoreLatestBackupFromGoogleDrive, listBackupFiles as listDriveBackups } from '../../utils/googleDriveService';
import { backupNow, getLastBackupTimestamp, resolveDatabasePath } from '../../utils/backupV2';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';



export default function BackupsScreen() {
  const db = useSQLiteContext();
  const [localBackups, setLocalBackups] = useState<any[]>([]);
  const [driveBackups, setDriveBackups] = useState<any[]>([]);
  const [sqliteFiles, setSqliteFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // List local backups
        const DOC_DIR = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
        const BACKUP_DIR = `${DOC_DIR}backups/`;
        let localFiles: any[] = [];
        try {
          const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
          localFiles = await Promise.all(files.map(async (name) => {
            const info = await FileSystem.getInfoAsync(BACKUP_DIR + name);
            return { name, ...info };
          }));
        } catch {}
        setLocalBackups(localFiles);

        // List all files in SQLite directory
        const SQLITE_DIR = `${DOC_DIR}SQLite/`;
        let sqliteListing: string[] = [];
        try {
          sqliteListing = await FileSystem.readDirectoryAsync(SQLITE_DIR);
        } catch {}
        setSqliteFiles(sqliteListing);

        // List Google Drive backups
        let driveFiles: any[] = [];
        const signedIn = await isSignedInToGoogleDrive();
        if (signedIn) {
          const accessToken = await getAccessToken();
          const folderId = await getOrCreateBackupFolder(accessToken);
          driveFiles = await listDriveBackups(accessToken, folderId);
        }
        setDriveBackups(driveFiles);
      } catch (e: any) {
        setError(e?.message || 'Failed to load backups');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRestoreBackup = async () => {
    
      try {
        // Flush and close DB before overwriting the file
        try {
          console.log('[Restore] Running WAL checkpoint before close...');
          await db.execAsync?.("PRAGMA wal_checkpoint(TRUNCATE);");
        } catch (e) {
          console.log('[Restore] wal_checkpoint failed (ok to ignore):', e);
        }
        try {
          console.log('[Restore] Closing SQLite database before restore...');
          await (db as any)?.closeAsync?.();
          // tiny delay to ensure file handles are released
          await new Promise((r) => setTimeout(r, 150));
        } catch (e) {
          console.log('[Restore] closeAsync failed (ok to ignore):', e);
        }
  
        const DOC_DIR = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
        const SQLITE_DIR = `${DOC_DIR}SQLite/`;
        // Determine the actual DB file currently used on this device
        const DB_PATH = await resolveDatabasePath();
        const ALT_DB_PATH = DB_PATH.endsWith('.db') ? DB_PATH.slice(0, -3) : `${DB_PATH}.db`;
        console.log('[Restore] SQLite dir:', SQLITE_DIR);
        try {
          const listing = await FileSystem.readDirectoryAsync(SQLITE_DIR);
          console.log('[Restore] SQLite listing BEFORE:', listing);
        } catch (e) {
          console.log('[Restore] Failed to list SQLite dir BEFORE:', e);
        }
    const beforeInfo = await FileSystem.getInfoAsync(DB_PATH);
    console.log('[Restore] DB_PATH used for restore:', DB_PATH, 'info:', JSON.stringify(beforeInfo));
    try { console.log('[Restore] ALT_DB_PATH:', ALT_DB_PATH, 'info:', JSON.stringify(await FileSystem.getInfoAsync(ALT_DB_PATH))); } catch {}
  
        // Ensure no leftover files before restore
        for (const p of [DB_PATH, ALT_DB_PATH]) {
          try { await FileSystem.deleteAsync(p, { idempotent: true }); } catch {}
          try { await FileSystem.deleteAsync(`${p}-wal`, { idempotent: true }); } catch {}
          try { await FileSystem.deleteAsync(`${p}-shm`, { idempotent: true }); } catch {}
        }
  
        // Try Google Drive restore first
        const signedIn = await isSignedInToGoogleDrive();
        if (signedIn) {
          const ok = await restoreLatestBackupFromGoogleDrive(DB_PATH);
          if (ok) {
            // Also copy to alternate filename variant to cover both (with and without .db)
            if (ALT_DB_PATH !== DB_PATH) {
              try {
                await FileSystem.copyAsync({ from: DB_PATH, to: ALT_DB_PATH });
                console.log('[Restore] Also copied to ALT path:', ALT_DB_PATH);
              } catch (e) {
                console.log('[Restore] Skipped copying to ALT path:', ALT_DB_PATH, e);
              }
            }
            // Remove any WAL/SHM files to prevent stale state
            const walCandidates = [DB_PATH, ALT_DB_PATH];
            for (const p of walCandidates) {
              try { await FileSystem.deleteAsync(`${p}-wal`, { idempotent: true }); } catch {}
              try { await FileSystem.deleteAsync(`${p}-shm`, { idempotent: true }); } catch {}
            }
            try {
              const listingAfter = await FileSystem.readDirectoryAsync(SQLITE_DIR);
              console.log('[Restore] SQLite listing AFTER:', listingAfter);
            } catch {}
            const afterInfo = await FileSystem.getInfoAsync(DB_PATH);
            console.log('[Restore] DB_PATH AFTER restore info:', JSON.stringify(afterInfo));
            try { console.log('[Restore] ALT_DB_PATH AFTER restore info:', JSON.stringify(await FileSystem.getInfoAsync(ALT_DB_PATH))); } catch {}
            Alert.alert(
              'Restore complete',
              'Latest backup from Google Drive restored. The app will reload to apply changes.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    try { DevSettings.reload(); } catch {}
                  },
                },
              ]
            );
            
            return;
          }
        }
        // Fallback: Pick a local file
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/x-sqlite3',
          copyToCacheDirectory: true,
        });
        if (!result?.assets?.[0]?.uri || result.canceled) return;
        const uri = result.assets[0].uri;
        await FileSystem.copyAsync({ from: uri, to: DB_PATH });
        if (ALT_DB_PATH !== DB_PATH) {
          try { await FileSystem.copyAsync({ from: DB_PATH, to: ALT_DB_PATH }); } catch {}
        }
        try { await FileSystem.deleteAsync(`${DB_PATH}-wal`, { idempotent: true }); } catch {}
        try { await FileSystem.deleteAsync(`${DB_PATH}-shm`, { idempotent: true }); } catch {}
        Alert.alert(
          'Restore complete',
          'Backup restored from local file. The app will reload to apply changes.',
          [
            { text: 'OK', onPress: () => { try { DevSettings.reload(); } catch {} } },
          ]
        );
      } catch (e: any) {
        Alert.alert('Restore failed', e?.message ?? 'Unknown error');
      }
    };

  return (
    <View style={styles.container}>
      
      <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestoreBackup}
              accessibilityRole="button"
              accessibilityLabel="Restore backup"
            >
              <Text>Restore Last Backup</Text>
              <Ionicons name="cloud-download-outline" size={20} color="#fff" />
            </TouchableOpacity>


      <Text style={styles.header}>SQLite Directory Files</Text>
      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={sqliteFiles}
          keyExtractor={item => item}
          ListEmptyComponent={<Text style={styles.empty}>No files found in SQLite directory.</Text>}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.name}>{item}</Text>
            </View>
          )}
        />
      )}
      <Text style={styles.header}>Local Backups</Text>
      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={localBackups}
          keyExtractor={item => item.name}
          ListEmptyComponent={<Text style={styles.empty}>No local backups found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>Size: {item.size} bytes</Text>
              <Text style={styles.meta}>Modified: {item.modificationTime ? new Date(item.modificationTime * 1000).toLocaleString() : '-'}</Text>
            </View>
          )}
        />
      )}
      <Text style={styles.header}>Google Drive Backups</Text>
      {loading ? <ActivityIndicator /> : (
        <FlatList
          data={driveBackups}
          keyExtractor={item => item.id || item.name}
          ListEmptyComponent={<Text style={styles.empty}>No Google Drive backups found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>Created: {item.createdTime ? new Date(item.createdTime).toLocaleString() : '-'}</Text>
              <Text style={styles.meta}>Modified: {item.modifiedTime ? new Date(item.modifiedTime).toLocaleString() : '-'}</Text>
              <Text style={styles.meta}>ID: {item.id}</Text>
            </View>
          )}
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  item: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16, fontWeight: '500' },
  meta: { fontSize: 12, color: '#666' },
  empty: { color: '#aaa', fontStyle: 'italic', marginVertical: 8 },
  error: { color: 'red', marginTop: 16 },
   restoreButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
