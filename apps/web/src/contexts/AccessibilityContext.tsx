'use client'

/**
 * Accessibility Context - Story 28.6
 *
 * Provides accessibility settings to all components.
 * Manages user preferences for:
 * - Always show descriptions (AC1)
 * - High contrast mode (AC2)
 * - Larger text (AC3)
 * - Audio descriptions (AC4)
 * - Settings sync across devices (AC5)
 * - OS preference detection (AC6)
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore'
import { getFirebaseApp } from '../lib/firebase'
import { useAuth } from './AuthContext'
import { type AccessibilitySettings, DEFAULT_ACCESSIBILITY_SETTINGS } from '@fledgely/shared'

interface AccessibilityContextType {
  /** Current accessibility settings */
  settings: AccessibilitySettings
  /** Whether settings are loading */
  loading: boolean
  /** Update a single setting */
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => Promise<void>
  /** Update all settings */
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => Promise<void>
  /** Whether OS prefers reduced motion */
  prefersReducedMotion: boolean
  /** Whether OS prefers high contrast */
  prefersHighContrast: boolean
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

interface AccessibilityProviderProps {
  children: ReactNode
}

/**
 * Detect OS accessibility preferences.
 * Story 28.6 AC6: Settings detectable from OS accessibility preferences.
 */
function useOSAccessibilityPreferences() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [prefersHighContrast, setPrefersHighContrast] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check prefers-reduced-motion
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(reducedMotionQuery.matches)

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange)

    // Check prefers-contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: more)')
    setPrefersHighContrast(contrastQuery.matches)

    const handleContrastChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches)
    }
    contrastQuery.addEventListener('change', handleContrastChange)

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
      contrastQuery.removeEventListener('change', handleContrastChange)
    }
  }, [])

  return { prefersReducedMotion, prefersHighContrast }
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const { user } = useAuth()
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY_SETTINGS)
  const [loading, setLoading] = useState(true)
  const { prefersReducedMotion, prefersHighContrast } = useOSAccessibilityPreferences()

  // Load settings from Firestore when user changes
  useEffect(() => {
    async function loadSettings() {
      if (!user?.uid) {
        // Use OS preferences as defaults for non-authenticated users
        setSettings({
          ...DEFAULT_ACCESSIBILITY_SETTINGS,
          alwaysShowDescriptions: prefersReducedMotion,
          highContrastMode: prefersHighContrast,
        })
        setLoading(false)
        return
      }

      try {
        const firebaseApp = getFirebaseApp()
        const db = getFirestore(firebaseApp)
        const settingsDocRef = doc(db, 'users', user.uid, 'settings', 'accessibility')
        const settingsDoc = await getDoc(settingsDocRef)

        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as AccessibilitySettings
          setSettings({
            ...DEFAULT_ACCESSIBILITY_SETTINGS,
            ...data,
          })
        } else {
          // Initialize with OS preferences for new users
          const initialSettings = {
            ...DEFAULT_ACCESSIBILITY_SETTINGS,
            alwaysShowDescriptions: prefersReducedMotion,
            highContrastMode: prefersHighContrast,
          }
          setSettings(initialSettings)
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading accessibility settings:', error)
        // Fallback to defaults with OS preferences
        setSettings({
          ...DEFAULT_ACCESSIBILITY_SETTINGS,
          alwaysShowDescriptions: prefersReducedMotion,
          highContrastMode: prefersHighContrast,
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [user?.uid, prefersReducedMotion, prefersHighContrast])

  // Update a single setting
  const updateSetting = useCallback(
    async <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
      if (!user?.uid) return

      const newSettings = {
        ...settings,
        [key]: value,
        updatedAt: Date.now(),
      }
      setSettings(newSettings)

      try {
        const firebaseApp = getFirebaseApp()
        const db = getFirestore(firebaseApp)
        const settingsDocRef = doc(db, 'users', user.uid, 'settings', 'accessibility')
        await setDoc(settingsDocRef, newSettings, { merge: true })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error saving accessibility setting:', error)
        // Revert on error
        setSettings(settings)
      }
    },
    [user?.uid, settings]
  )

  // Update multiple settings at once
  const updateSettings = useCallback(
    async (newSettings: Partial<AccessibilitySettings>) => {
      if (!user?.uid) return

      const mergedSettings = {
        ...settings,
        ...newSettings,
        updatedAt: Date.now(),
      }
      setSettings(mergedSettings)

      try {
        const firebaseApp = getFirebaseApp()
        const db = getFirestore(firebaseApp)
        const settingsDocRef = doc(db, 'users', user.uid, 'settings', 'accessibility')
        await setDoc(settingsDocRef, mergedSettings, { merge: true })
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error saving accessibility settings:', error)
        // Revert on error
        setSettings(settings)
      }
    },
    [user?.uid, settings]
  )

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        loading,
        updateSetting,
        updateSettings,
        prefersReducedMotion,
        prefersHighContrast,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

/**
 * Hook to access accessibility settings.
 */
export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}
