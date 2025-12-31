/**
 * Child Routes Layout - Story 19B.1
 *
 * Wraps all child routes with ChildAuthProvider.
 * Does NOT require parent auth - children use their own auth flow.
 */

import { ChildAuthProvider } from '../../contexts/ChildAuthContext'

export default function ChildLayout({ children }: { children: React.ReactNode }) {
  return <ChildAuthProvider>{children}</ChildAuthProvider>
}
