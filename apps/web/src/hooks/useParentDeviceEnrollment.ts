'use client'

/**
 * useParentDeviceEnrollment Hook - Story 32.2
 *
 * Manages parent device enrollment for family offline time.
 *
 * Requirements:
 * - AC1: Parent can add their phone/tablet to offline enforcement
 * - AC2: Enrollment is voluntary but visible to children
 * - AC3: "Mom's phone is enrolled" shown in device list
 * - AC4: Parent compliance tracking enabled (FR60)
 * - AC5: Non-enrolled parent devices noted
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import {
  parentDeviceEnrollmentSchema,
  type ParentDeviceEnrollment,
  type ParentEnrolledDevice,
  type ParentDeviceType,
} from '@fledgely/shared'

export interface EnrollDeviceInput {
  deviceName: string
  deviceType: ParentDeviceType
}

export interface UseParentDeviceEnrollmentReturn {
  /** Full enrollment document */
  enrollment: ParentDeviceEnrollment | null
  /** Devices enrolled by the current user */
  myDevices: ParentEnrolledDevice[]
  /** Devices enrolled by other parents in the family */
  otherParentDevices: ParentEnrolledDevice[]
  /** Loading state */
  loading: boolean
  /** Saving state */
  saving: boolean
  /** Error message if any */
  error: string | null
  /** Enroll a new device for the current parent */
  enrollDevice: (input: EnrollDeviceInput) => Promise<void>
  /** Remove an enrolled device */
  removeDevice: (deviceId: string) => Promise<void>
}

/**
 * Hook for managing parent device enrollment for offline time.
 *
 * @param familyId - The family ID to manage enrollment for
 * @returns Enrollment state and management functions
 */
export function useParentDeviceEnrollment(
  familyId: string | undefined
): UseParentDeviceEnrollmentReturn {
  const { firebaseUser } = useAuth()
  const [enrollment, setEnrollment] = useState<ParentDeviceEnrollment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load enrollment from Firestore with real-time updates
  useEffect(() => {
    if (!familyId) {
      setLoading(false)
      return
    }

    const docRef = doc(getFirestoreDb(), 'families', familyId, 'settings', 'parentDeviceEnrollment')

    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          try {
            const data = snap.data()
            const parsed = parentDeviceEnrollmentSchema.parse(data)
            setEnrollment(parsed)
          } catch (err) {
            console.error('Failed to parse enrollment:', err)
            setError('Failed to load enrollment data')
          }
        } else {
          setEnrollment(null)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Firestore error:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId])

  // Separate devices by parent
  const myDevices = useMemo(() => {
    if (!enrollment || !firebaseUser) return []
    return enrollment.devices.filter((d) => d.parentUid === firebaseUser.uid && d.active)
  }, [enrollment, firebaseUser])

  const otherParentDevices = useMemo(() => {
    if (!enrollment || !firebaseUser) return []
    return enrollment.devices.filter((d) => d.parentUid !== firebaseUser.uid && d.active)
  }, [enrollment, firebaseUser])

  // Enroll a new device
  const enrollDevice = useCallback(
    async (input: EnrollDeviceInput) => {
      if (!familyId || !firebaseUser) {
        setError('Missing family or user context')
        return
      }

      setSaving(true)
      setError(null)

      try {
        const docRef = doc(
          getFirestoreDb(),
          'families',
          familyId,
          'settings',
          'parentDeviceEnrollment'
        )
        const now = Date.now()

        // Validate device name length (prevent UI issues)
        const trimmedName = input.deviceName.trim()
        if (trimmedName.length < 1 || trimmedName.length > 50) {
          setError('Device name must be between 1 and 50 characters')
          setSaving(false)
          return
        }

        // Create new device entry
        const newDevice: ParentEnrolledDevice = {
          deviceId: crypto.randomUUID(),
          parentUid: firebaseUser.uid,
          deviceName: trimmedName,
          deviceType: input.deviceType,
          enrolledAt: now,
          active: true,
        }

        // Get existing enrollment or create new
        const existingSnap = await getDoc(docRef)
        let updatedEnrollment: ParentDeviceEnrollment

        if (existingSnap.exists()) {
          const existing = parentDeviceEnrollmentSchema.parse(existingSnap.data())
          updatedEnrollment = {
            ...existing,
            devices: [...existing.devices, newDevice],
            updatedAt: now,
          }
        } else {
          updatedEnrollment = {
            familyId,
            devices: [newDevice],
            createdAt: now,
            updatedAt: now,
          }
        }

        await setDoc(docRef, updatedEnrollment)
      } catch (err) {
        console.error('Failed to enroll device:', err)
        setError(err instanceof Error ? err.message : 'Failed to enroll device')
      } finally {
        setSaving(false)
      }
    },
    [familyId, firebaseUser]
  )

  // Remove a device from enrollment
  const removeDevice = useCallback(
    async (deviceId: string) => {
      if (!familyId || !firebaseUser || !enrollment) {
        setError('Missing context for removal')
        return
      }

      // Only allow removal of own devices
      const device = enrollment.devices.find((d) => d.deviceId === deviceId)
      if (!device || device.parentUid !== firebaseUser.uid) {
        setError('You can only remove your own devices')
        return
      }

      setSaving(true)
      setError(null)

      try {
        const docRef = doc(
          getFirestoreDb(),
          'families',
          familyId,
          'settings',
          'parentDeviceEnrollment'
        )
        const now = Date.now()

        // Mark device as inactive instead of deleting (for audit trail)
        const updatedDevices = enrollment.devices.map((d) =>
          d.deviceId === deviceId ? { ...d, active: false } : d
        )

        const updatedEnrollment: ParentDeviceEnrollment = {
          ...enrollment,
          devices: updatedDevices,
          updatedAt: now,
        }

        await setDoc(docRef, updatedEnrollment)
      } catch (err) {
        console.error('Failed to remove device:', err)
        setError(err instanceof Error ? err.message : 'Failed to remove device')
      } finally {
        setSaving(false)
      }
    },
    [familyId, firebaseUser, enrollment]
  )

  return {
    enrollment,
    myDevices,
    otherParentDevices,
    loading,
    saving,
    error,
    enrollDevice,
    removeDevice,
  }
}

export default useParentDeviceEnrollment
