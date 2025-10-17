import { getSQLiteProvider, migrateDbIfNeeded } from "@/database/db";
import { Stack } from "expo-router";
import { Suspense } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
const SQLiteProvider: any = getSQLiteProvider();

// Loading fallback component
function LoadingFallback() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#0a7ea4" />
      <Text style={styles.loadingText}>Loading database...</Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SQLiteProvider databaseName="debitmanager" onInit={migrateDbIfNeeded} useSuspense>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="debtor/[id]" options={{ headerShown: false }} />
        </Stack>
      </SQLiteProvider>
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
