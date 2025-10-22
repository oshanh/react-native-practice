import { useSQLiteContext } from '@/database/db';
import { addDebtor } from '@/database/debtorService';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface AddDebtorModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDebtorModal({ visible, onClose, onSuccess }: AddDebtorModalProps) {
  const [showModal, setShowModal] = useState(visible);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  // Handle fade in/out when visible changes
  React.useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setShowModal(false));
    }
  }, [visible, fadeAnim, scaleAnim]);
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, '']);
  };

  const handleRemovePhoneNumber = (index: number) => {
    const newPhones = phoneNumbers.filter((_, i) => i !== index);
    setPhoneNumbers(newPhones.length > 0 ? newPhones : ['']);
  };

  const handlePhoneNumberChange = (text: string, index: number) => {
    const newPhones = [...phoneNumbers];
    newPhones[index] = text;
    setPhoneNumbers(newPhones);
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter debtor name');
      return;
    }

    const validPhones = phoneNumbers.filter(phone => phone.trim() !== '');
    if (validPhones.length === 0) {
      Alert.alert('Error', 'Please enter at least one phone number');
      return;
    }

    const balanceNum = parseFloat(balance) || 0;

    try {
      setLoading(true);
      await addDebtor(db, name.trim(), validPhones, balanceNum);
      
      // Reset form
      setName('');
      setPhoneNumbers(['']);
      setBalance('');
      
      Alert.alert('Success', 'Debtor added successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding debtor:', error);
      Alert.alert('Error', 'Failed to add debtor');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setPhoneNumbers(['']);
    setBalance('');
    onClose();
  };

  return (
    <Modal
      visible={showModal}
      transparent={true}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Animated.View style={[styles.modalContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}> 
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Debtor</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter debtor name"
                placeholderTextColor="#666"
                value={name}
                onChangeText={setName}
                editable={!loading}
              />
            </View>

            {/* Phone Numbers */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Phone Numbers *</Text>
                <TouchableOpacity
                  onPress={handleAddPhoneNumber}
                  style={styles.addButton}
                  disabled={loading}
                >
                  <Text style={styles.addButtonText}>+ Add Phone</Text>
                </TouchableOpacity>
              </View>
              {phoneNumbers.map((phone, index) => (
                <View key={index} style={styles.phoneRow}>
                  <TextInput
                    style={[styles.input, styles.phoneInput]}
                    placeholder={`Phone ${index + 1}`}
                    placeholderTextColor="#666"
                    value={phone}
                    onChangeText={(text) => handlePhoneNumberChange(text, index)}
                    keyboardType="phone-pad"
                    editable={!loading}
                  />
                  {phoneNumbers.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemovePhoneNumber(index)}
                      style={styles.removeButton}
                      disabled={loading}
                    >
                      <Text style={styles.removeButtonText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* Balance Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Balance</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#666"
                value={balance}
                onChangeText={setBalance}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Adding...' : 'Add Debtor'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1d21',
    borderRadius: 20,
    width: '90%',
    maxHeight: '90%',
    paddingBottom: 20,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#25292e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneInput: {
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0a7ea4',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#0a7ea4',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
