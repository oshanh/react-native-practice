import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Constants: any = require('expo-constants');

export default function AboutScreen() {
  const appVersion = Constants?.expoConfig?.version || '1.0.0';
  const appName = Constants?.expoConfig?.name || 'Debit Manager';

  return (
    <ScrollView style={styles.container}>
      {/* App Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="wallet" size={64} color="#3b82f6" />
        </View>
        <Text style={styles.title}>{appName}</Text>
        <Text style={styles.version}>Version {appVersion}</Text>
      </View>

      {/* App Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="information-circle" size={20} /> About
        </Text>
        <Text style={styles.description}>
          Debit Manager helps you track money you've lent to others and money you owe. 
          Keep organized records of all your debts and credits in one simple app.
        </Text>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="star" size={20} /> Features
        </Text>
        <View style={styles.featureList}>
          <View style={styles.feature}>
            <Ionicons name="people" size={20} color="#3b82f6" />
            <Text style={styles.featureText}>Manage multiple debtors</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="card" size={20} color="#3b82f6" />
            <Text style={styles.featureText}>Track debts and payments</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="stats-chart" size={20} color="#3b82f6" />
            <Text style={styles.featureText}>View statistics and summaries</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="cloud-upload" size={20} color="#3b82f6" />
            <Text style={styles.featureText}>Google Drive backup & restore</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="time" size={20} color="#3b82f6" />
            <Text style={styles.featureText}>Automatic backup scheduling</Text>
          </View>
        </View>
      </View>

      {/* Developer Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="code-slash" size={20} /> Developer
        </Text>
        <Text style={styles.description}>
          Developed with React Native and Expo
        </Text>
        <Text style={styles.description}>
          Built with ❤️ for better financial tracking
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 Debit Manager</Text>
        <Text style={styles.footerText}>All rights reserved</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  featureList: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
});
