import AddDebtorModal from '@/components/AddDebtorModal';
import Button from '@/components/Button';
import { useDebtors } from '@/database/useDebtors';
import { Debtor } from '@/types/debtor';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DebtorsScreen() {
  const { debtors, loading, error, reload } = useDebtors();
  const [modalVisible, setModalVisible] = useState(false);

  // Reload debtors whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const renderDebtor = ({ item }: { item: Debtor }) => (
    <Link href={`/debtor/${item.id}` as any} asChild>
      <TouchableOpacity
        style={styles.debtorCard}
        activeOpacity={0.7}
      >
        <View style={styles.debtorInfo}>
          <Text style={styles.debtorName}>{item.name}</Text>
          <Text style={styles.debtorBalance}>
            Balance: ${item.balance.toFixed(2)}
          </Text>
          <Text style={styles.debtorPhones}>
            {item.phoneNumbers.join(', ') || 'No phone numbers'}
          </Text>
        </View>
        <View style={styles.arrowContainer}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </TouchableOpacity>
    </Link>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading debtors...</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debtors</Text>
        <Text style={styles.subtitle}>Total: {debtors.length}</Text>
      </View>

      {debtors.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No debtors found</Text>
          <Text style={styles.emptySubtext}>Add your first debtor to get started</Text>
        </View>
      ) : (
        <FlatList
          data={debtors}
          renderItem={renderDebtor}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <View style={styles.footer}>
        <Button
          label="Add Debtor"
          theme="primary"
          onPress={() => setModalVisible(true)}
        />
      </View>

      <AddDebtorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={reload}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#25292e',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1d21',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ba1a6',
  },
  listContainer: {
    padding: 16,
  },
  debtorCard: {
    backgroundColor: '#1a1d21',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtorInfo: {
    flex: 1,
  },
  debtorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  debtorBalance: {
    fontSize: 16,
    color: '#0a7ea4',
    marginBottom: 4,
  },
  debtorPhones: {
    fontSize: 14,
    color: '#9ba1a6',
  },
  arrowContainer: {
    justifyContent: 'center',
    paddingLeft: 12,
  },
  arrowText: {
    fontSize: 32,
    color: '#0a7ea4',
    fontWeight: '300',
  },
  loadingText: {
    fontSize: 18,
    color: '#9ba1a6',
  },
  emptyText: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ba1a6',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
  },
});
