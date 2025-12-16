/**
 * Safety Signal Components
 *
 * Story 7.5.1: Hidden Safety Signal Access
 *
 * Components for enabling safety signal detection in the application.
 *
 * @example
 * ```tsx
 * import {
 *   SafetySignalProvider,
 *   SafetySignalLogo,
 *   SafetySignalConfirmation,
 *   useSafetySignalContext,
 * } from '@/components/safety-signal'
 *
 * function ChildApp({ childId }: { childId: string }) {
 *   return (
 *     <SafetySignalProvider childId={childId}>
 *       <Header>
 *         <SafetySignalLogo>
 *           <img src="/logo.png" alt="Fledgely" />
 *         </SafetySignalLogo>
 *       </Header>
 *       <MainContent />
 *       <SafetySignalConfirmation />
 *     </SafetySignalProvider>
 *   )
 * }
 * ```
 */

export {
  SafetySignalProvider,
  useSafetySignalContext,
  useSafetySignalContextOptional,
} from './SafetySignalProvider'

export { SafetySignalLogo } from './SafetySignalLogo'

export { SafetySignalConfirmation } from './SafetySignalConfirmation'

export { SafetySignalHelp } from './SafetySignalHelp'
