import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  getCurrentUser,
  initializeGoogleDrive,
  isSignedInToGoogleDrive,
  signInToGoogleDrive,
  signOutFromGoogleDrive,
} from '../../utils/googleDriveService';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Constants: any = require('expo-constants');

export default function AboutScreen() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initGoogleDrive();
  }, []);

  const initGoogleDrive = async () => {
    try {
      setInitializing(true);
      
      // Get config from app.json
      const extra: any = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};
      const webClientId = extra?.googleDrive?.webClientId || '188962916113-ga5ve15f5mvqv8smpkrieth2hk47vsua.apps.googleusercontent.com';
      
      // Initialize Google Drive
      await initializeGoogleDrive({
        webClientId: webClientId,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      // Check if already signed in
      const signedIn = await isSignedInToGoogleDrive();
      setIsSignedIn(signedIn);

      if (signedIn) {
        const currentUser = getCurrentUser();
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
    } finally {
      setInitializing(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const { user: signedInUser } = await signInToGoogleDrive();
      setUser(signedInUser);
      setIsSignedIn(true);
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
      Alert.alert('Success', 'Signed out from Google Drive');
    } catch (error: any) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Debit Manager</Text>
      <Text style={styles.version}>Version 1.0.0</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Google Drive Backup</Text>
        
        {isSignedIn ? (
          <>
            <Text style={styles.userInfo}>
              Signed in as: {user?.email || 'Unknown'}
            </Text>
            <Text style={styles.infoText}>
              Backups will automatically be saved to Google Drive
            </Text>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Out</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.infoText}>
              Sign in to automatically backup your data to Google Drive
            </Text>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In with Google</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 Debit Manager</Text>
        <Text style={styles.footerText}>Made with ❤️</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 40,
  },
  version: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  userInfo: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  signInButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
