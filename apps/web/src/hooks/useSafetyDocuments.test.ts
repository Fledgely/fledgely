/**
 * useSafetyDocuments Hook Tests
 *
 * Story 0.5.2: Safety Request Documentation Upload
 *
 * Tests for the safety document upload hook.
 * Tests validation logic, state management, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

/**
 * Maximum file size for safety documents (25MB).
 * Duplicated from contracts to avoid build issues.
 */
const SAFETY_DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(),
}))

// Import after mocking
import { httpsCallable } from 'firebase/functions'
import { useSafetyDocuments } from './useSafetyDocuments'

describe('useSafetyDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty uploads array initially', () => {
      const { result } = renderHook(() => useSafetyDocuments())
      expect(result.current.uploads).toEqual([])
    })

    it('should have isUploading false initially', () => {
      const { result } = renderHook(() => useSafetyDocuments())
      expect(result.current.isUploading).toBe(false)
    })

    it('should have null error initially', () => {
      const { result } = renderHook(() => useSafetyDocuments())
      expect(result.current.error).toBeNull()
    })
  })

  describe('uploadDocument', () => {
    it('should call Firebase function with correct parameters', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123', message: 'Success' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      await act(async () => {
        await result.current.uploadDocument('ticket-123', file)
      })

      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'uploadSafetyDocument')
      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: 'ticket-123',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
        })
      )
    })

    it('should return uploaded document on success', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123', message: 'Success' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      let uploadedDoc

      await act(async () => {
        uploadedDoc = await result.current.uploadDocument('ticket-123', file)
      })

      expect(uploadedDoc).toEqual(
        expect.objectContaining({
          documentId: 'doc-123',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
        })
      )
    })

    it('should set error on failure', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Upload failed'))
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      await act(async () => {
        await result.current.uploadDocument('ticket-123', file)
      })

      expect(result.current.error).toBeTruthy()
    })

    it('should return null on validation failure', async () => {
      const { result } = renderHook(() => useSafetyDocuments())

      // Create file larger than max size
      const largeContent = new Array(SAFETY_DOCUMENT_MAX_SIZE_BYTES + 1).fill('a').join('')
      const file = new File([largeContent], 'large.pdf', { type: 'application/pdf' })

      let uploadedDoc

      await act(async () => {
        uploadedDoc = await result.current.uploadDocument('ticket-123', file)
      })

      expect(uploadedDoc).toBeNull()
      expect(result.current.error).toBeTruthy()
    })

    it('should reject unsupported file types', async () => {
      const { result } = renderHook(() => useSafetyDocuments())

      const file = new File(['test content'], 'test.zip', { type: 'application/zip' })

      let uploadedDoc

      await act(async () => {
        uploadedDoc = await result.current.uploadDocument('ticket-123', file)
      })

      expect(uploadedDoc).toBeNull()
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('deleteDocument', () => {
    it('should call Firebase function with documentId', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Deleted' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      await act(async () => {
        await result.current.deleteDocument('doc-123')
      })

      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'deleteSafetyDocument')
      expect(mockCallable).toHaveBeenCalledWith({ documentId: 'doc-123' })
    })

    it('should return true on success', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, message: 'Deleted' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      let success
      await act(async () => {
        success = await result.current.deleteDocument('doc-123')
      })

      expect(success).toBe(true)
    })

    it('should return false and set error on failure', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Delete failed'))
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      let success
      await act(async () => {
        success = await result.current.deleteDocument('doc-123')
      })

      expect(success).toBe(false)
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('clearUploads', () => {
    it('should clear uploads array', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123', message: 'Success' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      await act(async () => {
        await result.current.uploadDocument('ticket-123', file)
      })

      expect(result.current.uploads.length).toBeGreaterThan(0)

      act(() => {
        result.current.clearUploads()
      })

      expect(result.current.uploads).toEqual([])
    })

    it('should clear error', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Upload failed'))
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      await act(async () => {
        await result.current.uploadDocument('ticket-123', file)
      })

      expect(result.current.error).toBeTruthy()

      act(() => {
        result.current.clearUploads()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('file type validation', () => {
    it('should accept PDF files', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123', message: 'Success' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      await act(async () => {
        const doc = await result.current.uploadDocument('ticket-123', file)
        expect(doc).not.toBeNull()
      })
    })

    it('should accept JPEG files', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123', message: 'Success' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await act(async () => {
        const doc = await result.current.uploadDocument('ticket-123', file)
        expect(doc).not.toBeNull()
      })
    })

    it('should accept PNG files', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123', message: 'Success' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockCallable)

      const { result } = renderHook(() => useSafetyDocuments())

      const file = new File(['test'], 'test.png', { type: 'image/png' })

      await act(async () => {
        const doc = await result.current.uploadDocument('ticket-123', file)
        expect(doc).not.toBeNull()
      })
    })
  })
})
