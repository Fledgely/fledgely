/**
 * useFocusModeConfig Hook - Story 33.2
 *
 * Manages focus mode app configuration for parents.
 * Allows customizing allowed/blocked apps during focus mode.
 */

import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { FocusModeConfig, FocusModeAppEntry } from '@fledgely/shared'
import { FOCUS_MODE_DEFAULT_APPS } from '@fledgely/shared'

interface UseFocusModeConfigOptions {
  childId: string | null
  familyId: string | null
  parentUid: string | null
}

interface UseFocusModeConfigReturn {
  config: FocusModeConfig | null
  loading: boolean
  error: string | null
  // Config actions
  addToAllowList: (pattern: string, name: string) => Promise<void>
  addToBlockList: (pattern: string, name: string) => Promise<void>
  removeFromAllowList: (pattern: string) => Promise<void>
  removeFromBlockList: (pattern: string) => Promise<void>
  toggleDefaultCategories: (enabled: boolean) => Promise<void>
  toggleCategory: (category: string, type: 'allowed' | 'blocked') => Promise<void>
  // Computed values
  effectiveAllowList: { pattern: string; name: string; isDefault: boolean }[]
  effectiveBlockList: { pattern: string; name: string; isDefault: boolean }[]
}

const DEFAULT_CONFIG: Omit<FocusModeConfig, 'childId' | 'familyId'> = {
  useDefaultCategories: true,
  customAllowList: [],
  customBlockList: [],
  allowedCategories: [],
  blockedCategories: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
}

/**
 * Get all apps from default categories
 */
function getDefaultApps(
  type: 'allowed' | 'blocked',
  excludedCategories: string[] = []
): { pattern: string; name: string }[] {
  const categories =
    type === 'allowed' ? FOCUS_MODE_DEFAULT_APPS.allowed : FOCUS_MODE_DEFAULT_APPS.blocked

  const apps: { pattern: string; name: string }[] = []
  for (const [category, appList] of Object.entries(categories)) {
    if (!excludedCategories.includes(category)) {
      apps.push(...appList)
    }
  }
  return apps
}

