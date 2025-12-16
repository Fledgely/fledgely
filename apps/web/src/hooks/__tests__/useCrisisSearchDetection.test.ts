/**
 * useCrisisSearchDetection Hook Tests
 *
 * Story 7.6: Crisis Search Redirection - Task 4
 *
 * Tests for the crisis search detection hook.
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useCrisisSearchDetection,
  extractSearchQuery,
  isSearchEngineUrl,
  SEARCH_ENGINE_PATTERNS,
} from '../useCrisisSearchDetection'

describe('Search Engine Detection', () => {
  describe('SEARCH_ENGINE_PATTERNS', () => {
    it('includes Google', () => {
      expect(SEARCH_ENGINE_PATTERNS).toContainEqual(
        expect.objectContaining({ domain: 'google.com' })
      )
    })

    it('includes Bing', () => {
      expect(SEARCH_ENGINE_PATTERNS).toContainEqual(
        expect.objectContaining({ domain: 'bing.com' })
      )
    })

    it('includes DuckDuckGo', () => {
      expect(SEARCH_ENGINE_PATTERNS).toContainEqual(
        expect.objectContaining({ domain: 'duckduckgo.com' })
      )
    })

    it('includes Yahoo', () => {
      expect(SEARCH_ENGINE_PATTERNS).toContainEqual(
        expect.objectContaining({ domain: 'search.yahoo.com' })
      )
    })
  })

  describe('isSearchEngineUrl', () => {
    it('returns true for Google search URL', () => {
      expect(isSearchEngineUrl('https://www.google.com/search?q=test')).toBe(true)
    })

    it('returns true for Bing search URL', () => {
      expect(isSearchEngineUrl('https://www.bing.com/search?q=test')).toBe(true)
    })

    it('returns true for DuckDuckGo search URL', () => {
      expect(isSearchEngineUrl('https://duckduckgo.com/?q=test')).toBe(true)
    })

    it('returns true for Yahoo search URL', () => {
      expect(isSearchEngineUrl('https://search.yahoo.com/search?p=test')).toBe(true)
    })

    it('returns false for non-search URL', () => {
      expect(isSearchEngineUrl('https://www.example.com')).toBe(false)
    })

    it('returns false for invalid URL', () => {
      expect(isSearchEngineUrl('not a url')).toBe(false)
    })
  })

  describe('extractSearchQuery', () => {
    it('extracts query from Google URL', () => {
      expect(extractSearchQuery('https://www.google.com/search?q=how+to+kill+myself')).toBe(
        'how to kill myself'
      )
    })

    it('extracts query from Bing URL', () => {
      expect(extractSearchQuery('https://www.bing.com/search?q=suicide+hotline')).toBe(
        'suicide hotline'
      )
    })

    it('extracts query from DuckDuckGo URL', () => {
      expect(extractSearchQuery('https://duckduckgo.com/?q=crisis+help')).toBe('crisis help')
    })

    it('extracts query from Yahoo URL', () => {
      expect(extractSearchQuery('https://search.yahoo.com/search?p=abuse+help')).toBe(
        'abuse help'
      )
    })

    it('returns null for non-search URL', () => {
      expect(extractSearchQuery('https://www.example.com')).toBeNull()
    })

    it('returns null for search URL without query', () => {
      expect(extractSearchQuery('https://www.google.com/search')).toBeNull()
    })

    it('handles URL-encoded characters', () => {
      expect(extractSearchQuery('https://www.google.com/search?q=i%20want%20to%20die')).toBe(
        'i want to die'
      )
    })

    it('returns null for empty query', () => {
      expect(extractSearchQuery('https://www.google.com/search?q=')).toBeNull()
    })
  })
})

describe('useCrisisSearchDetection', () => {
  it('returns checkUrl function', () => {
    const { result } = renderHook(() => useCrisisSearchDetection())

    expect(result.current.checkUrl).toBeDefined()
    expect(typeof result.current.checkUrl).toBe('function')
  })

  it('returns shouldShowInterstitial = false for non-crisis search', () => {
    const { result } = renderHook(() => useCrisisSearchDetection())

    const checkResult = result.current.checkUrl('https://www.google.com/search?q=cute+puppies')

    expect(checkResult.shouldShowInterstitial).toBe(false)
    expect(checkResult.match).toBeNull()
  })

  it('returns shouldShowInterstitial = true for crisis search', () => {
    const { result } = renderHook(() => useCrisisSearchDetection())

    const checkResult = result.current.checkUrl(
      'https://www.google.com/search?q=how+to+kill+myself'
    )

    expect(checkResult.shouldShowInterstitial).toBe(true)
    expect(checkResult.match).not.toBeNull()
    expect(checkResult.match?.category).toBe('suicide')
    expect(checkResult.match?.confidence).toBe('high')
  })

  it('returns suggestedResources for crisis match', () => {
    const { result } = renderHook(() => useCrisisSearchDetection())

    const checkResult = result.current.checkUrl('https://www.google.com/search?q=suicide')

    expect(checkResult.suggestedResources.length).toBeGreaterThan(0)
  })

  it('handles self-harm search queries', () => {
    const { result } = renderHook(() => useCrisisSearchDetection())

    const checkResult = result.current.checkUrl('https://www.google.com/search?q=cutting')

    expect(checkResult.shouldShowInterstitial).toBe(true)
    expect(checkResult.match?.category).toBe('self_harm')
  })

  it('handles abuse search queries', () => {
    const { result } = renderHook(() => useCrisisSearchDetection())

    const checkResult = result.current.checkUrl(
      'https://www.google.com/search?q=my+parent+hits+me'
    )

    expect(checkResult.shouldShowInterstitial).toBe(true)
    expect(checkResult.match?.category).toBe('abuse')
  })

  it('returns false for non-search URLs', () => {
    const { result } = renderHook(() => useCrisisSearchDetection())

    const checkResult = result.current.checkUrl('https://www.example.com/suicide')

    expect(checkResult.shouldShowInterstitial).toBe(false)
  })

  it('is memoized with useCallback', () => {
    const { result, rerender } = renderHook(() => useCrisisSearchDetection())
    const firstCheckUrl = result.current.checkUrl

    rerender()

    expect(result.current.checkUrl).toBe(firstCheckUrl)
  })
})
