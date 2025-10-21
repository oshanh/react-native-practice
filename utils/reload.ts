// Production-safe app reload helper.
// Tries expo-updates when available (works in production),
// falls back to DevSettings.reload() in development.
export async function reloadApp(): Promise<void> {
  try {
    // Dynamically import to avoid hard dependency during compile when not installed
    const Updates: any = await import('expo-updates');
    if (Updates && typeof Updates.reloadAsync === 'function') {
      await Updates.reloadAsync();
      return;
    }
  } catch {
    // ignore and try DevSettings
  }
  try {
    const { DevSettings } = await import('react-native');
    if (DevSettings && typeof DevSettings.reload === 'function') {
      DevSettings.reload();
    }
  } catch {
    // As a last resort, do nothing; user can manually restart the app
  }
}
