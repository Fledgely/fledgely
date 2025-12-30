/**
 * SafetyDocumentViewer Component Tests
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SafetyDocumentViewer } from './SafetyDocumentViewer'

describe('SafetyDocumentViewer', () => {
  const defaultProps = {
    url: 'https://example.com/document.pdf',
    mimeType: 'application/pdf',
    filename: 'test-document.pdf',
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the document viewer modal', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('displays the filename', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
    })

    it('displays the MIME type', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      expect(screen.getByText('application/pdf')).toBeInTheDocument()
    })

    it('has a close button', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      expect(screen.getByLabelText('Close')).toBeInTheDocument()
    })

    it('has a download button', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      expect(screen.getByText('Download')).toBeInTheDocument()
    })
  })

  describe('PDF viewing', () => {
    it('renders iframe for PDF documents', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      const iframe = document.querySelector('iframe')
      expect(iframe).toBeInTheDocument()
      expect(iframe).toHaveAttribute('src', defaultProps.url)
    })
  })

  describe('image viewing', () => {
    const imageProps = {
      ...defaultProps,
      mimeType: 'image/jpeg',
      filename: 'test-image.jpg',
    }

    it('renders image for image documents', () => {
      render(<SafetyDocumentViewer {...imageProps} />)
      const img = document.querySelector('img')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', defaultProps.url)
    })

    it('has zoom controls for images', () => {
      render(<SafetyDocumentViewer {...imageProps} />)
      expect(screen.getByTitle('Zoom in (+)')).toBeInTheDocument()
      expect(screen.getByTitle('Zoom out (-)')).toBeInTheDocument()
      expect(screen.getByTitle('Reset zoom (0)')).toBeInTheDocument()
    })

    it('displays zoom level', () => {
      render(<SafetyDocumentViewer {...imageProps} />)
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('increases zoom on zoom in click', () => {
      render(<SafetyDocumentViewer {...imageProps} />)
      const zoomInButton = screen.getByTitle('Zoom in (+)')
      fireEvent.click(zoomInButton)
      expect(screen.getByText('125%')).toBeInTheDocument()
    })

    it('decreases zoom on zoom out click', () => {
      render(<SafetyDocumentViewer {...imageProps} />)
      const zoomOutButton = screen.getByTitle('Zoom out (-)')
      fireEvent.click(zoomOutButton)
      expect(screen.getByText('75%')).toBeInTheDocument()
    })
  })

  describe('unsupported formats', () => {
    const unsupportedProps = {
      ...defaultProps,
      mimeType: 'application/msword',
      filename: 'test-document.doc',
    }

    it('shows download option for unsupported formats', () => {
      render(<SafetyDocumentViewer {...unsupportedProps} />)
      expect(screen.getByText(/cannot be previewed inline/i)).toBeInTheDocument()
      expect(screen.getByText('Download to View')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onClose when close button is clicked', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      const closeButton = screen.getByLabelText('Close')
      fireEvent.click(closeButton)
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when overlay is clicked', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      const overlay = screen.getByRole('dialog')
      fireEvent.click(overlay)
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('does not close when content is clicked', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      const filename = screen.getByText('test-document.pdf')
      fireEvent.click(filename)
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has accessible dialog role', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has accessible label', () => {
      render(<SafetyDocumentViewer {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute(
        'aria-label',
        `Document viewer: ${defaultProps.filename}`
      )
    })
  })
})
