import AddDebtModal from '@/components/AddDebtModal';
import AddPaymentModal from '@/components/AddPaymentModal';
import { useSQLiteContext } from '@/database/db';
import { addTransaction, deleteDebtor, getDebtorById, getTransactionsForDebtor, updateDebtor, updateDebtorBalance } from '@/database/debtorService';
import { Debtor } from '@/types/debtor';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function DebtorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Array<any>>([]);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [addPhoneModalVisible, setAddPhoneModalVisible] = useState(false);
  const [newPhoneValue, setNewPhoneValue] = useState('');

  // Reload data whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDebtor();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  useEffect(() => {
    loadDebtor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (debtor) {
      loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtor, filterType]);

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

  const loadTransactions = async () => {
    if (!debtor) return;
    let txs = await getTransactionsForDebtor(db, debtor.id, filterType === 'ALL' ? undefined : filterType);
    setTransactions(txs);
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = (phoneNumber: string) => {
    if (!debtor) return;
    const balance = debtor.balance;
    const message = `Balance = Rs.${Math.abs(balance).toFixed(2)}. `;
    let digits = phoneNumber.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) {
      digits = '94' + digits.slice(1);
    } else if (!digits.startsWith('94')) {
      digits = '94' + digits;
    }
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const handleCopy = async (phoneNumber: string) => {
    await Clipboard.setStringAsync(phoneNumber);
    Alert.alert('Copied', 'Phone number copied to clipboard');
  };

  const handleAddPhone = () => {
    setNewPhoneValue('');
    setAddPhoneModalVisible(true);
  };

  const handleAddPhoneSubmit = async () => {
    if (!debtor || !newPhoneValue.trim()) return;
    try {
      const updatedPhones = [...debtor.phoneNumbers, newPhoneValue.trim()];
      await updateDebtor(db, debtor.id, debtor.name, updatedPhones, debtor.balance);
      await loadDebtor();
      setAddPhoneModalVisible(false);
      Alert.alert('Success', 'Phone number added successfully');
    } catch (error) {
      console.error('Error adding phone number:', error);
      Alert.alert('Error', 'Failed to add phone number');
    }
  };

  const handleDeletePhone = (index: number) => {
    if (!debtor) return;
    Alert.alert('Delete Phone Number', 'Are you sure you want to delete this phone number?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedPhones = debtor.phoneNumbers.filter((_, i) => i !== index);
            await updateDebtor(db, debtor.id, debtor.name, updatedPhones, debtor.balance);
            await loadDebtor();
            Alert.alert('Success', 'Phone number deleted successfully');
          } catch (error) {
            console.error('Error deleting phone number:', error);
            Alert.alert('Error', 'Failed to delete phone number');
          }
        },
      },
    ]);
  };

  const handleAddPayment = () => setShowPaymentModal(true);
  const handleAddDebt = () => setShowDebtModal(true);

  const handleSubmitPayment = async (amount: number, date: string, time: string, note: string) => {
    if (!debtor) return;
    try {
      await addTransaction(db, debtor.id, 'IN', date, time, amount, note);
      await updateDebtorBalance(db, debtor.id, debtor.balance - amount);
      await loadDebtor();
      await loadTransactions();
      Alert.alert('Success', `Payment of $${amount.toFixed(2)} added`);
    } catch {
      Alert.alert('Error', 'Failed to add payment');
    }
    setShowPaymentModal(false);
  };

  const handleSubmitDebt = async (amount: number, date: string, time: string, note: string) => {
    if (!debtor) return;
    try {
      await addTransaction(db, debtor.id, 'OUT', date, time, amount, note);
      await updateDebtorBalance(db, debtor.id, debtor.balance + amount);
      await loadDebtor();
      await loadTransactions();
      Alert.alert('Success', `Debt of $${amount.toFixed(2)} added`);
    } catch {
      Alert.alert('Error', 'Failed to add debt');
    }
    setShowDebtModal(false);
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
          onPress: () => {
            // Use setTimeout to allow async
            setTimeout(async () => {
              try {
                await deleteDebtor(db, debtor.id);
                Alert.alert('Success', 'Debtor deleted successfully');
                router.back();
              } catch (error) {
                console.error('Error deleting debtor:', error);
                Alert.alert('Error', 'Failed to delete debtor');
              }
            }, 0);
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
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{debtor.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{debtor.name}</Text>
          <View style={styles.balanceContainer}>
            <Text style={[styles.balance, debtor.balance > 0 ? styles.balancePositive : styles.balanceZero]}>
              Rs.{Math.abs(debtor.balance).toFixed(2)}
            </Text>
            <Text style={styles.balanceNote}>
              {(() => {
                if (debtor.balance > 0) return 'owes you';
                if (debtor.balance === 0) return 'settled';
                return 'you owe';
              })()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollContent}>
      {/* Phone Numbers Section */}
      <View style={styles.section}>
        <View style={styles.phoneTitleRow}>
          <Text style={styles.sectionTitle}>Phone Numbers</Text>
          <TouchableOpacity onPress={handleAddPhone}>
            <Ionicons name="add-circle" size={26} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        {debtor.phoneNumbers.map((phone, index) => (
          <View key={phone + index} style={styles.phoneCardRedesign}>
            <Text style={styles.phoneNumber}>{phone}</Text>
            <View style={styles.phoneActionsRedesign}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleCall(phone)}
              >
                <Ionicons name="call" size={22} color="#4caf50" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleWhatsApp(phone)}
              >
                <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleCopy(phone)}
              >
                <Ionicons name="copy" size={22} color="#f59e42" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleDeletePhone(index)}
              >
                <Ionicons name="trash" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Transaction Actions & Filter */}
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
        <View style={styles.filterRow}>
          <TouchableOpacity onPress={() => setFilterType('ALL')} style={[styles.filterButton, filterType === 'ALL' && styles.filterButtonActive]}>
            <Text style={styles.filterButtonText}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterType('IN')} style={[styles.filterButton, filterType === 'IN' && styles.filterButtonActive]}>
            <Text style={styles.filterButtonText}>Received</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterType('OUT')} style={[styles.filterButton, filterType === 'OUT' && styles.filterButtonActive]}>
            <Text style={styles.filterButtonText}>Debt</Text>
          </TouchableOpacity>
        </View>
        {/* Transactions List */}
        {transactions.length === 0 ? (
          <Text style={styles.noTransactions}>No transactions found.</Text>
        ) : (
          transactions.map(tx => (
            <View key={tx.id} style={styles.transactionCard}>
              <View style={styles.transactionRow}>
                <Text style={styles.transactionIcon}>{tx.type === 'IN' ? '⬇️' : '⬆️'}</Text>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionAmount}>{tx.type === 'IN' ? '+' : '-'}Rs.{tx.amount.toFixed(2)}</Text>
                  <Text style={styles.transactionNote}>{tx.note || ''}</Text>
                </View>
                <View style={styles.transactionMeta}>
                  <Text style={styles.transactionDate}>{tx.date}</Text>
                  <Text style={styles.transactionTime}>{tx.time}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
          {/* Modals for adding debt/payment */}
          <AddDebtModal
            visible={showDebtModal}
            onClose={() => setShowDebtModal(false)}
            onAdd={handleSubmitDebt}
          />
          <AddPaymentModal
            visible={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onAdd={handleSubmitPayment}
          />

      {/* Add Phone Modal */}
      <Modal visible={addPhoneModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentPhone}>
            <Text style={styles.modalTitle}>Add Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              value={newPhoneValue}
              onChangeText={setNewPhoneValue}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              placeholderTextColor="#9ba1a6"
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setAddPhoneModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleAddPhoneSubmit}>
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              {debtor.updatedAt
                ? `${new Date(debtor.updatedAt).toLocaleDateString()} ${new Date(debtor.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                : 'N/A'}
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
    top: 25,
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
  phoneCardRedesign: {
    backgroundColor: '#1a1d21',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneNumber: {
    fontSize: 18,
    color: '#fff',
    marginRight: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
  phoneActionsRedesign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    backgroundColor: 'transparent',
    padding: 6,
    borderRadius: 8,
    marginLeft: 2,
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
  filterRow: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    backgroundColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#0a7ea4',
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  noTransactions: {
    color: '#9ba1a6',
    fontStyle: 'italic',
    marginTop: 12,
  },
  transactionCard: {
    backgroundColor: '#23262a',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  transactionNote: {
    fontSize: 13,
    color: '#9ba1a6',
    marginTop: 2,
  },
  transactionMeta: {
    alignItems: 'flex-end',
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ba1a6',
  },
  transactionTime: {
    fontSize: 12,
    color: '#9ba1a6',
  },
  phoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentPhone: {
    backgroundColor: '#23262a',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#1a1d21',
    color: '#fff',
    fontSize: 16,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalButton: {
    backgroundColor: '#374151',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
