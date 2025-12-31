/**
 * Tests for DemoChildAnnotation Component
 *
 * Story 8.5.4: Sample Flag & Alert Examples
 * AC3: Child annotation examples
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoChildAnnotation } from './DemoChildAnnotation'
import type { DemoFlagAnnotation } from '../../../data/demoData'

// Sample test data
const childAnnotation: DemoFlagAnnotation = {
  text: 'I was researching for my science project about the human body.',
  timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  fromChild: true,
}

const parentAnnotation: DemoFlagAnnotation = {
  text: 'Discussed this with Alex and confirmed it was for homework.',
  timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
  fromChild: false,
}

describe('DemoChildAnnotation', () => {
  describe('basic rendering', () => {
    it('should render with demo styling', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} />)
      const component = screen.getByTestId('demo-child-annotation')
      expect(component).toBeInTheDocument()
    })

    it('should show demo badge', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} />)
      const badge = screen.getByTestId('demo-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('Demo')
    })
  })

  describe('child annotation (AC3)', () => {
    it('should display annotation text in quotes', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} />)
      const text = screen.getByTestId('annotation-text')
      // Contains the annotation text wrapped in curly quotes (using unicode curly quote characters)
      expect(text).toHaveTextContent(childAnnotation.text)
      // Check for curly quote unicode characters (U+201C and U+201D)
      expect(text.textContent).toContain('\u201C') // Left double quote "
      expect(text.textContent).toContain('\u201D') // Right double quote "
    })

    it('should show child icon for child annotations', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} />)
      const icon = screen.getByTestId('annotation-icon')
      expect(icon).toHaveTextContent('👤')
    })

    it('should show "Alex\'s Response" for child annotations', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} />)
      const author = screen.getByTestId('annotation-author')
      expect(author).toHaveTextContent("Alex's Response")
    })

    it('should use custom child name', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} childName="Emma" />)
      const author = screen.getByTestId('annotation-author')
      expect(author).toHaveTextContent("Emma's Response")
    })
  })

  describe('parent annotation', () => {
    it('should show note icon for parent annotations', () => {
      render(<DemoChildAnnotation annotation={parentAnnotation} />)
      const icon = screen.getByTestId('annotation-icon')
      expect(icon).toHaveTextContent('📝')
    })

    it('should show "Parent Note" for parent annotations', () => {
      render(<DemoChildAnnotation annotation={parentAnnotation} />)
      const author = screen.getByTestId('annotation-author')
      expect(author).toHaveTextContent('Parent Note')
    })
  })

  describe('timestamp display', () => {
    it('should display timestamp', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} />)
      const timestamp = screen.getByTestId('annotation-timestamp')
      expect(timestamp).toBeInTheDocument()
      expect(timestamp.textContent).toBeTruthy()
    })

    it('should show "Just now" for very recent annotations', () => {
      const recentAnnotation: DemoFlagAnnotation = {
        ...childAnnotation,
        timestamp: Date.now() - 30 * 1000, // 30 seconds ago
      }
      render(<DemoChildAnnotation annotation={recentAnnotation} />)
      const timestamp = screen.getByTestId('annotation-timestamp')
      expect(timestamp).toHaveTextContent('Just now')
    })

    it('should show minutes ago for recent annotations', () => {
      const minutesAgoAnnotation: DemoFlagAnnotation = {
        ...childAnnotation,
        timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      }
      render(<DemoChildAnnotation annotation={minutesAgoAnnotation} />)
      const timestamp = screen.getByTestId('annotation-timestamp')
      expect(timestamp).toHaveTextContent('15 minutes ago')
    })

    it('should show hours ago for annotations from today', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} />)
      const timestamp = screen.getByTestId('annotation-timestamp')
      expect(timestamp).toHaveTextContent('hours ago')
    })

    it('should show days ago for older annotations', () => {
      const daysAgoAnnotation: DemoFlagAnnotation = {
        ...childAnnotation,
        timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
      }
      render(<DemoChildAnnotation annotation={daysAgoAnnotation} />)
      const timestamp = screen.getByTestId('annotation-timestamp')
      expect(timestamp).toHaveTextContent('3 days ago')
    })

    it('should show date for very old annotations', () => {
      const oldAnnotation: DemoFlagAnnotation = {
        ...childAnnotation,
        timestamp: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days ago
      }
      render(<DemoChildAnnotation annotation={oldAnnotation} />)
      const timestamp = screen.getByTestId('annotation-timestamp')
      // Should contain a date format (not "ago")
      expect(timestamp.textContent).not.toContain('ago')
    })
  })

  describe('styling', () => {
    it('should have yellow/amber background for child annotations', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} />)
      const component = screen.getByTestId('demo-child-annotation')
      expect(component).toHaveStyle({ backgroundColor: '#fef3c7' })
    })

    it('should have italic text style', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} />)
      const text = screen.getByTestId('annotation-text')
      expect(text).toHaveStyle({ fontStyle: 'italic' })
    })

    it('should have dashed border', () => {
      render(<DemoChildAnnotation annotation={childAnnotation} />)
      const component = screen.getByTestId('demo-child-annotation')
      expect(component).toHaveStyle({ borderStyle: 'dashed' })
    })
  })
})
