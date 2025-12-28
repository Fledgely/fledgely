# Story 0.2: Firebase Staging Deployment

**Epic:** 0 - Sprint Infrastructure
**Status:** in-progress
**Priority:** BLOCKER - First story to complete

---

## User Story

**As a** developer and stakeholder
**I want** a deployed staging environment
**So that** I can demonstrate and verify that the software actually works

---

## Acceptance Criteria

- [ ] AC1: Firebase project `fledgely-staging` exists and is configured
- [ ] AC2: Web app deployed to Firebase Hosting at https://fledgely-staging.web.app
- [ ] AC3: All Cloud Functions deployed and callable
- [ ] AC4: Firestore security rules deployed
- [ ] AC5: Storage rules deployed
- [ ] AC6: Environment variables configured for staging
- [ ] AC7: Basic smoke test passes (app loads, auth works)

---

## Technical Tasks

- [x] Create firebase.json configuration
- [x] Create .firebaserc with staging project
- [ ] Create Firebase project in console (manual step)
- [ ] Configure environment variables
- [ ] Build web app for production
- [ ] Deploy hosting
- [ ] Deploy functions
- [ ] Deploy Firestore rules
- [ ] Deploy Storage rules
- [ ] Verify deployment

---

## How to Verify

1. Navigate to https://fledgely-staging.web.app
2. Verify the app loads without errors
3. Verify Google Sign-In button appears
4. Check Firebase Console for deployed functions
5. Verify Firestore rules are active

---

## Dependencies

- Firebase project must be created in Firebase Console
- Google Cloud project with billing enabled
- Firebase CLI installed locally

---

## Notes

This is the FIRST story to complete - nothing else proceeds until staging is live.
