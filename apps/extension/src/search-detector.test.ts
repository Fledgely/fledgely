/**
 * Tests for Search URL Detection Module (Story 7.6)
 *
 * Tests search engine detection for the crisis search redirection feature.
 */

import { describe, expect, it } from 'vitest'
import {
  extractSearchQuery,
  isSearchEngineUrl,
  getSearchEngineMatchPatterns,
  getSupportedSearchEngines,
  _testExports,
} from './search-detector'

const { SEARCH_ENGINES } = _testExports

describe('Search Detector Module (Story 7.6)', () => {
  describe('extractSearchQuery', () => {
    describe('AC7: Search Engine Support - Google', () => {
      it('should extract query from Google search URL', () => {
        const result = extractSearchQuery('https://www.google.com/search?q=test+query')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test query')
        expect(result.engine).toBe('google.com')
      })

      it('should extract query from Google search with additional params', () => {
        const result = extractSearchQuery(
          'https://www.google.com/search?q=test+query&sourceid=chrome&ie=UTF-8'
        )
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test query')
      })

      it('should handle Google localized domains', () => {
        const urls = [
          'https://www.google.co.uk/search?q=test',
          'https://www.google.ca/search?q=test',
          'https://www.google.com.au/search?q=test',
          'https://www.google.de/search?q=test',
        ]

        for (const url of urls) {
          const result = extractSearchQuery(url)
          expect(result.isSearch).toBe(true)
          expect(result.query).toBe('test')
        }
      })

      it('should NOT detect Google homepage as search', () => {
        const result = extractSearchQuery('https://www.google.com/')
        expect(result.isSearch).toBe(false)
      })

      it('should NOT detect Google images as search', () => {
        // Images don't use /search path
        const result = extractSearchQuery('https://www.google.com/imghp?q=cats')
        expect(result.isSearch).toBe(false)
      })
    })

    describe('AC7: Search Engine Support - Bing', () => {
      it('should extract query from Bing search URL', () => {
        const result = extractSearchQuery('https://www.bing.com/search?q=test+query')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test query')
        expect(result.engine).toBe('bing.com')
      })

      it('should handle Bing with additional params', () => {
        const result = extractSearchQuery('https://www.bing.com/search?q=test&form=QBLH')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test')
      })
    })

    describe('AC7: Search Engine Support - DuckDuckGo', () => {
      it('should extract query from DuckDuckGo URL', () => {
        const result = extractSearchQuery('https://duckduckgo.com/?q=test+query')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test query')
        expect(result.engine).toBe('duckduckgo.com')
      })

      it('should handle DuckDuckGo with additional params', () => {
        const result = extractSearchQuery('https://duckduckgo.com/?q=test&t=h_&ia=web')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test')
      })
    })

    describe('AC7: Search Engine Support - Yahoo', () => {
      it('should extract query from Yahoo search URL', () => {
        const result = extractSearchQuery('https://search.yahoo.com/search?p=test+query')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test query')
        expect(result.engine).toBe('search.yahoo.com')
      })

      it('should handle Yahoo with additional params', () => {
        const result = extractSearchQuery('https://search.yahoo.com/search?p=test&fr=yfp-t&fp=1')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test')
      })
    })

    describe('AC7: Search Engine Support - Other Engines', () => {
      it('should extract query from Ecosia', () => {
        const result = extractSearchQuery('https://www.ecosia.org/search?q=test+query')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test query')
      })

      it('should extract query from Brave Search', () => {
        const result = extractSearchQuery('https://search.brave.com/search?q=test+query')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test query')
      })

      it('should extract query from StartPage', () => {
        const result = extractSearchQuery('https://www.startpage.com/sp/search?query=test+query')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test query')
      })
    })

    describe('Query Extraction Edge Cases', () => {
      it('should handle URL-encoded queries', () => {
        const result = extractSearchQuery('https://www.google.com/search?q=hello%20world')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('hello world')
      })

      it('should handle plus-encoded spaces', () => {
        const result = extractSearchQuery('https://www.google.com/search?q=hello+world')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('hello world')
      })

      it('should handle special characters', () => {
        const result = extractSearchQuery('https://www.google.com/search?q=what%27s+happening%3F')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe("what's happening?")
      })

      it('should trim whitespace from query', () => {
        const result = extractSearchQuery('https://www.google.com/search?q=%20test%20')
        expect(result.isSearch).toBe(true)
        expect(result.query).toBe('test')
      })

      it('should return false for empty query parameter', () => {
        const result = extractSearchQuery('https://www.google.com/search?q=')
        expect(result.isSearch).toBe(false)
      })

      it('should return false for whitespace-only query', () => {
        const result = extractSearchQuery('https://www.google.com/search?q=%20%20%20')
        expect(result.isSearch).toBe(false)
      })
    })

    describe('Non-Search URLs', () => {
      it('should return false for non-search engine URLs', () => {
        const urls = [
          'https://www.example.com/search?q=test',
          'https://www.youtube.com/results?search_query=test',
          'https://www.amazon.com/s?k=test',
          'https://twitter.com/search?q=test',
          'https://www.reddit.com/search/?q=test',
        ]

        for (const url of urls) {
          const result = extractSearchQuery(url)
          expect(result.isSearch).toBe(false)
        }
      })

      it('should return false for search engine non-search pages', () => {
        const urls = [
          'https://www.google.com/',
          'https://www.google.com/maps?q=test',
          'https://www.bing.com/',
          'https://duckduckgo.com/about',
        ]

        for (const url of urls) {
          const result = extractSearchQuery(url)
          expect(result.isSearch).toBe(false)
        }
      })
    })

    describe('Input Validation', () => {
      it('should handle null/undefined input', () => {
        expect(extractSearchQuery(null as unknown as string).isSearch).toBe(false)
        expect(extractSearchQuery(undefined as unknown as string).isSearch).toBe(false)
      })

      it('should handle non-string input', () => {
        expect(extractSearchQuery(123 as unknown as string).isSearch).toBe(false)
        expect(extractSearchQuery({} as unknown as string).isSearch).toBe(false)
      })

      it('should handle invalid URLs', () => {
        expect(extractSearchQuery('not a url').isSearch).toBe(false)
        expect(extractSearchQuery('://invalid').isSearch).toBe(false)
      })

      it('should handle empty string', () => {
        expect(extractSearchQuery('').isSearch).toBe(false)
      })
    })
  })

  describe('isSearchEngineUrl', () => {
    it('should return true for search engine URLs', () => {
      const urls = [
        'https://www.google.com/search?q=test',
        'https://www.bing.com/search?q=test',
        'https://duckduckgo.com/?q=test',
        'https://search.yahoo.com/search?p=test',
      ]

      for (const url of urls) {
        expect(isSearchEngineUrl(url)).toBe(true)
      }
    })

    it('should return false for non-search URLs', () => {
      const urls = [
        'https://www.example.com/',
        'https://www.youtube.com/',
        'https://www.google.com/', // Homepage without search path
      ]

      for (const url of urls) {
        expect(isSearchEngineUrl(url)).toBe(false)
      }
    })

    it('should handle invalid input gracefully', () => {
      expect(isSearchEngineUrl(null as unknown as string)).toBe(false)
      expect(isSearchEngineUrl('')).toBe(false)
      expect(isSearchEngineUrl('not a url')).toBe(false)
    })
  })

  describe('getSearchEngineMatchPatterns', () => {
    it('should return array of match patterns', () => {
      const patterns = getSearchEngineMatchPatterns()
      expect(Array.isArray(patterns)).toBe(true)
      expect(patterns.length).toBeGreaterThan(0)
    })

    it('should include patterns for all search engines', () => {
      const patterns = getSearchEngineMatchPatterns()
      const patternString = patterns.join(' ')

      expect(patternString).toContain('google.com')
      expect(patternString).toContain('bing.com')
      expect(patternString).toContain('duckduckgo.com')
      expect(patternString).toContain('yahoo.com')
    })

    it('should include wildcard subdomain patterns', () => {
      const patterns = getSearchEngineMatchPatterns()

      expect(patterns.some((p) => p.includes('*://*.google.com/*'))).toBe(true)
    })
  })

  describe('getSupportedSearchEngines', () => {
    it('should return array of search engine names', () => {
      const engines = getSupportedSearchEngines()
      expect(Array.isArray(engines)).toBe(true)
      expect(engines.length).toBeGreaterThan(0)
    })

    it('should include major search engines', () => {
      const engines = getSupportedSearchEngines()

      expect(engines).toContain('google.com')
      expect(engines).toContain('bing.com')
      expect(engines).toContain('duckduckgo.com')
    })
  })

  describe('SEARCH_ENGINES Configuration', () => {
    it('should have valid structure for all engines', () => {
      for (const engine of SEARCH_ENGINES) {
        expect(Array.isArray(engine.domains)).toBe(true)
        expect(engine.domains.length).toBeGreaterThan(0)
        expect(typeof engine.queryParam).toBe('string')
        expect(engine.queryParam.length).toBeGreaterThan(0)
      }
    })

    it('should have lowercase domains', () => {
      for (const engine of SEARCH_ENGINES) {
        for (const domain of engine.domains) {
          expect(domain).toBe(domain.toLowerCase())
        }
      }
    })
  })
})
