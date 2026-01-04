# Firebase Authentication Setup

After deploying Fledgely infrastructure with Terraform, you need to complete Firebase Auth configuration manually. This guide walks you through the required steps.

## Why Manual Setup?

Firebase Authentication providers cannot be fully automated via Terraform or API. Google requires manual consent for OAuth configurations to prevent security issues.

## Step 1: Access Firebase Console

1. Open the Firebase Console:

   ```
   https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication/providers
   ```

2. Or navigate manually:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Click **Build** → **Authentication** in the left sidebar

## Step 2: Enable Google Sign-In

1. Click **Get started** (if this is a new project)

2. In the **Sign-in providers** tab, click **Google**

3. Enable the Google provider by clicking the toggle

4. Configure OAuth consent:
   - **Project public-facing name**: Enter your app name (e.g., "Fledgely")
   - **Project support email**: Select your email address

5. Click **Save**

## Step 3: Configure Authorized Domains

The Terraform module automatically adds these domains:

- `YOUR_PROJECT_ID.firebaseapp.com`
- `YOUR_PROJECT_ID.web.app`
- `localhost`

If you're using a custom domain, add it:

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Click **Add domain**
3. Enter your custom domain (e.g., `app.yourdomain.com`)
4. Click **Add**

## Step 4: Get Firebase Configuration

Get your Firebase config for the Chrome extension and web app:

```bash
cd terraform
terraform output -json firebase_config
```

This returns:

```json
{
  "apiKey": "AIza...",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abc123"
}
```

## Step 5: Configure Applications

### Chrome Extension

1. Open `apps/extension/src/config/firebase.ts`
2. Replace the placeholder config with your values:
   ```typescript
   export const firebaseConfig = {
     apiKey: 'YOUR_API_KEY',
     authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
     projectId: 'YOUR_PROJECT_ID',
     storageBucket: 'YOUR_PROJECT_ID.appspot.com',
     messagingSenderId: 'YOUR_SENDER_ID',
     appId: 'YOUR_APP_ID',
   }
   ```

### Web Application

The web app should already be configured if deployed via Cloud Run. If not:

1. Set environment variables in Cloud Run:
   ```bash
   gcloud run services update fledgely-web \
     --set-env-vars="NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY" \
     --set-env-vars="NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com" \
     --set-env-vars="NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID" \
     --project=YOUR_PROJECT_ID \
     --region=us-central1
   ```

## Verification

### Test Authentication Flow

1. Open your web app URL (from `terraform output web_app_url`)
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. Verify you're redirected back to the app

### Check Firebase Console

1. Go to **Authentication** → **Users** in Firebase Console
2. After signing in, you should see your user listed

### API Verification

Test the API accepts authenticated requests:

```bash
# Get an ID token from your authenticated session
# Then test the API
curl -H "Authorization: Bearer YOUR_ID_TOKEN" \
  $(terraform output -raw functions_url)/health
```

## Troubleshooting

### "This domain is not authorized"

Add your domain to authorized domains in Firebase Console:

- **Authentication** → **Settings** → **Authorized domains**

### "Access blocked: Authorization error"

1. Verify OAuth consent screen is configured in GCP Console
2. Check that Google sign-in is enabled in Firebase
3. Ensure your email is added as a test user if app is in testing mode

### "Invalid API key"

1. Verify you copied the correct API key from `terraform output -json firebase_config`
2. Check the API key restrictions in GCP Console → **APIs & Services** → **Credentials**

### User appears but can't access data

Check Firestore security rules allow the user's UID:

```bash
# View Firestore rules
gcloud firestore databases describe --project=YOUR_PROJECT_ID
```

## OAuth Consent Screen (Optional)

For production apps with external users:

1. Go to [GCP Console](https://console.cloud.google.com) → **APIs & Services** → **OAuth consent screen**

2. Configure the consent screen:
   - **App name**: Fledgely
   - **User support email**: Your email
   - **App logo**: Upload your logo (optional)
   - **Application home page**: Your app URL
   - **Application privacy policy link**: Your privacy policy URL
   - **Application terms of service link**: Your ToS URL

3. Add scopes:
   - `email`
   - `profile`
   - `openid`

4. For production, submit for verification

## Security Recommendations

1. **Restrict API keys**: In GCP Console, restrict your API key to only the APIs you need

2. **Enable app verification**: For production, complete Google's app verification process

3. **Monitor authentication**: Set up Firebase Auth alerts for suspicious activity

4. **Regular audits**: Periodically review authorized domains and connected apps

## Related Documentation

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Google Sign-In for Web](https://developers.google.com/identity/sign-in/web)
- [OAuth 2.0 for Client-side Web Apps](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
