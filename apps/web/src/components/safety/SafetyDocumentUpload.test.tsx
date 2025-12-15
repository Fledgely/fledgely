import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SafetyDocumentUpload } from './SafetyDocumentUpload'
import { httpsCallable } from 'firebase/functions'
import {
  MAX_FILE_SIZE_BYTES,
  MAX_DOCUMENTS_PER_REQUEST,
  formatFileSize,
} from '@fledgely/contracts'

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  functions: {},
  storage: {},
}))

describe('SafetyDocumentUpload', () => {
  const mockOnUploadComplete = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Default successful upload mock
    vi.mocked(httpsCallable).mockReturnValue(
      vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123' },
      })
    )
  })

  const createMockFile = (
    name: string,
    type: string,
    size: number
  ): File => {
    const content = new Array(size).fill('a').join('')
    return new File([content], name, { type })
  }

  describe('rendering', () => {
    it('should render upload zone', () => {
      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      expect(screen.getByText(/Drag files or click to browse/i)).toBeInTheDocument()
    })

    it('should show accepted file types', () => {
      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      expect(
        screen.getByText(/PDF, images, or documents/i)
      ).toBeInTheDocument()
    })

    it('should show file size limit', () => {
      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      expect(
        screen.getByText(new RegExp(formatFileSize(MAX_FILE_SIZE_BYTES)))
      ).toBeInTheDocument()
    })
  })

  describe('file upload', () => {
    it('should upload a valid PDF file', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockUpload)

      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      const file = createMockFile('test.pdf', 'application/pdf', 1024)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalled()
        expect(mockOnUploadComplete).toHaveBeenCalled()
      })

      // Should show uploaded file
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })

    it('should upload a valid image file', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-456' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockUpload)

      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      const file = createMockFile('photo.jpg', 'image/jpeg', 2048)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalled()
      })
    })

    it('should reject invalid file types', async () => {
      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      // Create a file with an invalid type
      const file = new File(['test content'], 'script.js', { type: 'application/javascript' })
      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      // Use fireEvent directly to bypass accept attribute filtering
      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('not supported')
        )
      })
    })

    it('should reject oversized files', async () => {
      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      // Create a file larger than max size (we'll simulate this)
      const mockValidation = vi.fn()
      const file = new File([''], 'large.pdf', { type: 'application/pdf' })
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE_BYTES + 1 })

      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      // Directly fire change event with oversize file
      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('too large')
        )
      })
    })
  })

  describe('file deletion', () => {
    it('should delete an uploaded file', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123' },
      })
      const mockDelete = vi.fn().mockResolvedValue({ data: { success: true } })

      vi.mocked(httpsCallable)
        .mockReturnValueOnce(mockUpload)
        .mockReturnValueOnce(mockDelete)

      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      // Upload a file first
      const file = createMockFile('test.pdf', 'application/pdf', 1024)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })

      // Delete the file
      const removeButton = screen.getByRole('button', { name: /remove test.pdf/i })
      await userEvent.click(removeButton)

      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalled()
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
      })
    })
  })

  describe('file limit', () => {
    it('should not allow more than MAX_DOCUMENTS_PER_REQUEST files', async () => {
      let uploadCount = 0
      const mockUpload = vi.fn().mockImplementation(() => {
        uploadCount++
        return Promise.resolve({ data: { success: true, documentId: `doc-${uploadCount}` } })
      })
      vi.mocked(httpsCallable).mockReturnValue(mockUpload)

      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement

      // Upload MAX files
      for (let i = 0; i < MAX_DOCUMENTS_PER_REQUEST; i++) {
        const file = createMockFile(`file${i}.pdf`, 'application/pdf', 100)
        await userEvent.upload(input, file)
        await waitFor(() => {
          expect(screen.getByText(`file${i}.pdf`)).toBeInTheDocument()
        })
      }

      // Should show max reached message
      expect(screen.getByText(/Maximum files reached/i)).toBeInTheDocument()
    })

    it('should show file count', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123' },
      })
      vi.mocked(httpsCallable).mockReturnValue(mockUpload)

      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      const file = createMockFile('test.pdf', 'application/pdf', 1024)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(
          screen.getByText(`1 of ${MAX_DOCUMENTS_PER_REQUEST} files`)
        ).toBeInTheDocument()
      })
    })
  })

  describe('drag and drop', () => {
    it('should highlight zone on drag enter', async () => {
      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      const dropZone = screen.getByRole('button', { name: /upload documents/i })

      fireEvent.dragEnter(dropZone)

      await waitFor(() => {
        expect(screen.getByText(/Drop files here/i)).toBeInTheDocument()
      })
    })

    it('should reset on drag leave', async () => {
      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      const dropZone = screen.getByRole('button', { name: /upload documents/i })

      fireEvent.dragEnter(dropZone)
      await waitFor(() => {
        expect(screen.getByText(/Drop files here/i)).toBeInTheDocument()
      })

      fireEvent.dragLeave(dropZone)
      await waitFor(() => {
        expect(screen.getByText(/Drag files or click to browse/i)).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('should be keyboard accessible', async () => {
      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      const dropZone = screen.getByRole('button', { name: /upload documents/i })
      expect(dropZone).toHaveAttribute('tabIndex', '0')
    })

    it('should have proper aria attributes', () => {
      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      expect(
        screen.getByRole('button', { name: /upload documents/i })
      ).toHaveAttribute('aria-describedby', 'upload-description')
    })
  })

  describe('error handling', () => {
    it('should call onError when upload fails', async () => {
      const mockUpload = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.mocked(httpsCallable).mockReturnValue(mockUpload)

      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      const file = createMockFile('test.pdf', 'application/pdf', 1024)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          'Unable to upload file. Please try again.'
        )
      })
    })

    it('should call onError when delete fails', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { success: true, documentId: 'doc-123' },
      })
      const mockDelete = vi.fn().mockRejectedValue(new Error('Delete error'))

      vi.mocked(httpsCallable)
        .mockReturnValueOnce(mockUpload)
        .mockReturnValueOnce(mockDelete)

      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      // Upload first
      const file = createMockFile('test.pdf', 'application/pdf', 1024)
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument()
      })

      // Try to delete
      const removeButton = screen.getByRole('button', { name: /remove test.pdf/i })
      await userEvent.click(removeButton)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          'Unable to remove file. Please try again.'
        )
      })
    })
  })

  describe('visual subtlety requirements', () => {
    it('should use neutral language (no alarming words)', () => {
      render(
        <SafetyDocumentUpload
          requestId="request-123"
          onUploadComplete={mockOnUploadComplete}
          onError={mockOnError}
        />
      )

      const content = document.body.textContent || ''
      expect(content.toLowerCase()).not.toContain('danger')
      expect(content.toLowerCase()).not.toContain('warning')
      expect(content.toLowerCase()).not.toContain('alert')
      expect(content.toLowerCase()).not.toContain('emergency')
    })
  })
})