export function useFocusModeConfig({
  childId,
  familyId,
  parentUid,
}: UseFocusModeConfigOptions): UseFocusModeConfigReturn {
  const [config, setConfig] = useState<FocusModeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to focus mode config
  useEffect(() => {
    if (!childId || !familyId) {
      setLoading(false)
      return
    }

    const configRef = doc(getFirestoreDb(), 'families', familyId, 'focusModeConfig', childId)

    const unsubscribe = onSnapshot(
      configRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setConfig(snapshot.data() as FocusModeConfig)
        } else {
          // Initialize config if it doesn't exist
          const initialConfig: FocusModeConfig = {
            ...DEFAULT_CONFIG,
            childId,
            familyId,
            updatedAt: Date.now(),
          }
          setDoc(configRef, initialConfig)
          setConfig(initialConfig)
        }
        setLoading(false)
      },
      (err) => {
        console.error('[useFocusModeConfig] Error:', err)
        setError('Failed to load focus mode configuration')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [childId, familyId])

  // Add app to allow list
  const addToAllowList = useCallback(
    async (pattern: string, name: string) => {
      if (!childId || !familyId || !parentUid) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'focusModeConfig', childId)
      const entry: FocusModeAppEntry = {
        pattern,
        name,
        isWildcard: pattern.startsWith('*.'),
        addedAt: Date.now(),
        addedByUid: parentUid,
      }

      await updateDoc(configRef, {
        customAllowList: arrayUnion(entry),
        updatedAt: Date.now(),
      })
    },
    [childId, familyId, parentUid]
  )

  // Add app to block list
  const addToBlockList = useCallback(
    async (pattern: string, name: string) => {
      if (!childId || !familyId || !parentUid) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'focusModeConfig', childId)
      const entry: FocusModeAppEntry = {
        pattern,
        name,
        isWildcard: pattern.startsWith('*.'),
        addedAt: Date.now(),
        addedByUid: parentUid,
      }

      await updateDoc(configRef, {
        customBlockList: arrayUnion(entry),
        updatedAt: Date.now(),
      })
    },
    [childId, familyId, parentUid]
  )

  // Remove app from allow list
  const removeFromAllowList = useCallback(
    async (pattern: string) => {
      if (!childId || !familyId || !config) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'focusModeConfig', childId)
      const entryToRemove = config.customAllowList.find((e) => e.pattern === pattern)

      if (entryToRemove) {
        await updateDoc(configRef, {
          customAllowList: arrayRemove(entryToRemove),
          updatedAt: Date.now(),
        })
      }
    },
    [childId, familyId, config]
  )

  // Remove app from block list
  const removeFromBlockList = useCallback(
    async (pattern: string) => {
      if (!childId || !familyId || !config) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'focusModeConfig', childId)
      const entryToRemove = config.customBlockList.find((e) => e.pattern === pattern)

      if (entryToRemove) {
        await updateDoc(configRef, {
          customBlockList: arrayRemove(entryToRemove),
          updatedAt: Date.now(),
        })
      }
    },
    [childId, familyId, config]
  )

  // Toggle default categories on/off
  const toggleDefaultCategories = useCallback(
    async (enabled: boolean) => {
      if (!childId || !familyId) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'focusModeConfig', childId)

      await updateDoc(configRef, {
        useDefaultCategories: enabled,
        updatedAt: Date.now(),
      })
    },
    [childId, familyId]
  )

  // Toggle a category between allowed/blocked
  const toggleCategory = useCallback(
    async (category: string, type: 'allowed' | 'blocked') => {
      if (!childId || !familyId || !config) return

      const configRef = doc(getFirestoreDb(), 'families', familyId, 'focusModeConfig', childId)

      if (type === 'allowed') {
        // Moving from blocked to allowed
        const allowedCategories = config.allowedCategories || []
        const blockedCategories = config.blockedCategories || []

        if (allowedCategories.includes(category)) {
          // Remove from allowed
          await updateDoc(configRef, {
            allowedCategories: arrayRemove(category),
            updatedAt: Date.now(),
          })
        } else {
          // Add to allowed (and remove from blocked if present)
          const updates: Record<string, unknown> = {
            allowedCategories: arrayUnion(category),
            updatedAt: Date.now(),
          }
          if (blockedCategories.includes(category)) {
            updates.blockedCategories = arrayRemove(category)
          }
          await updateDoc(configRef, updates)
        }
      } else {
        // Moving from allowed to blocked
        const allowedCategories = config.allowedCategories || []
        const blockedCategories = config.blockedCategories || []

        if (blockedCategories.includes(category)) {
          // Remove from blocked
          await updateDoc(configRef, {
            blockedCategories: arrayRemove(category),
            updatedAt: Date.now(),
          })
        } else {
          // Add to blocked (and remove from allowed if present)
          const updates: Record<string, unknown> = {
            blockedCategories: arrayUnion(category),
            updatedAt: Date.now(),
          }
          if (allowedCategories.includes(category)) {
            updates.allowedCategories = arrayRemove(category)
          }
          await updateDoc(configRef, updates)
        }
      }
    },
    [childId, familyId, config]
  )

  // Compute effective allow list
  const effectiveAllowList = useCallback(() => {
    if (!config) return []

    const apps: { pattern: string; name: string; isDefault: boolean }[] = []

    // Add default apps if enabled
    if (config.useDefaultCategories) {
      const defaultAllowed = getDefaultApps('allowed', config.blockedCategories || [])
      apps.push(...defaultAllowed.map((app) => ({ ...app, isDefault: true })))

      // Add any default-blocked categories that are now allowed
      const allowedCategories = config.allowedCategories || []
      for (const category of allowedCategories) {
        if (category in FOCUS_MODE_DEFAULT_APPS.blocked) {
          const categoryApps =
            FOCUS_MODE_DEFAULT_APPS.blocked[
              category as keyof typeof FOCUS_MODE_DEFAULT_APPS.blocked
            ]
          apps.push(...categoryApps.map((app) => ({ ...app, isDefault: true })))
        }
      }
    }

    // Add custom apps
    apps.push(...config.customAllowList.map((app) => ({ ...app, isDefault: false })))

    // Remove duplicates by pattern
    const seen = new Set<string>()
    return apps.filter((app) => {
      if (seen.has(app.pattern)) return false
      seen.add(app.pattern)
      return true
    })
  }, [config])

  // Compute effective block list
  const effectiveBlockList = useCallback(() => {
    if (!config) return []

    const apps: { pattern: string; name: string; isDefault: boolean }[] = []

    // Add default apps if enabled
    if (config.useDefaultCategories) {
      const defaultBlocked = getDefaultApps('blocked', config.allowedCategories || [])
      apps.push(...defaultBlocked.map((app) => ({ ...app, isDefault: true })))

      // Add any default-allowed categories that are now blocked
      const blockedCategories = config.blockedCategories || []
      for (const category of blockedCategories) {
        if (category in FOCUS_MODE_DEFAULT_APPS.allowed) {
          const categoryApps =
            FOCUS_MODE_DEFAULT_APPS.allowed[
              category as keyof typeof FOCUS_MODE_DEFAULT_APPS.allowed
            ]
          apps.push(...categoryApps.map((app) => ({ ...app, isDefault: true })))
        }
      }
    }

    // Add custom apps
    apps.push(...config.customBlockList.map((app) => ({ ...app, isDefault: false })))

    // Remove duplicates by pattern
    const seen = new Set<string>()
    return apps.filter((app) => {
      if (seen.has(app.pattern)) return false
      seen.add(app.pattern)
      return true
    })
  }, [config])

  return {
    config,
    loading,
    error,
    addToAllowList,
    addToBlockList,
    removeFromAllowList,
    removeFromBlockList,
    toggleDefaultCategories,
    toggleCategory,
    effectiveAllowList: effectiveAllowList(),
    effectiveBlockList: effectiveBlockList(),
  }
}
