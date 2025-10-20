# Quick Start - Google Drive Setup

## 1. Get Your Web Client ID (5 minutes)

### Option A: Use Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create OAuth Client ID → Web application
3. Copy the Client ID

### Option B: Use Firebase (Easier for beginners)
1. Go to: https://console.firebase.google.com/
2. Add project
3. Add Android app: `com.oshandev.debitm1`
4. In Project Settings → General → Web API Key is there
5. Create OAuth client in Google Cloud Console linked to this project

## 2. Get SHA-1 Fingerprint

```bash
cd android
./gradlew signingReport
```

Copy the SHA-1 from "Variant: debug, Config: debug"

## 3. Create Android OAuth Client

1. Google Cloud Console → Credentials → Create → OAuth Client ID → Android
2. Package name: `com.oshandev.debitm1`
3. SHA-1: (paste from step 2)
4. Create

## 4. Update app.json

Replace this in `app.json`:

```json
"googleDrive": {
  "webClientId": "PASTE_YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com"
}
```

## 5. Rebuild and Test

```bash
npx expo prebuild --clean
npx expo run:android
```

Then:
1. Open app → About tab
2. Sign In with Google
3. Home tab → Backup Now
4. Check Google Drive for "Debit Manager Backups" folder

## ⚠️ Common Issues

**"Sign in failed"**: 
- SHA-1 fingerprint is wrong → Run `gradlew signingReport` again
- Package name mismatch → Make sure it's `com.oshandev.debitm1`

**"Plugin error"**:
- Run: `npx expo prebuild --clean`

**"Module not found"**:
- Run: `npm install`
- Then: `npx expo prebuild --clean`

## 🎯 That's it!

Your app will now automatically backup to Google Drive when users sign in!
