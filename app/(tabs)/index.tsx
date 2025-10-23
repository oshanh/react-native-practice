import { logDbStatus, useSQLiteContext } from '@/database/db';
import { getStatistics } from '@/database/debtorService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { backupNow, getLastBackupTimestamp } from '../../utils/backupV2';
// removed manual refresh UI — no provider refresh hook needed here

export default function Index() {
  const db = useSQLiteContext();
  // manual refresh removed; no-op
  
  const [loading, setLoading] = useState(true);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [now, setNow] = useState<Date>(new Date());  // Update relative time every minute while this screen is mounted
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const formatRelativeTime = (date: Date): string => {
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'just now';
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 10) return 'just now';
    const steps = [
      { max: 60, denom: 1, label: 'sec' },
      { max: 60, denom: 60, label: 'min' },
      { max: 24, denom: 3600, label: 'hour' },
      { max: 30, denom: 86400, label: 'day' },
      { max: 12, denom: 2592000, label: 'month' },
    ] as const;
    for (const step of steps) {
      const value = Math.floor(seconds / step.denom);
      if (value < step.max) return `${value} ${step.label}${value === 1 ? '' : 's'} ago`;
    }
    const years = Math.floor(seconds / 31536000);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  };
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalIn: 0,
    totalOut: 0,
  });

  const loadStatistics = async (retryCount = 0) => {
    try {
      setLoading(true);
      
      // Add small delay on retry to allow DB to stabilize
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
      }
      
      await logDbStatus(db, `stats:attempt-${retryCount}`);
      const data = await getStatistics(db);
      setStats(data);
    } catch (error: any) {
      console.error('[index] Error loading statistics:', error);
      
      // Retry up to 2 times if it's a database error
      if (retryCount < 2 && (
        error?.message?.includes('NativeDatabase') || 
        error?.message?.includes('closed resource') ||
        error?.message?.includes('NullPointerException')
      )) {
        console.log(`[index] Retrying stats... (attempt ${retryCount + 1})`);
        return loadStatistics(retryCount + 1);
      }
      
      // Set zero stats on final failure
      setStats({ totalBalance: 0, totalIn: 0, totalOut: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Reload statistics whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStatistics();
      // Load last backup timestamp when screen gains focus
      (async () => {
        const ts = await getLastBackupTimestamp();
        setLastBackup(ts);
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const getBalanceNote = (balance: number): string => {
    if (balance > 0) return '↑ Money owed to you';
    if (balance < 0) return '↓ Money you owe';
    return '✓ All settled';
  };



  const handleBackupNow = async () => {
    try {
      const { uri, uploaded, shared, googleDrive } = await backupNow();
      // Update last backup timestamp after a successful backup (any target)
      const ts = await getLastBackupTimestamp();
      setLastBackup(ts);
      if (googleDrive) {
        Alert.alert('Backup complete', 'Backup uploaded to Google Drive successfully! ☁️');
      } else if (uploaded) {
        Alert.alert('Backup complete', 'Backup uploaded successfully.');
      } else if (shared) {
        // Shared via OS share sheet
      } else {
        Alert.alert('Backup saved', `Backup saved locally at ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Backup failed', e?.message ?? 'Unknown error');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={styles.subtitle}>Financial Overview</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Backup button */}
        <View style={styles.actionBar}>
          {(
            <Text style={styles.lastBackupText}>
              {`Last backup: ${lastBackup ? formatRelativeTime(lastBackup) : '—'}`}
            </Text>
          )}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.backupButton}
              onPress={handleBackupNow}
              accessibilityRole="button"
              accessibilityLabel="Backup now"
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            </TouchableOpacity>
            
            {/* manual refresh button removed to avoid user-triggered remounts */}
          </View>
 
        </View>

        <View style={styles.statsContainer}>
          {/* Total Balance Card - Highlighted */}
          <View style={[styles.statCard, styles.balanceCard]}>
            <Text style={styles.statLabel}>Total Balance</Text>
            <Text style={[styles.statValue, styles.balanceValue]}>
              Rs.{stats.totalBalance.toFixed(2)}
            </Text>
            <Text style={styles.statNote}>
              {getBalanceNote(stats.totalBalance)}
            </Text>
          </View>

          {/* IN and OUT Cards in Row */}
          <View style={styles.rowContainer}>
            {/* Total IN Card */}
            <View style={[styles.statCard, styles.smallCard, styles.inCard]}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>↓</Text>
              </View>
              <Text style={styles.statLabel}>Received</Text>
              <Text style={[styles.statValue, styles.smallValue, styles.inValue]}>
                Rs.{stats.totalIn.toFixed(2)}
              </Text>
              <Text style={styles.statDescription}>Payments</Text>
            </View>

            {/* Total OUT Card */}
            <View style={[styles.statCard, styles.smallCard, styles.outCard]}>
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>↑</Text>
              </View>
              <Text style={styles.statLabel}>Lent</Text>
              <Text style={[styles.statValue, styles.smallValue, styles.outValue]}>
                Rs.{stats.totalOut.toFixed(2)}
              </Text>
              <Text style={styles.statDescription}>Money out</Text>
            </View>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Quick Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Position:</Text>
            <Text style={[styles.summaryValue, stats.totalBalance >= 0 ? styles.positiveText : styles.negativeText]}>
              Rs.{Math.abs(stats.totalBalance).toFixed(2)} {stats.totalBalance >= 0 ? 'owed to you' : 'you owe'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Transactions:</Text>
            <Text style={styles.summaryValue}>
              Rs.{(stats.totalIn + stats.totalOut).toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
 
  
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  header: {
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#1a1d21',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  scrollView: {
    flex: 1,
  },
  actionBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastBackupText: {
    color: '#9aa0a6',
    fontSize: 12,
    marginRight: 8,
  },
  backupButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backupButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    padding: 16,
    gap: 12,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1a1d21',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  smallCard: {
    flex: 1,
    padding: 12,
  },
  balanceCard: {
    backgroundColor: '#4a1a1a',
    borderWidth: 3,
    borderColor: '#f56565',
    padding: 24,
    shadowColor: '#f56565',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  inCard: {
    backgroundColor: '#1a3d2e',
    borderWidth: 2,
    borderColor: '#2d5f4a',
  },
  outCard: {
    backgroundColor: '#3d1a1a',
    borderWidth: 2,
    borderColor: '#5f2d2d',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconText: {
    fontSize: 18,
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  smallValue: {
    fontSize: 20,
  },
  balanceValue: {
    color: '#f56565',
    fontSize: 40,
  },
  inValue: {
    color: '#48bb78',
  },
  outValue: {
    color: '#f56565',
  },
  statNote: {
    fontSize: 11,
    color: '#aaa',
    fontStyle: 'italic',
  },
  statDescription: {
    fontSize: 11,
    color: '#aaa',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#1a1d21',
    borderRadius: 12,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#888',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    flexShrink: 1,
    marginLeft: 8,
    textAlign: 'right',
  },
  positiveText: {
    color: '#48bb78',
  },
  negativeText: {
    color: '#f56565',
  },
});
