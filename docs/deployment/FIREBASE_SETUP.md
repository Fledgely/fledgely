# Firebase Project Setup

This guide covers setting up Firebase for both local development (emulators) and cloud deployment.

## Prerequisites

1. **Node.js 20+** - Check with `node --version`
2. **Java 21+** - Firebase emulators require Java 21 or higher
   ```bash
   java -version
   # Should show: openjdk version "21.x" or higher
   ```
3. **Firebase CLI** - Already installed as dev dependency

## Java Version Fix

If you see "firebase-tools no longer supports Java version before 21", update your Java:

### macOS (Homebrew)

```bash
brew install openjdk@21
# Or use Zulu distribution
brew install --cask zulu@21
```

### Set JAVA_HOME

Add to your shell profile (~/.zshrc or ~/.bashrc):

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

## Local Development (Emulators)

### Starting Emulators

```bash
# Start all emulators
yarn emulators

# Start with imported data
yarn emulators:import
```

### Emulator Ports

| Service   | Port | URL                   |
| --------- | ---- | --------------------- |
| UI        | 4000 | http://localhost:4000 |
| Firestore | 8080 | http://localhost:8080 |
| Auth      | 9099 | http://localhost:9099 |
| Storage   | 9199 | http://localhost:9199 |
| Functions | 5001 | http://localhost:5001 |
| Hosting   | 5000 | http://localhost:5000 |

### Exporting Emulator Data

To save emulator state for later:

```bash
yarn emulators:export
```

This saves data to `./emulator-data/` directory.

## Cloud Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Name: `fledgely` (or your project name)
4. Disable Google Analytics (not needed initially)
5. Create project

### Step 2: Enable Required Services

In Firebase Console, enable:

1. **Authentication**
   - Go to Authentication > Sign-in method
   - Enable "Google" provider
   - Add authorized domains

2. **Firestore**
   - Go to Firestore Database
   - Click "Create database"
   - Start in production mode (security rules deny all by default)
   - Choose region: `us-central1`

3. **Storage**
   - Go to Storage
   - Click "Get started"
   - Start in production mode
   - Same region as Firestore

4. **Hosting**
   - Automatically configured when deploying

### Step 3: Link Project to CLI

```bash
# Login to Firebase
firebase login

# Select or create project
firebase use --add

# Verify project
firebase projects:list
```

### Step 4: Configure .firebaserc

Ensure `.firebaserc` has correct project:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

## Security Rules Deployment

### Deploy Rules Only

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage

# Deploy both
firebase deploy --only firestore:rules,storage
```

### Rules Location

| Service   | File Path                                 |
| --------- | ----------------------------------------- |
| Firestore | `packages/firebase-rules/firestore.rules` |
| Storage   | `packages/firebase-rules/storage.rules`   |

## CI/CD Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for GitHub Actions deployment setup with Workload Identity Federation.

### Required GitHub Secrets

| Secret                           | Description                  |
| -------------------------------- | ---------------------------- |
| `GCP_PROJECT_ID`                 | Firebase/GCP project ID      |
| `GCP_SERVICE_ACCOUNT`            | Deploy service account email |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | WIF provider resource name   |

## Testing with Emulators

### In Code

```typescript
import { initializeTestApp, clearFirestore, createTestUser } from '@fledgely/test-utils/firebase'

describe('My Feature', () => {
  beforeAll(() => {
    initializeTestApp()
  })

  afterEach(async () => {
    await clearFirestore()
  })

  it('creates a user', async () => {
    const user = await createTestUser('test@example.com', 'password123')
    expect(user.user.email).toBe('test@example.com')
  })
})
```

### Environment Variables

When running tests against emulators, these are set automatically:

- `FIRESTORE_EMULATOR_HOST=localhost:8080`
- `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`
- `FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199`

## Troubleshooting

### Emulator Won't Start

1. **Java version too old**

   ```
   Error: firebase-tools no longer supports Java version before 21
   ```

   Solution: Install Java 21+ (see above)

2. **Port already in use**

   ```
   Error: Could not start Firestore Emulator, port taken
   ```

   Solution: Kill the process using the port or change port in `firebase.json`

3. **Missing emulator binaries**
   ```bash
   firebase setup:emulators:firestore
   firebase setup:emulators:storage
   ```

### Rules Not Loading

1. Verify rule file paths in `firebase.json`
2. Check for syntax errors: `firebase emulators:start` will show parse errors
3. Rules are loaded at emulator start - restart after changes

### Connection Refused

Make sure emulators are running before tests:

```bash
# Terminal 1: Start emulators
yarn emulators

# Terminal 2: Run tests
yarn test
```
