/**
 * Crisis Search Integration Tests
 *
 * Story 7.6: Crisis Search Redirection - Task 9
 *
 * Integration tests for the complete crisis search redirection flow:
 * - Search detection for various keywords
 * - Interstitial display and dismissal
 * - Resource suggestions by category
 * - Zero-data-path verification (NO logging)
 * - Performance requirements (<5ms detection overhead)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'

// Import from shared package
import {
  isCrisisSearchQuery,
  getResourcesForCategory,
  CRISIS_SEARCH_CATEGORIES,
} from '@fledgely/shared'

// Import components and hooks
import { CrisisSearchInterstitial } from '../CrisisSearchInterstitial'
import { CrisisResourceSuggestions } from '../CrisisResourceSuggestions'
import { useCrisisSearchDetection, extractSearchQuery } from '../../../hooks/useCrisisSearchDetection'
import { checkSearchQuery } from '../../../services/crisisProtectionService'

// Mock window.open
const mockOpen = vi.fn()
const originalOpen = window.open

// Track network calls for zero-data-path verification
const networkCalls: { url: string; method: string }[] = []
const originalFetch = global.fetch
const originalSendBeacon = navigator.sendBeacon

beforeEach(() => {
  window.open = mockOpen
  mockOpen.mockClear()
  networkCalls.length = 0

  // Track fetch calls
  global.fetch = vi.fn((...args: Parameters<typeof fetch>) => {
    networkCalls.push({ url: args[0] as string, method: 'fetch' })
    return Promise.resolve(new Response())
  })

  // Track beacon calls
  Object.defineProperty(navigator, 'sendBeacon', {
    value: vi.fn((url: string) => {
      networkCalls.push({ url, method: 'beacon' })
      return true
    }),
    writable: true,
  })
})

afterEach(() => {
  window.open = originalOpen
  global.fetch = originalFetch
  Object.defineProperty(navigator, 'sendBeacon', {
    value: originalSendBeacon,
    writable: true,
  })
})

describe('Crisis Search Integration', () => {
  /**
   * AC: 1 - System recognizes crisis-related search intent
   */
  describe('Search Detection (AC: 1)', () => {
    describe('Suicide-related searches', () => {
      const suicideQueries = [
        'how to kill myself',
        'suicide methods',
        'i want to die',
        'suicidal thoughts',
        'end my life',
        'ways to commit suicide',
      ]

      suicideQueries.forEach((query) => {
        it(`detects suicide intent: "${query}"`, () => {
          const match = isCrisisSearchQuery(query)

          expect(match).not.toBeNull()
          expect(match?.category).toBe('suicide')
        })
      })
    })

    describe('Self-harm searches', () => {
      const selfHarmQueries = ['cutting', 'self harm', 'hurt myself', 'self injury']

      selfHarmQueries.forEach((query) => {
        it(`detects self-harm intent: "${query}"`, () => {
          const match = isCrisisSearchQuery(query)

          expect(match).not.toBeNull()
          expect(match?.category).toBe('self_harm')
        })
      })
    })

    describe('Abuse searches', () => {
      const abuseQueries = ['my parent hits me', 'being abused', 'abusive parent', 'sexual abuse']

      abuseQueries.forEach((query) => {
        it(`detects abuse intent: "${query}"`, () => {
          const match = isCrisisSearchQuery(query)

          expect(match).not.toBeNull()
          expect(match?.category).toBe('abuse')
        })
      })
    })

    describe('Help searches', () => {
      const helpQueries = ['i need help', 'crisis', 'emergency help']

      helpQueries.forEach((query) => {
        it(`detects help intent: "${query}"`, () => {
          const match = isCrisisSearchQuery(query)

          expect(match).not.toBeNull()
          expect(match?.category).toBe('help')
        })
      })
    })

    describe('Non-crisis searches', () => {
      const safeQueries = [
        'cute puppies',
        'how to make cookies',
        'weather today',
        'math homework help',
        'video games',
        'music videos',
      ]

      safeQueries.forEach((query) => {
        it(`does NOT detect crisis intent: "${query}"`, () => {
          const match = isCrisisSearchQuery(query)

          expect(match).toBeNull()
        })
      })
    })
  })

  /**
   * AC: 2 - Gentle redirect suggests allowlisted resources
   */
  describe('Resource Suggestions (AC: 2)', () => {
    it('provides suicide resources for suicide category', () => {
      const resources = getResourcesForCategory('suicide')

      expect(resources.length).toBeGreaterThan(0)
      expect(resources.some((r) => r.includes('988lifeline.org'))).toBe(true)
    })

    it('provides self-harm resources for self_harm category', () => {
      const resources = getResourcesForCategory('self_harm')

      expect(resources.length).toBeGreaterThan(0)
    })

    it('provides abuse resources for abuse category', () => {
      const resources = getResourcesForCategory('abuse')

      expect(resources.length).toBeGreaterThan(0)
      expect(
        resources.some((r) => r.includes('rainn.org') || r.includes('childhelp.org'))
      ).toBe(true)
    })

    it('provides help resources for help category', () => {
      const resources = getResourcesForCategory('help')

      expect(resources.length).toBeGreaterThan(0)
    })
  })

  /**
   * AC: 3 - Redirect is optional, not forced
   */
  describe('Optional Dismissal (AC: 3)', () => {
    it('interstitial can be dismissed to continue to search', () => {
      const onContinue = vi.fn()

      render(
        <CrisisSearchInterstitial
          match={{
            query: 'test',
            category: 'suicide',
            confidence: 'high',
            matchedPattern: 'test',
          }}
          suggestedResources={['988lifeline.org']}
          onContinue={onContinue}
          onResourceClick={vi.fn()}
        />
      )

      const continueButton = screen.getByRole('button', { name: /Continue to Search/i })
      fireEvent.click(continueButton)

      expect(onContinue).toHaveBeenCalled()
    })

    it('resource suggestions component allows interaction without forcing action', () => {
      const { container } = render(
        <CrisisResourceSuggestions category="suicide" />
      )

      // Component renders without blocking or forcing action
      expect(container).toBeInTheDocument()

      // Resources are clickable but not mandatory
      const articles = screen.getAllByRole('article')
      expect(articles.length).toBeGreaterThan(0)
    })
  })

  /**
   * AC: 4 - Redirect action itself is NOT logged to parents
   */
  describe('Zero-Data-Path - No Logging (AC: 4)', () => {
    it('isCrisisSearchQuery makes no network calls', () => {
      networkCalls.length = 0

      isCrisisSearchQuery('how to kill myself')

      expect(networkCalls).toHaveLength(0)
    })

    it('checkSearchQuery makes no network calls', () => {
      networkCalls.length = 0

      checkSearchQuery('suicide')

      expect(networkCalls).toHaveLength(0)
    })

    it('useCrisisSearchDetection hook makes no network calls', () => {
      networkCalls.length = 0

      const { result } = renderHook(() => useCrisisSearchDetection())
      result.current.checkUrl('https://www.google.com/search?q=suicide')

      expect(networkCalls).toHaveLength(0)
    })

    it('CrisisSearchInterstitial makes no network calls on render', () => {
      networkCalls.length = 0

      render(
        <CrisisSearchInterstitial
          match={{
            query: 'test',
            category: 'suicide',
            confidence: 'high',
            matchedPattern: 'test',
          }}
          suggestedResources={['988lifeline.org']}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      expect(networkCalls).toHaveLength(0)
    })

    it('CrisisResourceSuggestions makes no network calls', () => {
      networkCalls.length = 0

      render(<CrisisResourceSuggestions category="suicide" />)

      expect(networkCalls).toHaveLength(0)
    })

    it('no console logging for crisis search queries', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      isCrisisSearchQuery('how to kill myself')
      checkSearchQuery('suicide')
      getResourcesForCategory('suicide')

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  /**
   * AC: 5 - Redirect appears before search results load (interstitial)
   */
  describe('Interstitial Display (AC: 5)', () => {
    it('hook returns shouldShowInterstitial for crisis URL', () => {
      const { result } = renderHook(() => useCrisisSearchDetection())

      const checkResult = result.current.checkUrl(
        'https://www.google.com/search?q=how+to+kill+myself'
      )

      expect(checkResult.shouldShowInterstitial).toBe(true)
      expect(checkResult.match).not.toBeNull()
    })

    it('extracts search query from Google URL', () => {
      const query = extractSearchQuery('https://www.google.com/search?q=test+query')

      expect(query).toBe('test query')
    })

    it('extracts search query from Bing URL', () => {
      const query = extractSearchQuery('https://www.bing.com/search?q=test+query')

      expect(query).toBe('test query')
    })

    it('extracts search query from DuckDuckGo URL', () => {
      const query = extractSearchQuery('https://duckduckgo.com/?q=test+query')

      expect(query).toBe('test query')
    })

    it('extracts search query from Yahoo URL', () => {
      const query = extractSearchQuery('https://search.yahoo.com/search?p=test+query')

      expect(query).toBe('test query')
    })
  })

  /**
   * AC: 6 - Age-appropriate and non-alarming tone
   */
  describe('Age-Appropriate Content (AC: 6)', () => {
    it('interstitial uses gentle language', () => {
      render(
        <CrisisSearchInterstitial
          match={{
            query: 'test',
            category: 'suicide',
            confidence: 'high',
            matchedPattern: 'test',
          }}
          suggestedResources={['988lifeline.org']}
          onContinue={vi.fn()}
          onResourceClick={vi.fn()}
        />
      )

      // Should use "help" not "crisis" or "emergency"
      expect(screen.getByText(/looking for some help/i)).toBeInTheDocument()

      // Should mention privacy
      expect(screen.getByText(/completely private/i)).toBeInTheDocument()
    })

    it('resource descriptions are simple and clear', () => {
      render(<CrisisResourceSuggestions resourceDomains={['988lifeline.org']} />)

      // Simple descriptions
      expect(screen.getByText(/Free, confidential support/i)).toBeInTheDocument()
    })
  })

  /**
   * Performance test - detection should add <5ms overhead
   */
  describe('Performance', () => {
    it('search detection completes in under 5ms', () => {
      const iterations = 100
      const queries = ['how to kill myself', 'cute puppies', 'suicide prevention', 'homework help']

      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        queries.forEach((query) => {
          isCrisisSearchQuery(query)
        })
      }

      const end = performance.now()
      const avgPerQuery = (end - start) / (iterations * queries.length)

      // Average time per query should be under 5ms
      expect(avgPerQuery).toBeLessThan(5)
    })

    it('checkSearchQuery is synchronous', () => {
      const result = checkSearchQuery('suicide')

      // Should not be a Promise
      expect(result).not.toBeInstanceOf(Promise)
      expect(typeof result.shouldShowInterstitial).toBe('boolean')
    })
  })

  /**
   * End-to-end flow tests
   */
  describe('End-to-End Flow', () => {
    it('complete flow: detect crisis search -> show interstitial -> dismiss -> continue', async () => {
      const user = userEvent.setup()

      // 1. Detect crisis search
      const { result } = renderHook(() => useCrisisSearchDetection())
      const checkResult = result.current.checkUrl(
        'https://www.google.com/search?q=how+to+kill+myself'
      )

      expect(checkResult.shouldShowInterstitial).toBe(true)

      // 2. Show interstitial
      const onContinue = vi.fn()
      render(
        <CrisisSearchInterstitial
          match={checkResult.match!}
          suggestedResources={checkResult.suggestedResources}
          onContinue={onContinue}
          onResourceClick={vi.fn()}
        />
      )

      // 3. Verify interstitial is visible
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // 4. Dismiss interstitial
      const continueButton = screen.getByRole('button', { name: /Continue to Search/i })
      await user.click(continueButton)

      // 5. Verify callback was called
      expect(onContinue).toHaveBeenCalled()
    })

    it('complete flow: detect crisis search -> show interstitial -> click resource', async () => {
      const user = userEvent.setup()

      // 1. Detect crisis search
      const match = isCrisisSearchQuery('suicide')
      expect(match).not.toBeNull()

      // 2. Get resources
      const resources = getResourcesForCategory(match!.category)
      expect(resources.length).toBeGreaterThan(0)

      // 3. Show interstitial with resources
      const onResourceClick = vi.fn()
      render(
        <CrisisSearchInterstitial
          match={match!}
          suggestedResources={resources}
          onContinue={vi.fn()}
          onResourceClick={onResourceClick}
        />
      )

      // 4. Click a resource
      const resourceLinks = screen.getAllByRole('link')
      const firstResource = resourceLinks.find((link) =>
        link.getAttribute('href')?.includes('988lifeline.org')
      )

      if (firstResource) {
        await user.click(firstResource)
        expect(onResourceClick).toHaveBeenCalledWith('988lifeline.org')
      }
    })

    it('non-crisis search does not show interstitial', () => {
      const { result } = renderHook(() => useCrisisSearchDetection())

      const checkResult = result.current.checkUrl(
        'https://www.google.com/search?q=cute+puppies'
      )

      expect(checkResult.shouldShowInterstitial).toBe(false)
      expect(checkResult.match).toBeNull()
    })
  })

  /**
   * Category coverage tests
   */
  describe('All Categories Covered', () => {
    Object.keys(CRISIS_SEARCH_CATEGORIES).forEach((category) => {
      it(`has resources for ${category} category`, () => {
        const resources = getResourcesForCategory(category as 'suicide' | 'self_harm' | 'abuse' | 'help')

        expect(resources.length).toBeGreaterThan(0)
      })
    })
  })
})
