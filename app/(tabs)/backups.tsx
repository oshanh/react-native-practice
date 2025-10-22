import { useSQLiteContext } from '@/database/db';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { registerBackgroundBackup } from '../../utils/backgroundBackup';
import { backupNow, getLastBackupTimestamp, resolveDatabasePath } from '../../utils/backupV2';
import {
  getAccessToken,
  getCurrentUser,
  getOrCreateBackupFolder,
  initializeGoogleDrive,
  isSignedInToGoogleDrive,
  listBackupFiles as listDriveBackups,
  restoreLatestBackupFromGoogleDrive,
  signInToGoogleDrive,
  signOutFromGoogleDrive,
} from '../../utils/googleDriveService';
import { reloadApp } from '../../utils/reload';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Constants: any = require('expo-constants');

export default function BackupsScreen() {
  const db = useSQLiteContext();
  const [localBackups, setLocalBackups] = useState<any[]>([]);
  const [driveBackups, setDriveBackups] = useState<any[]>([]);
  const [sqliteFiles, setSqliteFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backupFrequency, setBackupFrequency] = useState<number>(360);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const frequencyOptions = [
    { label: '1 min', value: 1 },
    { label: '5 min', value: 5 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '6 hours', value: 360 },
    { label: '12 hours', value: 720 },
    { label: '24 hours', value: 1440 },
  ];

  useEffect(() => {
    initGoogleDrive();
  }, []);

  const initGoogleDrive = async () => {
    try {
      setInitializing(true);
      
      // HARDCODED for now - we can make this configurable later via env vars
      // This is needed because after prebuild, Constants.expoConfig may not have the extra config
      const webClientId = '188962916113-ga5ve15f5mvqv8smpkrieth2hk47vsua.apps.googleusercontent.com';
      
      console.log('[InitGoogleDrive] Using webClientId:', webClientId);
      
      // Only initialize if webClientId is available
      if (webClientId) {
        // Initialize Google Drive
        await initializeGoogleDrive({
          webClientId: webClientId,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        // Check if already signed in
        const signedIn = await isSignedInToGoogleDrive();
        setIsSignedIn(signedIn);

        if (signedIn) {
          try {
            const userInfo: any = await GoogleSignin.signInSilently();
            // Extract user object and email from userInfo.data.user
            const user = userInfo?.data?.user ?? {};
            const email = user?.email ?? null;
            setUser({ ...user, email });
          } catch (e) {
            // fallback to getCurrentUser
            console.error('[GoogleSignin] signInSilently failed, using getCurrentUser:', e);
            const currentUser: any = getCurrentUser();
            console.log('[GoogleSignin] getCurrentUser:', JSON.stringify(currentUser, null, 2));
            const email = currentUser?.email || currentUser?.user?.email || null;
            setUser({ ...currentUser, email });
          }
        }
      } else {
        console.warn('Google Drive webClientId not configured. Sign-in will be disabled.');
      }

      // Load backups after initialization
      await loadBackups();
    } catch (error: any) {
      console.error('Failed to initialize Google Drive:', error);
      const errorMsg = error?.message || 'Unknown error';
      if (errorMsg.includes('offline use requires server web ClientID')) {
        setError('Google Drive setup incomplete. Please check your configuration and rebuild the app.');
      } else {
        setError('Failed to initialize Google Drive');
      }
    } finally {
      setInitializing(false);
    }
  };

  const loadBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load backup frequency preference
      const savedFreq = await AsyncStorage.getItem('backupFrequency');
      if (savedFreq) {
        setBackupFrequency(Number.parseInt(savedFreq, 10));
      }

      // Load last backup timestamp
      const ts = await getLastBackupTimestamp();
      setLastBackup(ts);

      // Check sign-in status
      const signedIn = await isSignedInToGoogleDrive();
      setIsSignedIn(signedIn);

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
  };

  const handleFrequencyChange = async (minutes: number) => {
    try {
      setBackupFrequency(minutes);
      await AsyncStorage.setItem('backupFrequency', minutes.toString());
      await registerBackgroundBackup(minutes);
      Alert.alert('Success', `Backup frequency updated to every ${frequencyOptions.find(o => o.value === minutes)?.label}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update backup frequency');
    }
  };

  const handleBackupNow = async () => {
    try {
      const { uri, googleDrive } = await backupNow();
      await loadBackups(); // Refresh the list
      if (googleDrive) {
        Alert.alert('Backup complete', 'Backup uploaded to Google Drive successfully! ☁️');
      } else {
        Alert.alert('Backup saved', `Backup saved locally at ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Backup failed', e?.message ?? 'Unknown error');
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const { user: signedInUser } = await signInToGoogleDrive();
      setUser(signedInUser);
      setIsSignedIn(true);
      await loadBackups(); // Refresh to show Drive backups
      Alert.alert('Success', 'Signed in to Google Drive successfully!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in to Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOutFromGoogleDrive();
      setUser(null);
      setIsSignedIn(false);
      setDriveBackups([]); // Clear Drive backups
      Alert.alert('Success', 'Signed out from Google Drive');
    } catch (error: any) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'just now';
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const handleRestoreBackup = async () => {
      setIsRestoring(true);
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
            
            // Reload immediately to prevent "Access to closed resource" errors
            console.log('[Restore] Reloading app immediately...');
            await reloadApp();
            
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
        
        // Reload immediately to prevent "Access to closed resource" errors
        console.log('[Restore] Reloading app immediately...');
        await reloadApp();
      } catch (e: any) {
        setIsRestoring(false);
        Alert.alert('Restore failed', e?.message ?? 'Unknown error');
      }
    };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadBackups();
            setRefreshing(false);
          }}
          colors={["#3b82f6"]}
        />
      }
    >
      {initializing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Initializing...</Text>
        </View>
      ) : isRestoring ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Restoring backup...</Text>
          <Text style={[styles.loadingText, { fontSize: 14, marginTop: 8 }]}>
            App will reload automatically
          </Text>
        </View>
      ) : (
        <>
          {/* Google Drive Sign In/Out Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="logo-google" size={18} /> Google Drive
            </Text>
            {isSignedIn ? (
              <>
                <Text style={styles.infoText}>
                  ✓ Connected to Google Drive
                </Text>
                <Text style={styles.userEmail}>
                  {user?.email || 'Unknown'}
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.signOutButton]}
                  onPress={handleSignOut}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="log-out-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Sign Out</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.infoText}>
                  Sign in to automatically backup your data to Google Drive and access backups from any device.
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.signInButton]}
                  onPress={handleSignIn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="logo-google" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Sign In with Google</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Last Backup Info */}
          {lastBackup && (
            <View style={styles.infoCard}>
              <Ionicons name="time-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>
                Last backup: {formatRelativeTime(lastBackup)}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.backupButton]}
              onPress={handleBackupNow}
              disabled={loading || isRestoring}
            >
              <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Backup Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.restoreButton]}
              onPress={handleRestoreBackup}
              disabled={loading || isRestoring}
            >
              <Ionicons name="cloud-download-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Restore</Text>
            </TouchableOpacity>
          </View>

      {/* Backup Frequency Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="timer-outline" size={18} /> Automatic Backup Frequency
        </Text>
        <View style={styles.frequencyButtons}>
          {frequencyOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.frequencyButton,
                backupFrequency === option.value && styles.frequencyButtonActive,
              ]}
              onPress={() => handleFrequencyChange(option.value)}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  backupFrequency === option.value && styles.frequencyButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Google Drive Backups */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="cloud-outline" size={18} /> Google Drive Backups ({driveBackups.length})
        </Text>
        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : driveBackups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>
              {isSignedIn ? 'No backups in Google Drive yet' : 'Sign in to Google Drive in About tab'}
            </Text>
          </View>
        ) : (
          driveBackups.map((item) => (
            <View key={item.id} style={styles.backupCard}>
              <View style={styles.backupHeader}>
                <Ionicons name="cloud-done-outline" size={20} color="#10b981" />
                <Text style={styles.backupName}>{item.name}</Text>
              </View>
              <Text style={styles.backupMeta}>
                📅 {item.createdTime ? new Date(item.createdTime).toLocaleString() : '-'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Local Backups */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="phone-portrait-outline" size={18} /> Local Backups ({localBackups.length})
        </Text>
        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : localBackups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No local backups found</Text>
          </View>
        ) : (
          localBackups.map((item) => (
            <View key={item.name} style={styles.backupCard}>
              <View style={styles.backupHeader}>
                <Ionicons name="document-outline" size={20} color="#6b7280" />
                <Text style={styles.backupName}>{item.name}</Text>
              </View>
              <Text style={styles.backupMeta}>
                💾 {(item.size / 1024).toFixed(1)} KB • {item.modificationTime ? new Date(item.modificationTime * 1000).toLocaleString() : '-'}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* SQLite Directory (Advanced) */}
      <TouchableOpacity
        style={styles.advancedSection}
        onPress={() => Alert.alert('SQLite Files', sqliteFiles.join('\n') || 'No files found')}
      >
        <Text style={styles.advancedText}>
          <Ionicons name="folder-outline" size={16} /> View SQLite Directory ({sqliteFiles.length} files)
        </Text>
        <Ionicons name="chevron-forward-outline" size={20} color="#9ca3af" />
      </TouchableOpacity>

      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Tip: Sign in above to enable automatic cloud backups
        </Text>
      </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1d21',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#1a1d21',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
  header: {
    backgroundColor: '#25292e',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25292e',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
  userEmail: {
    fontSize: 14,
    color: '#60a5fa',
    fontWeight: '500',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  backupButton: {
    backgroundColor: '#3b82f6',
  },
  restoreButton: {
    backgroundColor: '#10b981',
  },
  signInButton: {
    backgroundColor: '#3b82f6',
    marginTop: 12,
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    marginTop: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#25292e',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 12,
  },
  frequencyButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    backgroundColor: '#1a1d21',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#374151',
  },
  frequencyButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  frequencyButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#d1d5db',
  },
  frequencyButtonTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  loader: {
    marginVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  backupCard: {
    backgroundColor: '#1a1d21',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  backupName: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#f9fafb',
    flex: 1,
  },
  backupMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 28,
  },
  advancedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#25292e',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  advancedText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7f1d1d',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#991b1b',
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#fca5a5',
    flex: 1,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
