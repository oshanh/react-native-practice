import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { listBackupFiles as listDriveBackups } from '../../utils/googleDriveService';
import { isSignedInToGoogleDrive, getAccessToken, getOrCreateBackupFolder } from '../../utils/googleDriveService';

export default function BackupsScreen() {
  const [localBackups, setLocalBackups] = useState<any[]>([]);
  const [driveBackups, setDriveBackups] = useState<any[]>([]);
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

  return (
    <View style={styles.container}>
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
});
