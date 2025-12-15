import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((options, handler) => handler),
}))

// Mock resourceService
vi.mock('../utils/resourceService', () => ({
  getActiveResources: vi.fn().mockResolvedValue([
    {
      id: 'hotline-1',
      name: 'National Domestic Violence Hotline',
      type: 'hotline',
      value: '1-800-799-7233',
      description: '24/7 confidential support',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'text-1',
      name: 'Crisis Text Line',
      type: 'text-line',
      value: 'Text HOME to 741741',
      description: 'Free 24/7 crisis text support',
      displayOrder: 2,
      isActive: true,
    },
    {
      id: 'website-1',
      name: 'The Hotline - Safety Planning',
      type: 'website',
      value: 'https://www.thehotline.org/plan-for-safety/',
      description: 'Safety planning guides',
      displayOrder: 3,
      isActive: true,
    },
    {
      id: 'legal-1',
      name: 'LawHelp.org',
      type: 'legal-aid',
      value: 'https://www.lawhelp.org/',
      description: 'Find free legal aid',
      displayOrder: 4,
      isActive: true,
    },
  ]),
}))

describe('getResourceReferralContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('public access', () => {
    it('should be accessible without authentication', async () => {
      const { getResourceReferralContent } = await import('./getResourceReferralContent')

      // No auth in request
      const request = {
        auth: undefined,
        data: {},
      }

      const result = await getResourceReferralContent(request as never)

      expect(result.success).toBe(true)
      expect(result.resources).toBeDefined()
    })
  })

  describe('resource categorization', () => {
    it('should categorize hotlines correctly', async () => {
      const { getResourceReferralContent } = await import('./getResourceReferralContent')

      const result = await getResourceReferralContent({} as never)

      expect(result.resources.hotlines).toHaveLength(1)
      expect(result.resources.hotlines[0].name).toBe('National Domestic Violence Hotline')
    })

    it('should categorize text support correctly', async () => {
      const { getResourceReferralContent } = await import('./getResourceReferralContent')

      const result = await getResourceReferralContent({} as never)

      expect(result.resources.textSupport).toHaveLength(1)
      expect(result.resources.textSupport[0].name).toBe('Crisis Text Line')
    })

    it('should categorize websites correctly', async () => {
      const { getResourceReferralContent } = await import('./getResourceReferralContent')

      const result = await getResourceReferralContent({} as never)

      expect(result.resources.websites).toHaveLength(1)
      expect(result.resources.websites[0].type).toBe('website')
    })

    it('should categorize legal aid correctly', async () => {
      const { getResourceReferralContent } = await import('./getResourceReferralContent')

      const result = await getResourceReferralContent({} as never)

      expect(result.resources.legalAid).toHaveLength(1)
      expect(result.resources.legalAid[0].name).toBe('LawHelp.org')
    })
  })

  describe('response format', () => {
    it('should include disclaimer about immediate danger', async () => {
      const { getResourceReferralContent } = await import('./getResourceReferralContent')

      const result = await getResourceReferralContent({} as never)

      expect(result.disclaimer).toContain('immediate danger')
      expect(result.disclaimer).toContain('911')
    })

    it('should include supportive message', async () => {
      const { getResourceReferralContent } = await import('./getResourceReferralContent')

      const result = await getResourceReferralContent({} as never)

      expect(result.supportMessage).toContain('not alone')
    })
  })
})
