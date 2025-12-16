/**
 * Tests for useCanProceedToSigning Hook
 *
 * Story 5.4: Negotiation & Discussion Support - Task 8.6
 *
 * Tests for the signing gate hook and component.
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import {
  useCanProceedToSigning,
  getSigningGateStatus,
  SigningGate,
} from '../useCanProceedToSigning'
import type { CoCreationSession, SessionTerm, ResolutionStatus } from '@fledgely/contracts'

// ============================================
// TEST FIXTURES
// ============================================

const createTerm = (overrides: Partial<SessionTerm> = {}): SessionTerm =>
  ({
    id: crypto.randomUUID(),
    type: 'screen_time',
    content: { duration: 60, unit: 'minutes' },
    status: 'accepted',
    addedBy: 'parent',
    resolutionStatus: 'unresolved',
    discussionNotes: [],
    ...overrides,
  }) as SessionTerm

const createSession = (
  terms: SessionTerm[] = [],
  overrides: Partial<CoCreationSession> = {}
): CoCreationSession =>
  ({
    id: 'session-1',
    familyId: 'family-1',
    agreementId: 'agreement-1',
    status: 'building',
    terms,
    participants: {
      parentUserId: 'parent-1',
      childId: 'child-1',
    },
    startedAt: new Date().toISOString(),
    ...overrides,
  }) as CoCreationSession

// ============================================
// HOOK TESTS
// ============================================

describe('useCanProceedToSigning', () => {
  describe('with no session', () => {
    it('returns cannot proceed for null session', () => {
      const { result } = renderHook(() => useCanProceedToSigning(null))

      expect(result.current.canProceed).toBe(false)
      expect(result.current.message).toBe('No session available')
    })

    it('returns cannot proceed for undefined session', () => {
      const { result } = renderHook(() => useCanProceedToSigning(undefined))

      expect(result.current.canProceed).toBe(false)
    })

    it('returns empty unresolved arrays', () => {
      const { result } = renderHook(() => useCanProceedToSigning(null))

      expect(result.current.unresolvedCount).toBe(0)
      expect(result.current.unresolvedTerms).toHaveLength(0)
      expect(result.current.unresolvedTermIds).toHaveLength(0)
    })
  })

  describe('with no discussion terms', () => {
    it('can proceed when all terms are accepted', () => {
      const terms = [
        createTerm({ status: 'accepted' }),
        createTerm({ status: 'accepted' }),
      ]
      const session = createSession(terms)

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.canProceed).toBe(true)
    })

    it('returns ready message', () => {
      const session = createSession([createTerm({ status: 'accepted' })])

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.message).toBe('Ready to sign')
    })

    it('can proceed with empty terms array', () => {
      const session = createSession([])

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.canProceed).toBe(true)
    })
  })

  describe('with resolved discussion terms', () => {
    it('can proceed when all discussion terms are resolved', () => {
      const terms = [
        createTerm({ status: 'discussion', resolutionStatus: 'resolved' }),
        createTerm({ status: 'discussion', resolutionStatus: 'resolved' }),
      ]
      const session = createSession(terms)

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.canProceed).toBe(true)
    })
  })

  describe('with unresolved discussion terms', () => {
    it('cannot proceed with unresolved terms', () => {
      const terms = [
        createTerm({ status: 'discussion', resolutionStatus: 'unresolved' }),
      ]
      const session = createSession(terms)

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.canProceed).toBe(false)
    })

    it('returns correct unresolved count', () => {
      const terms = [
        createTerm({ status: 'discussion', resolutionStatus: 'unresolved' }),
        createTerm({ status: 'discussion', resolutionStatus: 'parent-agreed' }),
        createTerm({ status: 'discussion', resolutionStatus: 'child-agreed' }),
        createTerm({ status: 'discussion', resolutionStatus: 'resolved' }),
      ]
      const session = createSession(terms)

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.unresolvedCount).toBe(3)
    })

    it('returns unresolved term IDs', () => {
      const unresolvedTerm = createTerm({
        id: 'unresolved-term',
        status: 'discussion',
        resolutionStatus: 'unresolved',
      })
      const session = createSession([unresolvedTerm])

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.unresolvedTermIds).toContain('unresolved-term')
    })

    it('returns unresolved term objects', () => {
      const unresolvedTerm = createTerm({
        status: 'discussion',
        resolutionStatus: 'unresolved',
      })
      const session = createSession([unresolvedTerm])

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.unresolvedTerms).toHaveLength(1)
      expect(result.current.unresolvedTerms[0].id).toBe(unresolvedTerm.id)
    })
  })

  describe('messages', () => {
    it('returns singular message for 1 unresolved term', () => {
      const terms = [
        createTerm({ status: 'discussion', resolutionStatus: 'unresolved' }),
      ]
      const session = createSession(terms)

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.message).toBe('Resolve 1 term before signing')
    })

    it('returns plural message for multiple unresolved terms', () => {
      const terms = [
        createTerm({ status: 'discussion', resolutionStatus: 'unresolved' }),
        createTerm({ status: 'discussion', resolutionStatus: 'parent-agreed' }),
        createTerm({ status: 'discussion', resolutionStatus: 'child-agreed' }),
      ]
      const session = createSession(terms)

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.message).toBe('Resolve 3 terms before signing')
    })

    it('returns a11y message', () => {
      const terms = [
        createTerm({ status: 'discussion', resolutionStatus: 'unresolved' }),
      ]
      const session = createSession(terms)

      const { result } = renderHook(() => useCanProceedToSigning(session))

      expect(result.current.a11yMessage).toContain('Cannot proceed')
    })
  })

  describe('memoization', () => {
    it('returns same object when session unchanged', () => {
      const session = createSession([])
      const { result, rerender } = renderHook(() =>
        useCanProceedToSigning(session)
      )

      const firstResult = result.current
      rerender()
      const secondResult = result.current

      expect(firstResult).toBe(secondResult)
    })
  })
})

// ============================================
// STANDALONE FUNCTION TESTS
// ============================================

describe('getSigningGateStatus', () => {
  it('returns same result as hook', () => {
    const terms = [
      createTerm({ status: 'discussion', resolutionStatus: 'unresolved' }),
    ]
    const session = createSession(terms)

    const fnResult = getSigningGateStatus(session)
    const { result } = renderHook(() => useCanProceedToSigning(session))

    expect(fnResult.canProceed).toBe(result.current.canProceed)
    expect(fnResult.unresolvedCount).toBe(result.current.unresolvedCount)
    expect(fnResult.message).toBe(result.current.message)
  })

  it('works without React', () => {
    const session = createSession([])
    const result = getSigningGateStatus(session)

    expect(result.canProceed).toBe(true)
    expect(result.message).toBe('Ready to sign')
  })
})

// ============================================
// COMPONENT TESTS
// ============================================

describe('SigningGate component', () => {
  describe('when can proceed', () => {
    it('renders children', () => {
      const session = createSession([])

      render(
        <SigningGate session={session}>
          <div data-testid="child-content">Signing Form</div>
        </SigningGate>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
    })

    it('does not render fallback', () => {
      const session = createSession([])

      render(
        <SigningGate session={session} fallback={<div data-testid="fallback" />}>
          <div>Signing Form</div>
        </SigningGate>
      )

      expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
    })
  })

  describe('when blocked', () => {
    it('renders fallback when provided', () => {
      const terms = [
        createTerm({ status: 'discussion', resolutionStatus: 'unresolved' }),
      ]
      const session = createSession(terms)

      render(
        <SigningGate
          session={session}
          fallback={<div data-testid="custom-fallback">Custom blocked</div>}
        >
          <div data-testid="child-content">Signing Form</div>
        </SigningGate>
      )

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.queryByTestId('child-content')).not.toBeInTheDocument()
    })

    it('renders default blocked message when no fallback', () => {
      const terms = [
        createTerm({ status: 'discussion', resolutionStatus: 'unresolved' }),
      ]
      const session = createSession(terms)

      render(
        <SigningGate session={session}>
          <div>Signing Form</div>
        </SigningGate>
      )

      expect(screen.getByTestId('signing-gate-blocked')).toBeInTheDocument()
    })

    it('shows unresolved message', () => {
      const terms = [
        createTerm({ status: 'discussion', resolutionStatus: 'unresolved' }),
        createTerm({ status: 'discussion', resolutionStatus: 'parent-agreed' }),
      ]
      const session = createSession(terms)

      render(
        <SigningGate session={session}>
          <div>Signing Form</div>
        </SigningGate>
      )

      expect(screen.getByText(/Resolve 2 terms before signing/)).toBeInTheDocument()
    })

    it('has alert role for accessibility', () => {
      const terms = [
        createTerm({ status: 'discussion', resolutionStatus: 'unresolved' }),
      ]
      const session = createSession(terms)

      render(
        <SigningGate session={session}>
          <div>Signing Form</div>
        </SigningGate>
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('calls onBlocked callback with unresolved terms', () => {
      const onBlocked = vi.fn()
      const unresolvedTerm = createTerm({
        status: 'discussion',
        resolutionStatus: 'unresolved',
      })
      const session = createSession([unresolvedTerm])

      render(
        <SigningGate session={session} onBlocked={onBlocked}>
          <div>Signing Form</div>
        </SigningGate>
      )

      expect(onBlocked).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: unresolvedTerm.id }),
        ])
      )
    })
  })
})
