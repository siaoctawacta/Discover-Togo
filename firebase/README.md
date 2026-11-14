# Firebase configuration

| File | Purpose |
|---|---|
| `storage.rules` | Cloud Storage: public-read listing photos, staff-only uploads (≤5 MB JPEG/PNG/WebP), per-user avatars, everything else denied. |
| `firestore.rules` | Deny-all (data lives in MongoDB behind the API). |

Deploy: `firebase deploy --only storage,firestore:rules`

## Console hardening checklist

- **Authentication → Sign-in methods:** enable Email/Password and Google only. Turn on **email enumeration protection**. Require email verification before reviews are allowed (the API already enforces this).
- **Authentication → Settings → Authorized domains:** remove `localhost` in production and keep only your own domains.
- **Password policy:** require at least 10 characters with mixed character types.
- **App Check:** enforce App Check for Auth and Storage. Use Play Integrity on Android, App Attest/DeviceCheck on iOS and reCAPTCHA Enterprise on web.
- **API keys (Google Cloud console → Credentials):** restrict the Android key by package name + SHA-1, the iOS key by bundle ID and the web key by HTTP referrer. Limit each key to the APIs it needs (Identity Toolkit, Maps SDK, Firebase Installations).
- **Service account for the API:** grant only the *Firebase Authentication Admin* role. Store the account in Secret Manager and never commit it.
- **Budget alerts:** set them on Maps and Storage egress to detect scraping or abuse early.
