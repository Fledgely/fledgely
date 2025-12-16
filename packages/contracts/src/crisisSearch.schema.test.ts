/**
 * Crisis Search Schema Tests
 *
 * Story 7.6: Crisis Search Redirection - Task 2
 *
 * Tests for Zod schemas related to crisis search detection.
 */

import { describe, it, expect } from 'vitest'
import {
  crisisSearchCategorySchema,
  crisisSearchConfidenceSchema,
  crisisSearchMatchSchema,
  crisisRedirectActionSchema,
  crisisSearchResultSchema,
  type CrisisSearchCategory,
  type CrisisSearchConfidence,
  type CrisisSearchMatch,
  type CrisisRedirectAction,
  type CrisisSearchResult,
} from './crisisSearch.schema'

describe('Crisis Search Schemas', () => {
  describe('crisisSearchCategorySchema', () => {
    it('accepts valid categories', () => {
      expect(crisisSearchCategorySchema.parse('suicide')).toBe('suicide')
      expect(crisisSearchCategorySchema.parse('self_harm')).toBe('self_harm')
      expect(crisisSearchCategorySchema.parse('abuse')).toBe('abuse')
      expect(crisisSearchCategorySchema.parse('help')).toBe('help')
    })

    it('rejects invalid categories', () => {
      expect(() => crisisSearchCategorySchema.parse('unknown')).toThrow()
      expect(() => crisisSearchCategorySchema.parse('')).toThrow()
      expect(() => crisisSearchCategorySchema.parse(123)).toThrow()
    })
  })

  describe('crisisSearchConfidenceSchema', () => {
    it('accepts valid confidence levels', () => {
      expect(crisisSearchConfidenceSchema.parse('high')).toBe('high')
      expect(crisisSearchConfidenceSchema.parse('medium')).toBe('medium')
    })

    it('rejects invalid confidence levels', () => {
      expect(() => crisisSearchConfidenceSchema.parse('low')).toThrow()
      expect(() => crisisSearchConfidenceSchema.parse('')).toThrow()
    })
  })

  describe('crisisSearchMatchSchema', () => {
    it('accepts valid match object', () => {
      const validMatch: CrisisSearchMatch = {
        query: 'how to kill myself',
        category: 'suicide',
        confidence: 'high',
        matchedPattern: 'how to kill myself',
      }
      expect(crisisSearchMatchSchema.parse(validMatch)).toEqual(validMatch)
    })

    it('rejects match with invalid category', () => {
      expect(() =>
        crisisSearchMatchSchema.parse({
          query: 'test',
          category: 'invalid',
          confidence: 'high',
          matchedPattern: 'test',
        })
      ).toThrow()
    })

    it('rejects match with missing fields', () => {
      expect(() =>
        crisisSearchMatchSchema.parse({
          query: 'test',
          category: 'suicide',
        })
      ).toThrow()
    })

    it('rejects match with empty query', () => {
      expect(() =>
        crisisSearchMatchSchema.parse({
          query: '',
          category: 'suicide',
          confidence: 'high',
          matchedPattern: 'suicide',
        })
      ).toThrow()
    })
  })

  describe('crisisRedirectActionSchema', () => {
    it('accepts valid actions', () => {
      expect(crisisRedirectActionSchema.parse('shown')).toBe('shown')
      expect(crisisRedirectActionSchema.parse('dismissed')).toBe('dismissed')
      expect(crisisRedirectActionSchema.parse('resource_clicked')).toBe('resource_clicked')
      expect(crisisRedirectActionSchema.parse('continued')).toBe('continued')
    })

    it('rejects invalid actions', () => {
      expect(() => crisisRedirectActionSchema.parse('clicked')).toThrow()
      expect(() => crisisRedirectActionSchema.parse('')).toThrow()
    })
  })

  describe('crisisSearchResultSchema', () => {
    it('accepts valid result with match', () => {
      const validResult: CrisisSearchResult = {
        shouldShowInterstitial: true,
        match: {
          query: 'suicide',
          category: 'suicide',
          confidence: 'medium',
          matchedPattern: 'suicide',
        },
        suggestedResources: ['988lifeline.org', 'crisistextline.org'],
      }
      expect(crisisSearchResultSchema.parse(validResult)).toEqual(validResult)
    })

    it('accepts valid result without match', () => {
      const validResult: CrisisSearchResult = {
        shouldShowInterstitial: false,
        match: null,
        suggestedResources: [],
      }
      expect(crisisSearchResultSchema.parse(validResult)).toEqual(validResult)
    })

    it('accepts result with empty resources array', () => {
      const validResult: CrisisSearchResult = {
        shouldShowInterstitial: true,
        match: {
          query: 'help me',
          category: 'help',
          confidence: 'medium',
          matchedPattern: 'help me',
        },
        suggestedResources: [],
      }
      expect(crisisSearchResultSchema.parse(validResult)).toEqual(validResult)
    })

    it('rejects result with invalid match', () => {
      expect(() =>
        crisisSearchResultSchema.parse({
          shouldShowInterstitial: true,
          match: { query: '', category: 'invalid' },
          suggestedResources: [],
        })
      ).toThrow()
    })
  })

  describe('Type inference', () => {
    it('infers correct types from schemas', () => {
      // Type tests - these compile-time checks ensure types are correct
      const category: CrisisSearchCategory = 'suicide'
      const confidence: CrisisSearchConfidence = 'high'
      const action: CrisisRedirectAction = 'shown'

      const match: CrisisSearchMatch = {
        query: 'test',
        category: 'suicide',
        confidence: 'high',
        matchedPattern: 'test',
      }

      const result: CrisisSearchResult = {
        shouldShowInterstitial: true,
        match,
        suggestedResources: ['988lifeline.org'],
      }

      expect(category).toBeDefined()
      expect(confidence).toBeDefined()
      expect(action).toBeDefined()
      expect(match).toBeDefined()
      expect(result).toBeDefined()
    })
  })
})
