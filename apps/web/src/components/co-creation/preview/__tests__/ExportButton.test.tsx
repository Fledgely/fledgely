/**
 * Tests for ExportButton Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 6.7
 *
 * Tests for the export button dropdown component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExportButton } from '../ExportButton'

// ============================================
// MOCK SETUP
// ============================================

const mockOnExportPdf = vi.fn()
const mockOnPrint = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================
// BASIC RENDERING TESTS
// ============================================

describe('ExportButton', () => {
  describe('basic rendering', () => {
    it('renders without crashing', () => {
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)
      expect(screen.getByTestId('export-button')).toBeInTheDocument()
    })

    it('renders with custom data-testid', () => {
      render(
        <ExportButton
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
          data-testid="custom-export"
        />
      )
      expect(screen.getByTestId('custom-export')).toBeInTheDocument()
    })

    it('renders export text by default', () => {
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)
      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <ExportButton
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
          className="custom-class"
        />
      )
      const container = screen.getByTestId('export-button').parentElement
      expect(container).toHaveClass('custom-class')
    })
  })

  // ============================================
  // DROPDOWN TESTS
  // ============================================

  describe('dropdown functionality', () => {
    it('opens dropdown on click', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))

      expect(screen.getByTestId('export-button-menu')).toBeInTheDocument()
    })

    it('shows PDF option in dropdown', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))

      expect(screen.getByText('Download PDF')).toBeInTheDocument()
      expect(screen.getByText('Save agreement as PDF file')).toBeInTheDocument()
    })

    it('shows print option in dropdown', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))

      expect(screen.getByText('Print')).toBeInTheDocument()
      expect(screen.getByText('Open print dialog')).toBeInTheDocument()
    })

    it('closes dropdown when clicking outside', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />
          <div data-testid="outside">Outside</div>
        </div>
      )

      await user.click(screen.getByTestId('export-button'))
      expect(screen.getByTestId('export-button-menu')).toBeInTheDocument()

      // Click outside
      fireEvent.mouseDown(screen.getByTestId('outside'))

      await waitFor(() => {
        expect(screen.queryByTestId('export-button-menu')).not.toBeInTheDocument()
      })
    })

    it('closes dropdown on Escape key', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))
      expect(screen.getByTestId('export-button-menu')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByTestId('export-button-menu')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================
  // EXPORT ACTION TESTS
  // ============================================

  describe('export actions', () => {
    it('calls onExportPdf when PDF option clicked', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))
      await user.click(screen.getByText('Download PDF'))

      expect(mockOnExportPdf).toHaveBeenCalledTimes(1)
    })

    it('calls onPrint when print option clicked', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))
      await user.click(screen.getByText('Print'))

      expect(mockOnPrint).toHaveBeenCalledTimes(1)
    })

    it('closes dropdown after PDF export', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))
      await user.click(screen.getByText('Download PDF'))

      await waitFor(() => {
        expect(screen.queryByTestId('export-button-menu')).not.toBeInTheDocument()
      })
    })

    it('closes dropdown after print', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))
      await user.click(screen.getByText('Print'))

      await waitFor(() => {
        expect(screen.queryByTestId('export-button-menu')).not.toBeInTheDocument()
      })
    })
  })

  // ============================================
  // EXPORTING STATE TESTS
  // ============================================

  describe('exporting state', () => {
    it('shows exporting text when isExporting is true', () => {
      render(
        <ExportButton
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
          isExporting={true}
        />
      )
      expect(screen.getByText('Exporting...')).toBeInTheDocument()
    })

    it('disables button when isExporting is true', () => {
      render(
        <ExportButton
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
          isExporting={true}
        />
      )
      expect(screen.getByTestId('export-button')).toBeDisabled()
    })

    it('prevents dropdown from opening when exporting', async () => {
      const user = userEvent.setup()
      render(
        <ExportButton
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
          isExporting={true}
        />
      )

      await user.click(screen.getByTestId('export-button'))

      expect(screen.queryByTestId('export-button-menu')).not.toBeInTheDocument()
    })

    it('shows spinner when exporting', () => {
      const { container } = render(
        <ExportButton
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
          isExporting={true}
        />
      )
      // Check for the spinning animation class
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  // ============================================
  // DISABLED STATE TESTS
  // ============================================

  describe('disabled state', () => {
    it('disables button when disabled prop is true', () => {
      render(
        <ExportButton
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
          disabled={true}
        />
      )
      expect(screen.getByTestId('export-button')).toBeDisabled()
    })

    it('prevents dropdown from opening when disabled', async () => {
      const user = userEvent.setup()
      render(
        <ExportButton
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
          disabled={true}
        />
      )

      await user.click(screen.getByTestId('export-button'))

      expect(screen.queryByTestId('export-button-menu')).not.toBeInTheDocument()
    })
  })

  // ============================================
  // ACCESSIBILITY TESTS
  // ============================================

  describe('accessibility', () => {
    it('has aria-haspopup attribute', () => {
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)
      expect(screen.getByTestId('export-button')).toHaveAttribute('aria-haspopup', 'menu')
    })

    it('has aria-expanded attribute', () => {
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)
      expect(screen.getByTestId('export-button')).toHaveAttribute('aria-expanded', 'false')
    })

    it('sets aria-expanded to true when open', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))

      expect(screen.getByTestId('export-button')).toHaveAttribute('aria-expanded', 'true')
    })

    it('dropdown menu has role="menu"', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))

      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('dropdown items have role="menuitem"', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems).toHaveLength(2)
    })

    it('has screen reader status for exporting', () => {
      render(
        <ExportButton
          onExportPdf={mockOnExportPdf}
          onPrint={mockOnPrint}
          isExporting={true}
        />
      )
      const status = screen.getByRole('status')
      expect(status.textContent).toContain('Exporting')
    })

    it('focuses button after closing dropdown with Escape', async () => {
      const user = userEvent.setup()
      render(<ExportButton onExportPdf={mockOnExportPdf} onPrint={mockOnPrint} />)

      await user.click(screen.getByTestId('export-button'))
      await user.keyboard('{Escape}')

      expect(screen.getByTestId('export-button')).toHaveFocus()
    })
  })
})
