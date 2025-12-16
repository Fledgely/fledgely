/**
 * Log Fuzzy Match HTTP Endpoint Tests
 *
 * Story 7.5: Fuzzy Domain Matching - Task 6.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'

// Mock services BEFORE importing the endpoint
vi.mock('../services/fuzzyMatchLogService', () => ({
  logFuzzyMatch: vi.fn(),
}))

// Mock firebase-functions/v2/https
vi.mock('firebase-functions/v2/https', () => ({
  onRequest: (options: unknown, handler: (req: Request, res: Response) => void) => handler,
}))

import { logFuzzyMatchEndpoint } from './logFuzzyMatch'
import { logFuzzyMatch } from '../services/fuzzyMatchLogService'

const mockLogFuzzyMatch = logFuzzyMatch as ReturnType<typeof vi.fn>

describe('logFuzzyMatchEndpoint', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let responseJson: unknown
  let responseStatus: number

  beforeEach(() => {
    vi.clearAllMocks()

    responseJson = null
    responseStatus = 200

    mockResponse = {
      status: vi.fn().mockImplementation((code: number) => {
        responseStatus = code
        return mockResponse
      }),
      json: vi.fn().mockImplementation((data: unknown) => {
        responseJson = data
        return mockResponse
      }),
    }

    mockRequest = {
      method: 'POST',
      body: {
        inputDomain: '988lifline.org',
        matchedDomain: '988lifeline.org',
        distance: 1,
        deviceType: 'web',
      },
      headers: {},
      ip: '192.168.1.1',
    }
  })

  it('returns 405 for non-POST requests', async () => {
    mockRequest.method = 'GET'

    await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(405)
    expect(responseJson).toEqual({ success: false, error: 'Method not allowed' })
  })

  it('returns 400 for invalid input', async () => {
    mockRequest.body = { inputDomain: '' } // Missing required fields

    await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(400)
    expect((responseJson as { success: boolean; error: string }).success).toBe(false)
    expect((responseJson as { success: boolean; error: string }).error).toContain('Invalid input')
  })

  it('returns 200 and logId on success', async () => {
    mockLogFuzzyMatch.mockResolvedValue({
      success: true,
      logId: 'test-log-id',
    })

    await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(200)
    expect(responseJson).toEqual({ success: true, logId: 'test-log-id' })
  })

  it('returns 429 when rate limited', async () => {
    mockLogFuzzyMatch.mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded. Please try again tomorrow.',
    })

    await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(429)
    expect(responseJson).toEqual({
      success: false,
      error: 'Rate limit exceeded. Please try again tomorrow.',
    })
  })

  it('returns 400 for other service errors', async () => {
    mockLogFuzzyMatch.mockResolvedValue({
      success: false,
      error: 'Some validation error',
    })

    await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(400)
    expect(responseJson).toEqual({
      success: false,
      error: 'Some validation error',
    })
  })

  it('returns 500 on unexpected errors', async () => {
    mockLogFuzzyMatch.mockRejectedValue(new Error('Database error'))

    await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

    expect(responseStatus).toBe(500)
    expect(responseJson).toEqual({
      success: false,
      error: 'Internal server error',
    })
  })

  describe('IP extraction', () => {
    it('uses x-forwarded-for header when available', async () => {
      mockRequest.headers = {
        'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      }
      mockLogFuzzyMatch.mockResolvedValue({ success: true, logId: 'test' })

      await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

      expect(mockLogFuzzyMatch).toHaveBeenCalledWith(
        expect.any(Object),
        '10.0.0.1'
      )
    })

    it('falls back to request.ip when no forwarded header', async () => {
      mockRequest.ip = '192.168.1.100'
      mockLogFuzzyMatch.mockResolvedValue({ success: true, logId: 'test' })

      await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

      expect(mockLogFuzzyMatch).toHaveBeenCalledWith(
        expect.any(Object),
        '192.168.1.100'
      )
    })

    it('uses default IP when none available', async () => {
      mockRequest.ip = undefined
      mockRequest.headers = {}
      mockLogFuzzyMatch.mockResolvedValue({ success: true, logId: 'test' })

      await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

      expect(mockLogFuzzyMatch).toHaveBeenCalledWith(
        expect.any(Object),
        '0.0.0.0'
      )
    })
  })

  describe('input validation', () => {
    it('accepts all valid device types', async () => {
      mockLogFuzzyMatch.mockResolvedValue({ success: true, logId: 'test' })

      for (const deviceType of ['web', 'extension', 'android', 'ios']) {
        mockRequest.body = {
          ...mockRequest.body,
          deviceType,
        }

        await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

        expect(responseStatus).toBe(200)
      }
    })

    it('rejects invalid device type', async () => {
      mockRequest.body = {
        ...mockRequest.body,
        deviceType: 'invalid',
      }

      await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toBe(400)
    })

    it('rejects distance > 2', async () => {
      mockRequest.body = {
        ...mockRequest.body,
        distance: 3,
      }

      await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toBe(400)
    })

    it('rejects distance < 1', async () => {
      mockRequest.body = {
        ...mockRequest.body,
        distance: 0,
      }

      await logFuzzyMatchEndpoint(mockRequest as Request, mockResponse as Response)

      expect(responseStatus).toBe(400)
    })
  })
})
