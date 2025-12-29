# Story 13.6: TOTP Secret Recovery

Status: done

## Story

As a **parent**,
I want **to regenerate the emergency code secret if compromised**,
So that **security can be restored**.

## Acceptance Criteria

1. **AC1: Reset Button in Device Settings**
   - Given parent is viewing device details
   - When parent clicks "Reset Emergency Codes"
   - Then confirmation dialog appears
   - And warns that current codes will stop working

2. **AC2: New Secret Generation**
   - Given parent confirms reset
   - When reset is triggered
   - Then new TOTP secret is generated for device
   - And secret is stored encrypted in Firestore

3. **AC3: Old Secret Invalidation**
   - Given new secret is generated
   - When device connects to network
   - Then device receives new secret
   - And old codes stop working immediately

4. **AC4: Device Online Requirement**
   - Given device is offline
   - When parent resets secret
   - Then parent is warned device must come online
   - And old codes remain active until device syncs

5. **AC5: Reset Event Logging**
   - Given secret is reset
   - When operation completes
   - Then reset event is logged in audit trail
   - And event includes: resetter uid, deviceId, timestamp

## Tasks / Subtasks

- [x] Task 1: Reset UI in Dashboard (AC: #1)
  - [x] 1.1 Add "Reset Emergency Codes" button to device details
  - [x] 1.2 Create confirmation dialog with warning
  - [x] 1.3 Require re-authentication before reset

- [x] Task 2: Secret Regeneration Service (AC: #2)
  - [x] 2.1 Create resetTotpSecret function in deviceService
  - [x] 2.2 Generate new Base32 secret
  - [x] 2.3 Update device document with new encrypted secret
  - [x] 2.4 Increment secret version to invalidate old

- [x] Task 3: Audit Logging (AC: #5)
  - [x] 3.1 Log totp_secret_reset event to auditLogs
  - [x] 3.2 Include resetterUid, deviceId, timestamp

- [x] Task 4: Unit Tests
  - [x] 4.1 Test reset function
  - [x] 4.2 Test confirmation flow
  - [x] 4.3 Test audit logging

## Dev Notes

### Implementation Strategy

This story adds a "Reset Emergency Codes" button to the device management UI in the web dashboard. When clicked, it:

1. Shows confirmation dialog warning that codes will stop working
2. Re-authenticates the parent (using ReauthModal from Story 13.2)
3. Generates a new TOTP secret
4. Updates the device document in Firestore
5. Logs the reset event

The extension will receive the new secret on next sync and update its local storage.

### Key Requirements

- **FR90:** Offline OTP device unlock (with recovery)
- **NFR42:** Security - secret rotation capability

### Technical Details

#### Reset Function

```typescript
async function resetTotpSecret(familyId: string, deviceId: string): Promise<void> {
  // Generate new secret
  const newSecret = generateBase32Secret(32)

  // Update device document
  await updateDoc(deviceRef, {
    totpSecret: newSecret,
    totpSecretVersion: increment(1),
    totpSecretResetAt: serverTimestamp(),
  })

  // Log audit event
  await logTotpSecretReset(familyId, deviceId, currentUser.uid)
}
```

### Project Structure Notes

- Enhance: `apps/web/src/services/deviceService.ts`
- Enhance: `apps/web/src/components/devices/DevicesList.tsx`
- Uses: ReauthModal from Story 13.2

### References

- [Source: docs/epics/epic-list.md#Story-13.6]
- [Pattern: apps/web/src/components/devices/EmergencyCodeModal.tsx]
- [Pattern: apps/web/src/components/auth/ReauthModal.tsx]

### Security Considerations

1. **Re-authentication required**: Parent must confirm identity
2. **Immediate invalidation**: Old codes stop working on device sync
3. **Audit trail**: All resets are logged
