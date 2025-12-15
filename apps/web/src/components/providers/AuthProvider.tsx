'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuth, UseAuthReturn } from '@/hooks/useAuth'
import { AuthErrorBoundary } from './AuthErrorBoundary'

/**
 * Auth context for sharing authentication state across components
 */
const AuthContext = createContext<UseAuthReturn | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

/**
 * Internal provider component that uses the auth hook
 */
function AuthProviderInner({ children }: AuthProviderProps) {
  const auth = useAuth()
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

/**
 * Authentication provider component
 *
 * Wraps the application to provide authentication state and methods
 * to all child components via React Context. Includes an error boundary
 * to catch and handle auth-related errors gracefully.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * import { AuthProvider } from '@/components/providers/AuthProvider'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <AuthProvider>{children}</AuthProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AuthErrorBoundary>
      <AuthProviderInner>{children}</AuthProviderInner>
    </AuthErrorBoundary>
  )
}

/**
 * Hook to access authentication context
 *
 * Must be used within an AuthProvider.
 *
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * ```tsx
 * function UserMenu() {
 *   const { user, signOut, loading } = useAuthContext()
 *
 *   if (!user) return null
 *
 *   return (
 *     <div>
 *       <span>{user.displayName}</span>
 *       <button onClick={signOut} disabled={loading}>
 *         Sign Out
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useAuthContext(): UseAuthReturn {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }

  return context
}
