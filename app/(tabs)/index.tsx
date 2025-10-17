import { useSQLiteContext } from '@/database/db';
import { getStatistics } from '@/database/debtorService';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalIn: 0,
    totalOut: 0,
  });

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const data = await getStatistics(db);
      setStats(data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload statistics whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStatistics();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const getBalanceNote = (balance: number): string => {
    if (balance > 0) return '↑ Money owed to you';
    if (balance < 0) return '↓ Money you owe';
    return '✓ All settled';
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
        <View style={styles.statsContainer}>
          {/* Total Balance Card */}
          <View style={[styles.statCard, styles.balanceCard]}>
            <Text style={styles.statLabel}>Total Balance</Text>
            <Text style={[styles.statValue, styles.balanceValue]}>
              ${stats.totalBalance.toFixed(2)}
            </Text>
            <Text style={styles.statNote}>
              {getBalanceNote(stats.totalBalance)}
            </Text>
          </View>

          {/* Total IN Card */}
          <View style={[styles.statCard, styles.inCard]}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>↓</Text>
            </View>
            <Text style={styles.statLabel}>Total Received</Text>
            <Text style={[styles.statValue, styles.inValue]}>
              ${stats.totalIn.toFixed(2)}
            </Text>
            <Text style={styles.statDescription}>Payments received</Text>
          </View>

          {/* Total OUT Card */}
          <View style={[styles.statCard, styles.outCard]}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconText}>↑</Text>
            </View>
            <Text style={styles.statLabel}>Total Lent</Text>
            <Text style={[styles.statValue, styles.outValue]}>
              ${stats.totalOut.toFixed(2)}
            </Text>
            <Text style={styles.statDescription}>Money lent out</Text>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Quick Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Position:</Text>
            <Text style={[styles.summaryValue, stats.totalBalance >= 0 ? styles.positiveText : styles.negativeText]}>
              ${Math.abs(stats.totalBalance).toFixed(2)} {stats.totalBalance >= 0 ? 'owed to you' : 'you owe'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Transactions:</Text>
            <Text style={styles.summaryValue}>
              ${(stats.totalIn + stats.totalOut).toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  statsContainer: {
    padding: 16,
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
  balanceCard: {
    backgroundColor: '#2d3748',
    borderWidth: 2,
    borderColor: '#4a5568',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 20,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  balanceValue: {
    color: '#4299e1',
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
