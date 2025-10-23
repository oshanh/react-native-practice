import { getSQLiteProvider, logDbStatus, migrateDbIfNeeded, notifyProviderRemounted, registerSQLiteProviderRemount } from "@/database/db";
import '@/database/dbLogger'; // Initialize logger to start intercepting console logs
import { Stack } from "expo-router";
import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
const SQLiteProvider: any = getSQLiteProvider();

// Context for triggering DB provider remount
const DBRefreshContext = createContext<{ refreshDb: () => void }>({ refreshDb: () => {} });
export const useDBRefresh = () => useContext(DBRefreshContext);

// Loading fallback component
function LoadingFallback() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0a7ea4" />
      <Text style={styles.loadingText}>Loading database...</Text>
    </View>
  );
}

function ProviderWithLogs({ children }: Readonly<{ children: React.ReactNode }>) {
  useEffect(() => {
    console.log('[DB] SQLiteProvider mounted (DB opening)');
    // Register remount callback so non-React modules can request a provider refresh
    registerSQLiteProviderRemount(() => {
      // bumping the key from here requires access to the RootLayout state; instead
      // we use a mounted callback exposed via context. For now log the request.
      console.log('[DB] registerSQLiteProviderRemount: remount requested');
    });
    return () => {
      console.log('[DB] SQLiteProvider unmounted (DB closing)');
    };
  }, []);

  return (
    <SQLiteProvider
      databaseName="debitmanager"
      useSuspense
      onInit={async (db: any) => {
        console.log('[DB] onInit begin');
        await logDbStatus(db, 'before-migrate');
        await migrateDbIfNeeded(db);
        await logDbStatus(db, 'after-migrate');
        console.log('[DB] onInit complete');
        try {
          notifyProviderRemounted(true);
        } catch (e) {
          console.warn('[DB] notifyProviderRemounted failed:', e);
        }
      }}
    >
      {children}
    </SQLiteProvider>
  );
}

export default function RootLayout() {
  const [dbKey, setDbKey] = useState(0);
  
  const refreshDb = useCallback(() => {
    console.log('[DB] Manual refresh triggered, remounting provider...');
    setDbKey(prev => prev + 1);
  }, []);

  // Register remount with database module so modules can request a refresh
  useEffect(() => {
    registerSQLiteProviderRemount(() => {
      console.log('[DB] registerSQLiteProviderRemount -> invoking refreshDb');
      refreshDb();
    });
  }, [refreshDb]);

  const contextValue = useMemo(() => ({ refreshDb }), [refreshDb]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <DBRefreshContext.Provider value={contextValue}>
        <ProviderWithLogs key={dbKey}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="debtor/[id]" options={{ headerShown: false }} />
          </Stack>
        </ProviderWithLogs>
      </DBRefreshContext.Provider>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#25292e',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
});
