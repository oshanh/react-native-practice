import { useSQLiteContext } from '@/database/db';
import { deleteDebtor, getDebtorById, updateDebtorBalance } from '@/database/debtorService';
import { Debtor } from '@/types/debtor';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function DebtorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDebtor();
  }, [id]);

  const loadDebtor = async () => {
    try {
      setLoading(true);
      const data = await getDebtorById(db, Number(id));
      setDebtor(data);
    } catch (error) {
      console.error('Error loading debtor:', error);
      Alert.alert('Error', 'Failed to load debtor details');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleSMS = (phoneNumber: string) => {
    Linking.openURL(`sms:${phoneNumber}`);
  };

  const handleAddPayment = () => {
    Alert.prompt(
      'Add Payment',
      'Enter payment amount:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (amount) => {
            if (amount && debtor) {
              const payment = Number.parseFloat(amount);
              if (!isNaN(payment) && payment > 0) {
                try {
                  const newBalance = debtor.balance - payment;
                  await updateDebtorBalance(db, debtor.id, newBalance);
                  loadDebtor();
                  Alert.alert('Success', `Payment of $${payment.toFixed(2)} added`);
                } catch (error) {
                  Alert.alert('Error', 'Failed to add payment');
                }
              } else {
                Alert.alert('Error', 'Please enter a valid amount');
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleAddDebt = () => {
    Alert.prompt(
      'Add Debt',
      'Enter debt amount:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (amount) => {
            if (amount && debtor) {
              const debt = Number.parseFloat(amount);
              if (!isNaN(debt) && debt > 0) {
                try {
                  const newBalance = debtor.balance + debt;
                  await updateDebtorBalance(db, debtor.id, newBalance);
                  loadDebtor();
                  Alert.alert('Success', `Debt of $${debt.toFixed(2)} added`);
                } catch (error) {
                  Alert.alert('Error', 'Failed to add debt');
                }
              } else {
                Alert.alert('Error', 'Please enter a valid amount');
              }
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleDelete = () => {
    if (!debtor) return;

    Alert.alert(
      'Delete Debtor',
      `Are you sure you want to delete ${debtor.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDebtor(db, debtor.id);
              Alert.alert('Success', 'Debtor deleted successfully');
              router.back();
            } catch (error) {
              console.error('Error deleting debtor:', error);
              Alert.alert('Error', 'Failed to delete debtor');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!debtor) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Debtor not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header Card */}
      <View style={styles.headerCard}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{debtor.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{debtor.name}</Text>
          <View style={styles.balanceContainer}>
            <Text style={[styles.balance, debtor.balance > 0 ? styles.balancePositive : styles.balanceZero]}>
              ${Math.abs(debtor.balance).toFixed(2)}
            </Text>
            <Text style={styles.balanceNote}>
              {debtor.balance > 0 ? 'owes you' : debtor.balance === 0 ? 'settled' : 'you owe'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
      {/* Phone Numbers Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phone Numbers</Text>
        {debtor.phoneNumbers.map((phone, index) => (
          <View key={index} style={styles.phoneCard}>
            <Text style={styles.phoneNumber}>{phone}</Text>
            <View style={styles.phoneActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.callButton]}
                onPress={() => handleCall(phone)}
              >
                <Text style={styles.actionButtonText}>📞 Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.smsButton]}
                onPress={() => handleSMS(phone)}
              >
                <Text style={styles.actionButtonText}>💬 SMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Transaction Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <View style={styles.transactionButtons}>
          <TouchableOpacity style={styles.transactionButton} onPress={handleAddPayment}>
            <Text style={styles.transactionButtonIcon}>💵</Text>
            <Text style={styles.transactionButtonText}>Received Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.transactionButton} onPress={handleAddDebt}>
            <Text style={styles.transactionButtonIcon}>➕</Text>
            <Text style={styles.transactionButtonText}>Add Debt</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metadata Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Information</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>
              {debtor.createdAt ? new Date(debtor.createdAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>
              {debtor.updatedAt ? new Date(debtor.updatedAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Delete Button */}
      <View style={styles.dangerZone}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>🗑️ Delete Debtor</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
      </ScrollView>
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
  loadingText: {
    fontSize: 18,
    color: '#9ba1a6',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerCard: {
    backgroundColor: '#1a1d21',
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButtonTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 18,
    zIndex: 10,
  },
  backArrow: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  balance: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  balancePositive: {
    color: '#4caf50',
  },
  balanceZero: {
    color: '#9ba1a6',
  },
  balanceNote: {
    fontSize: 12,
    color: '#9ba1a6',
    fontStyle: 'italic',
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  phoneCard: {
    backgroundColor: '#1a1d21',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  phoneNumber: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 12,
  },
  phoneActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#4caf50',
  },
  smsButton: {
    backgroundColor: '#2196f3',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  transactionButton: {
    flex: 1,
    backgroundColor: '#1a1d21',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  transactionButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  transactionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#1a1d21',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  infoLabel: {
    fontSize: 14,
    color: '#9ba1a6',
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  dangerZone: {
    padding: 20,
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
