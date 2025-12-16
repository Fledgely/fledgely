import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgreementDownload } from '../useAgreementDownload'

// Mock Firebase
vi.mock('@/lib/firebase', () => ({
  db: {},
}))

// Mock Firestore functions
const mockGetDoc = vi.fn()
const mockAddDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: () => mockGetDoc(),
  collection: vi.fn(),
  addDoc: () => mockAddDoc(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'),
}))

describe('useAgreementDownload', () => {
  const mockAgreementData = {
    id: 'agreement-123',
    version: '1.0',
    status: 'active',
    activatedAt: '2025-12-16T12:00:00Z',
    terms: [
      {
        id: 'term-1',
        type: 'rule',
        content: {
          title: 'Screen Time',
          childCommitment: 'I will limit my screen time to 2 hours per day',
          parentCommitment: 'I will help set up device timers',
        },
      },
    ],
    signatures: {
      parent: {
        signedAt: '2025-12-16T11:00:00Z',
        signedBy: 'parent-123',
        signatureType: 'typed',
        signatureValue: 'Sarah Smith',
      },
      child: {
        signedAt: '2025-12-16T12:00:00Z',
        signedBy: 'child-456',
        signatureType: 'typed',
        signatureValue: 'Alex Smith',
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Firestore document retrieval
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockAgreementData,
      id: 'agreement-123',
    })
    mockAddDoc.mockResolvedValue({ id: 'audit-123' })

    // Mock window.open for print
    Object.defineProperty(window, 'open', {
      value: vi.fn(() => ({
        document: {
          write: vi.fn(),
          close: vi.fn(),
        },
        focus: vi.fn(),
        print: vi.fn(),
        close: vi.fn(),
      })),
      writable: true,
    })

    // Mock navigator.share
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockResolvedValue(undefined),
      writable: true,
      configurable: true,
    })

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    })

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://fledgely.com',
      },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Hook initialization', () => {
    it('returns download and share functions', () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      expect(result.current.downloadAgreement).toBeDefined()
      expect(typeof result.current.downloadAgreement).toBe('function')
      expect(result.current.shareAgreement).toBeDefined()
      expect(typeof result.current.shareAgreement).toBe('function')
    })

    it('returns loading state', () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      expect(result.current.isLoading).toBe(false)
    })

    it('returns error state', () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      expect(result.current.error).toBeNull()
    })
  })

  describe('Task 2.1: Download agreement functionality', () => {
    it('sets isLoading to true during download', async () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      // Create a promise that we can control
      let resolveAgreement: () => void
      mockGetDoc.mockReturnValue(
        new Promise((resolve) => {
          resolveAgreement = () =>
            resolve({
              exists: () => true,
              data: () => mockAgreementData,
              id: 'agreement-123',
            })
        })
      )

      let downloadPromise: Promise<void>
      act(() => {
        downloadPromise = result.current.downloadAgreement()
      })

      expect(result.current.isLoading).toBe(true)

      // Cleanup
      await act(async () => {
        resolveAgreement!()
        await downloadPromise
      })
    })

    it('sets isLoading to false after download completes', async () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.downloadAgreement()
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('opens print dialog for PDF generation', async () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.downloadAgreement()
      })

      expect(window.open).toHaveBeenCalled()
    })
  })

  describe('Task 2.5: Audit logging', () => {
    it('creates audit log entry when agreement is downloaded', async () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.downloadAgreement()
      })

      expect(mockAddDoc).toHaveBeenCalled()
    })

    it('creates audit log entry when agreement is shared', async () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.shareAgreement()
      })

      expect(mockAddDoc).toHaveBeenCalled()
    })
  })

  describe('Task 2.4: Share agreement functionality', () => {
    it('uses Web Share API when available', async () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.shareAgreement()
      })

      expect(navigator.share).toHaveBeenCalled()
    })

    it('passes correct data to Web Share API', async () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.shareAgreement()
      })

      expect(navigator.share).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/family agreement/i),
          url: expect.stringContaining('agreement-123'),
        })
      )
    })

    it('falls back to clipboard when Web Share API not available', async () => {
      // Remove navigator.share
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.shareAgreement()
      })

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('agreement-123')
      )
    })
  })

  describe('Error handling', () => {
    it('sets error state when agreement not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => null,
      })

      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.downloadAgreement()
      })

      expect(result.current.error).toMatch(/not found/i)
    })

    it('sets error state when share fails', async () => {
      Object.defineProperty(navigator, 'share', {
        value: vi.fn().mockRejectedValue(new Error('Share failed')),
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.shareAgreement()
      })

      expect(result.current.error).toMatch(/failed/i)
    })

    it('sets error state when popup is blocked', async () => {
      // Mock window.open returning null (popup blocked)
      Object.defineProperty(window, 'open', {
        value: vi.fn(() => null),
        writable: true,
      })

      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.downloadAgreement()
      })

      expect(result.current.error).toMatch(/popup/i)
    })
  })

  describe('XSS prevention', () => {
    it('escapes HTML special characters in agreement terms', async () => {
      const maliciousData = {
        ...mockAgreementData,
        terms: [
          {
            id: 'term-1',
            type: 'rule',
            content: {
              title: '<script>alert("XSS")</script>',
              childCommitment: '<img src=x onerror="alert(1)">',
              parentCommitment: '"><script>alert(2)</script>',
            },
          },
        ],
      }

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => maliciousData,
        id: 'agreement-123',
      })

      let writtenHtml = ''
      Object.defineProperty(window, 'open', {
        value: vi.fn(() => ({
          document: {
            write: (html: string) => {
              writtenHtml = html
            },
            close: vi.fn(),
          },
          focus: vi.fn(),
          print: vi.fn(),
        })),
        writable: true,
      })

      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.downloadAgreement()
      })

      // Verify XSS payloads are escaped - <script> becomes &lt;script&gt;
      expect(writtenHtml).not.toContain('<script>')
      expect(writtenHtml).toContain('&lt;script&gt;')
      // onerror is inside quotes which are escaped, so check raw executable form doesn't exist
      expect(writtenHtml).not.toContain('onerror="alert')
      expect(writtenHtml).toContain('&lt;img')
    })

    it('escapes HTML special characters in signature values', async () => {
      const maliciousData = {
        ...mockAgreementData,
        signatures: {
          parent: {
            signedAt: '2025-12-16T11:00:00Z',
            signedBy: 'parent-123',
            signatureType: 'typed',
            signatureValue: '<script>steal(cookies)</script>',
          },
          child: {
            signedAt: '2025-12-16T12:00:00Z',
            signedBy: 'child-456',
            signatureType: 'typed',
            signatureValue: '"><img src=x onerror=alert(1)>',
          },
        },
      }

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => maliciousData,
        id: 'agreement-123',
      })

      let writtenHtml = ''
      Object.defineProperty(window, 'open', {
        value: vi.fn(() => ({
          document: {
            write: (html: string) => {
              writtenHtml = html
            },
            close: vi.fn(),
          },
          focus: vi.fn(),
          print: vi.fn(),
        })),
        writable: true,
      })

      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      await act(async () => {
        await result.current.downloadAgreement()
      })

      // Verify signature XSS payloads are escaped
      expect(writtenHtml).not.toContain('<script>steal')
      expect(writtenHtml).toContain('&lt;script&gt;')
      // Verify the onerror payload is escaped - angle brackets become entities
      expect(writtenHtml).not.toContain('<img src=x')
    })
  })

  describe('Share result feedback', () => {
    it('returns "shared" when Web Share API succeeds', async () => {
      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      let shareResult: string | undefined
      await act(async () => {
        shareResult = await result.current.shareAgreement()
      })

      expect(shareResult).toBe('shared')
    })

    it('returns "copied" when falling back to clipboard', async () => {
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      let shareResult: string | undefined
      await act(async () => {
        shareResult = await result.current.shareAgreement()
      })

      expect(shareResult).toBe('copied')
    })

    it('returns "cancelled" when user aborts share', async () => {
      const abortError = new Error('User cancelled')
      abortError.name = 'AbortError'
      Object.defineProperty(navigator, 'share', {
        value: vi.fn().mockRejectedValue(abortError),
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      let shareResult: string | undefined
      await act(async () => {
        shareResult = await result.current.shareAgreement()
      })

      expect(shareResult).toBe('cancelled')
    })

    it('returns "error" when share fails', async () => {
      Object.defineProperty(navigator, 'share', {
        value: vi.fn().mockRejectedValue(new Error('Network error')),
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() =>
        useAgreementDownload({ agreementId: 'agreement-123', familyId: 'family-456' })
      )

      let shareResult: string | undefined
      await act(async () => {
        shareResult = await result.current.shareAgreement()
      })

      expect(shareResult).toBe('error')
    })
  })
})
