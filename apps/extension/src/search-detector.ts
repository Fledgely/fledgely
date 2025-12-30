/**
 * Search URL Detection Module for Fledgely Chrome Extension
 *
 * This module detects search engine URLs and extracts search queries
 * for the crisis search redirection feature (Story 7.6).
 *
 * CRITICAL PRIVACY RULES:
 * - Query is extracted in memory ONLY - never stored or logged
 * - This module is purely functional - no side effects
 * - All processing is synchronous and local
 */

/**
 * Search engine configuration
 */
interface SearchEngineConfig {
  /** Domain patterns to match (partial match) */
  domains: string[]
  /** URL parameter containing the search query */
  queryParam: string
  /** Optional path pattern that must be present */
  pathPattern?: RegExp
}

/**
 * Supported search engines and their query parameter patterns
 */
const SEARCH_ENGINES: SearchEngineConfig[] = [
  {
    // Google Search (all localized domains)
    domains: ['google.com', 'google.co.uk', 'google.ca', 'google.com.au', 'google.de', 'google.fr'],
    queryParam: 'q',
    pathPattern: /\/search/,
  },
  {
    // Bing Search
    domains: ['bing.com'],
    queryParam: 'q',
    pathPattern: /\/search/,
  },
  {
    // DuckDuckGo (uses root path with query param)
    domains: ['duckduckgo.com'],
    queryParam: 'q',
    // DuckDuckGo uses root path, no specific path required
  },
  {
    // Yahoo Search
    domains: ['search.yahoo.com'],
    queryParam: 'p',
    pathPattern: /\/search/,
  },
  {
    // Ecosia (privacy-focused search)
    domains: ['ecosia.org'],
    queryParam: 'q',
    pathPattern: /\/search/,
  },
  {
    // Brave Search
    domains: ['search.brave.com'],
    queryParam: 'q',
    pathPattern: /\/search/,
  },
  {
    // StartPage (privacy-focused)
    domains: ['startpage.com'],
    queryParam: 'query',
    pathPattern: /\/sp\/search/,
  },
]

/**
 * Result of search URL detection
 */
export interface SearchDetectionResult {
  /** Whether the URL is a search engine results page */
  isSearch: boolean
  /** The extracted search query (if detected) */
  query?: string
  /** The search engine name (for debugging) */
  engine?: string
}

/**
 * Check if a URL is from a supported search engine and extract the query
 *
 * PRIVACY: This function NEVER stores or logs the extracted query.
 * It only returns the result for in-memory processing.
 *
 * @param url - The URL to check
 * @returns Detection result with query if this is a search URL
 */
export function extractSearchQuery(url: string): SearchDetectionResult {
  // Input validation
  if (!url || typeof url !== 'string') {
    return { isSearch: false }
  }

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // Check each search engine
    for (const engine of SEARCH_ENGINES) {
      // Check if hostname matches any of the engine's domains
      const domainMatch = engine.domains.some(
        (domain) => hostname === domain || hostname.endsWith('.' + domain)
      )

      if (!domainMatch) {
        continue
      }

      // Check path pattern if required
      if (engine.pathPattern && !engine.pathPattern.test(urlObj.pathname)) {
        continue
      }

      // Extract query parameter
      const query = urlObj.searchParams.get(engine.queryParam)

      if (query && query.trim()) {
        return {
          isSearch: true,
          query: query.trim(),
          engine: engine.domains[0], // Use first domain as engine name
        }
      }
    }

    return { isSearch: false }
  } catch {
    // Invalid URL - not a search
    return { isSearch: false }
  }
}

/**
 * Check if a URL is from a search engine (without extracting query)
 * Faster check for when we just need to know if it's a search URL
 *
 * @param url - The URL to check
 * @returns true if URL is from a supported search engine
 */
export function isSearchEngineUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    for (const engine of SEARCH_ENGINES) {
      const domainMatch = engine.domains.some(
        (domain) => hostname === domain || hostname.endsWith('.' + domain)
      )

      if (domainMatch) {
        // If path pattern is required, check it
        if (engine.pathPattern) {
          return engine.pathPattern.test(urlObj.pathname)
        }
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Get URL patterns for content script matching
 * These patterns are used in manifest.json content_scripts.matches
 *
 * @returns Array of match patterns for supported search engines
 */
export function getSearchEngineMatchPatterns(): string[] {
  const patterns: string[] = []

  for (const engine of SEARCH_ENGINES) {
    for (const domain of engine.domains) {
      // Add both http and https patterns
      patterns.push(`*://*.${domain}/*`)
      patterns.push(`*://${domain}/*`)
    }
  }

  return patterns
}

/**
 * Get a list of supported search engine names (for display/testing)
 */
export function getSupportedSearchEngines(): string[] {
  return SEARCH_ENGINES.map((engine) => engine.domains[0])
}

// Export for testing
export const _testExports = {
  SEARCH_ENGINES,
}
