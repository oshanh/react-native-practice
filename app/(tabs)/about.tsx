import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Constants: any = require('expo-constants');

export default function AboutScreen() {
  const appVersion = Constants?.default.expoConfig?.version || 'N/A';
  const appName = Constants?.default.expoConfig?.name || 'Debit Manager';
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
        <View style={styles.developerCard}>
          <View style={styles.developerAvatar}>
            <Text style={styles.developerInitials}>OH</Text>
          </View>
          <View style={styles.developerInfo}>
            <Text style={styles.developerName}>Oshan Harshad</Text>
            
          </View>
        </View>
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
    backgroundColor: '#1a1d21',
  },
  header: {
    backgroundColor: '#25292e',
    padding: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: '#9ca3af',
  },
  section: {
    backgroundColor: '#25292e',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#9ca3af',
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
    backgroundColor: '#1a1d21',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  featureText: {
    fontSize: 14,
    color: '#d1d5db',
    flex: 1,
  },
  developerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1d21',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  developerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  developerInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  developerInfo: {
    flex: 1,
  },
  developerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 4,
  },
  developerTitle: {
    fontSize: 14,
    color: '#60a5fa',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
});
