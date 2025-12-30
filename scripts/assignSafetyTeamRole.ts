/**
 * Assign safety-team custom claim to a user.
 *
 * Uses Application Default Credentials (gcloud auth application-default login)
 *
 * Usage: npx ts-node scripts/assignSafetyTeamRole.ts <email>
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Initialize with Application Default Credentials
const app = initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GCLOUD_PROJECT || 'fledgely-cns-me',
})

const auth = getAuth(app)

async function assignSafetyTeamRole(userEmail: string) {
  try {
    console.log(`Looking up user: ${userEmail}...`)
    const user = await auth.getUserByEmail(userEmail)

    console.log(`Found user: ${user.uid}`)
    console.log(`Current claims:`, user.customClaims || {})

    // Set custom claims (preserve existing)
    const newClaims = {
      ...user.customClaims,
      'safety-team': true,
    }

    await auth.setCustomUserClaims(user.uid, newClaims)

    console.log(`✅ Assigned safety-team role to ${userEmail}`)
    console.log(`New claims:`, newClaims)
    console.log(`\nNote: User must sign out and back in for claims to take effect.`)
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User not found: ${userEmail}`)
      console.error(`Make sure this email is registered in Firebase Auth.`)
    } else {
      console.error(`❌ Failed:`, error.message)
    }
    process.exit(1)
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'chris@cns.me.uk'

assignSafetyTeamRole(email).then(() => process.exit(0))
