import React, { useEffect, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AddPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (amount: number, date: string, time: string, note: string) => void;
}

export default function AddPaymentModal({ visible, onClose, onAdd }: Readonly<AddPaymentModalProps>) {
  const [showModal, setShowModal] = useState(visible);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  const getCurrentDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getCurrentDate());
  const [time, setTime] = useState(getCurrentTime());
  const [note, setNote] = useState('');

  // Animation effect
  useEffect(() => {
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

  // Update date and time when modal becomes visible
  useEffect(() => {
    if (visible) {
      setDate(getCurrentDate());
      setTime(getCurrentTime());
    }
  }, [visible]);

  const handleAdd = () => {
    if (!amount || !date || !time) return;
    onAdd(Number(amount), date, time, note);
    setAmount('');
    setDate(getCurrentDate());
    setTime(getCurrentTime());
    setNote('');
    onClose();
  };

  return (
    <Modal visible={showModal} transparent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.title}>Add Payment</Text>
          <TextInput
            style={styles.input}
            placeholder="Amount Rs."
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <TextInput
            style={styles.input}
            placeholder="Date (YYYY-MM-DD)"
            placeholderTextColor="#999"
            value={date}
            onChangeText={setDate}
          />
          <TextInput
            style={styles.input}
            placeholder="Time (HH:MM)"
            placeholderTextColor="#999"
            value={time}
            onChangeText={setTime}
          />
          <TextInput
            style={styles.input}
            placeholder="Note (optional)"
            placeholderTextColor="#999"
            value={note}
            onChangeText={setNote}
            multiline
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.addButton]} onPress={handleAdd}>
              <Text style={styles.addButtonText}>Add Payment</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1a1d21',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#25292e',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    fontSize: 16,
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
