# Google Drive Backup Setup Guide

This guide will help you set up automatic Google Drive backups for Debit Manager.

## Prerequisites

- Google Cloud Console account
- Android device or emulator for testing

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.clou
d.google.com/)
2. Create a new project or select an existing one
3. Note your project name and ID

## Step 2: Enable Google Drive API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click on it and press **Enable**

## Step 3: Create OAuth 2.0 Credentials

### For Android:

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Android** as the application type
4. Enter a name (e.g., "Debit Manager Android")
5. Get your SHA-1 fingerprint:
   ```bash
   # For debug build (development)
   cd android
   ./gradlew signingReport
   # Look for SHA-1 under 'Variant: debug'
   ```
6. Enter your package name: `com.oshandev.debitm1`
7. Enter your SHA-1 fingerprint
8. Click **Create**
9. Note the **Client ID** (you won't need the secret for Android)

### For Web Client ID (Required):

1. Click **Create Credentials** > **OAuth client ID** again
2. Select **Web application**
3. Enter a name (e.g., "Debit Manager Web Client")
4. Click **Create**
5. **Copy the Client ID** - this is your **Web Client ID**

## Step 4: Download google-services.json (Optional but Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Add your Google Cloud Project or create a new Firebase project
3. Add an Android app with package name: `com.oshandev.debitm1`
4. Download the `google-services.json` file
5. Place it in the root of your project: `debit-m1/google-services.json`

If you skip this step, remove the `"googleServicesFile"` line from `app.json`.

## Step 5: Update app.json

Edit `app.json` and replace the placeholder values:

```json
"extra": {
  "googleDrive": {
    "webClientId": "YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com",
    "iosClientId": "YOUR_IOS_CLIENT_ID_HERE.apps.googleusercontent.com"
  }
}
```

Replace:
- `YOUR_WEB_CLIENT_ID_HERE` with your Web Client ID from Step 3
- `YOUR_IOS_CLIENT_ID_HERE` with your iOS Client ID (if you plan to support iOS)

## Step 6: Update about.tsx

Edit `app/(tabs)/about.tsx` and update the initialization:

```typescript
await initializeGoogleDrive({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // Use your actual Web Client ID
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});
```

Or better, read it from Constants:

```typescript
const Constants = require('expo-constants');
const extra: any = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};
const webClientId = extra?.googleDrive?.webClientId;

await initializeGoogleDrive({
  webClientId: webClientId,
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});
```

## Step 7: Build and Test

1. Rebuild your app:
   ```bash
   npx expo prebuild --clean
   npx expo run:android
   ```

2. Go to the **About** tab
3. Click **Sign In with Google**
4. Select your Google account
5. Grant permission to access Google Drive
6. Go to the **Home** tab
7. Click **Backup Now**
8. You should see "Backup uploaded to Google Drive successfully! ☁️"

## Step 8: Verify Backup in Google Drive

1. Open Google Drive on your device or web
2. Look for a folder named "Debit Manager Backups"
3. You should see your database backup file with a timestamp

## Troubleshooting

### "Sign in failed" error
- Make sure your SHA-1 fingerprint is correct
- Ensure the package name matches: `com.oshandev.debitm1`
- Try cleaning and rebuilding: `npx expo prebuild --clean`

### "Not signed in to Google Drive"
- The sign-in might have expired
- Go to About tab and sign in again

### "Failed to upload to Google Drive"
- Check your internet connection
- Make sure the Google Drive API is enabled
- Verify the scopes in the initialization

### Plugin errors
- Run `npx expo prebuild --clean` to regenerate native files
- Make sure all packages are installed: `npm install`

## Features

### Automatic Backup
- Backups are automatically uploaded to Google Drive when you click "Backup Now"
- If signed in to Google Drive, it uploads directly
- If not signed in, it falls back to the Android share sheet

### Background Backup
- Background backups (every 6 hours) will also upload to Google Drive if you're signed in
- Otherwise, they're saved locally

### Manual Backup
- You can always use the share sheet to manually choose where to save your backup

## Security Notes

- Only the `drive.file` scope is requested, which means the app can only access files it creates
- Your database backups are stored in a dedicated folder in your Google Drive
- Backups are encrypted in transit (HTTPS)
- You can revoke access anytime from your Google Account settings

## Next Steps

- Set up automatic cleanup of old backups (keep only last 10 backups)
- Add restore from Google Drive functionality
- Add backup scheduling options in settings
