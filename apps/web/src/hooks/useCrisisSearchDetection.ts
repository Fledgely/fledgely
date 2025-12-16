/**
 * useCrisisSearchDetection Hook
 *
 * Story 7.6: Crisis Search Redirection - Task 4
 *
 * Hook for detecting crisis-related search queries and determining
 * whether to show the crisis interstitial.
 *
 * CRITICAL: This is a zero-data-path feature.
 * - NO logging of search queries
 * - NO analytics events
 * - NO network calls
 * - Detection runs locally in browser
 */

import { useCallback } from 'react'
import { isCrisisSearchQuery, getResourcesForCategory } from '@fledgely/shared'
import type { CrisisSearchResult, CrisisSearchMatch } from '@fledgely/contracts'

/**
 * Search engine patterns for URL detection
 */
interface SearchEnginePattern {
  domain: string
  pathPattern: RegExp | null
  queryParam: string
}

/**
 * Known search engine patterns
 */
export const SEARCH_ENGINE_PATTERNS: SearchEnginePattern[] = [
  { domain: 'google.com', pathPattern: /\/search/, queryParam: 'q' },
  { domain: 'bing.com', pathPattern: /\/search/, queryParam: 'q' },
  { domain: 'duckduckgo.com', pathPattern: null, queryParam: 'q' },
  { domain: 'search.yahoo.com', pathPattern: /\/search/, queryParam: 'p' },
  { domain: 'ecosia.org', pathPattern: /\/search/, queryParam: 'q' },
  { domain: 'brave.com', pathPattern: /\/search/, queryParam: 'q' },
  { domain: 'startpage.com', pathPattern: /\/do\/search/, queryParam: 'query' },
]

/**
 * Check if a URL is a search engine URL
 */
export function isSearchEngineUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.replace(/^www\./, '')

    return SEARCH_ENGINE_PATTERNS.some((pattern) => {
      if (!hostname.includes(pattern.domain)) return false

      if (pattern.pathPattern) {
        return pattern.pathPattern.test(parsedUrl.pathname)
      }

      return true
    })
  } catch {
    return false
  }
}

/**
 * Extract search query from a search engine URL
 */
export function extractSearchQuery(url: string): string | null {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.replace(/^www\./, '')

    for (const pattern of SEARCH_ENGINE_PATTERNS) {
      if (!hostname.includes(pattern.domain)) continue

      if (pattern.pathPattern && !pattern.pathPattern.test(parsedUrl.pathname)) {
        continue
      }

      const query = parsedUrl.searchParams.get(pattern.queryParam)
      if (query && query.trim()) {
        return query.trim()
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Hook for detecting crisis-related search queries
 *
 * Returns a memoized function that checks URLs for crisis search intent.
 *
 * @example
 * ```tsx
 * const { checkUrl } = useCrisisSearchDetection()
 *
 * // Before navigation
 * const result = checkUrl(newUrl)
 * if (result.shouldShowInterstitial) {
 *   // Show interstitial
 * }
 * ```
 */
export function useCrisisSearchDetection(): {
  checkUrl: (url: string) => CrisisSearchResult
} {
  const checkUrl = useCallback((url: string): CrisisSearchResult => {
    // Extract search query from URL
    const searchQuery = extractSearchQuery(url)

    // Not a search URL or no query
    if (!searchQuery) {
      return {
        shouldShowInterstitial: false,
        match: null,
        suggestedResources: [],
      }
    }

    // Check for crisis intent
    const match = isCrisisSearchQuery(searchQuery) as CrisisSearchMatch | null

    // No crisis intent detected
    if (!match) {
      return {
        shouldShowInterstitial: false,
        match: null,
        suggestedResources: [],
      }
    }

    // Crisis intent detected - get suggested resources
    const suggestedResources = getResourcesForCategory(match.category)

    return {
      shouldShowInterstitial: true,
      match,
      suggestedResources,
    }
  }, [])

  return { checkUrl }
}
