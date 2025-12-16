import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef, createRef } from 'react'
import { useFocusTrap } from '../useFocusTrap'

describe('useFocusTrap', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <input id="input1" type="text" />
      <button id="btn2">Button 2</button>
      <button id="btn3" disabled>Disabled Button</button>
      <span id="not-focusable">Not focusable</span>
    `
    document.body.appendChild(container)
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  describe('getFocusableElements', () => {
    it('returns all focusable elements in container', () => {
      const ref = { current: container }
      const { result } = renderHook(() => useFocusTrap(ref, { enabled: false }))

      const focusable = result.current.getFocusableElements()
      expect(focusable).toHaveLength(3) // btn1, input1, btn2 (not disabled btn3)
    })

    it('excludes disabled elements', () => {
      const ref = { current: container }
      const { result } = renderHook(() => useFocusTrap(ref, { enabled: false }))

      const focusable = result.current.getFocusableElements()
      const ids = focusable.map((el) => el.id)
      expect(ids).not.toContain('btn3')
    })

    it('excludes elements with tabindex=-1', () => {
      const btn1 = container.querySelector('#btn1')
      btn1?.setAttribute('tabindex', '-1')

      const ref = { current: container }
      const { result } = renderHook(() => useFocusTrap(ref, { enabled: false }))

      const focusable = result.current.getFocusableElements()
      const ids = focusable.map((el) => el.id)
      expect(ids).not.toContain('btn1')
    })
  })

  describe('focusFirst', () => {
    it('focuses the first focusable element', () => {
      const ref = { current: container }
      const { result } = renderHook(() => useFocusTrap(ref, { enabled: false }))

      result.current.focusFirst()
      expect(document.activeElement?.id).toBe('btn1')
    })
  })

  describe('focusLast', () => {
    it('focuses the last focusable element', () => {
      const ref = { current: container }
      const { result } = renderHook(() => useFocusTrap(ref, { enabled: false }))

      result.current.focusLast()
      expect(document.activeElement?.id).toBe('btn2')
    })
  })

  describe('keyboard trap', () => {
    it('traps Tab at the end of container', () => {
      const ref = { current: container }
      renderHook(() => useFocusTrap(ref, { enabled: true }))
      vi.runAllTimers()

      // Focus last element
      const btn2 = container.querySelector('#btn2') as HTMLElement
      btn2.focus()
      expect(document.activeElement?.id).toBe('btn2')

      // Simulate Tab key
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
      })
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
      container.dispatchEvent(event)

      // Should cycle back to first element
      expect(document.activeElement?.id).toBe('btn1')
    })

    it('traps Shift+Tab at the start of container', () => {
      const ref = { current: container }
      renderHook(() => useFocusTrap(ref, { enabled: true }))
      vi.runAllTimers()

      // Focus first element
      const btn1 = container.querySelector('#btn1') as HTMLElement
      btn1.focus()
      expect(document.activeElement?.id).toBe('btn1')

      // Simulate Shift+Tab key
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      })
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
      container.dispatchEvent(event)

      // Should cycle to last element
      expect(document.activeElement?.id).toBe('btn2')
    })
  })

  describe('Escape key handling', () => {
    it('calls onEscape callback when Escape is pressed', () => {
      const onEscape = vi.fn()
      const ref = { current: container }
      renderHook(() => useFocusTrap(ref, { enabled: true, onEscape }))
      vi.runAllTimers()

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      })
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
      container.dispatchEvent(event)

      expect(onEscape).toHaveBeenCalledTimes(1)
    })
  })

  describe('initial focus', () => {
    it('focuses first element when enabled', () => {
      const ref = { current: container }
      renderHook(() => useFocusTrap(ref, { enabled: true }))
      vi.runAllTimers()

      expect(document.activeElement?.id).toBe('btn1')
    })

    it('focuses specified element by selector', () => {
      const ref = { current: container }
      renderHook(() => useFocusTrap(ref, { enabled: true, initialFocus: '#input1' }))
      vi.runAllTimers()

      expect(document.activeElement?.id).toBe('input1')
    })

    it('does not focus when disabled', () => {
      const ref = { current: container }
      renderHook(() => useFocusTrap(ref, { enabled: false }))
      vi.runAllTimers()

      expect(document.activeElement?.id).not.toBe('btn1')
    })
  })

  describe('return focus', () => {
    it('returns focus to previously focused element on cleanup', () => {
      // Focus an element outside the trap
      const outsideButton = document.createElement('button')
      outsideButton.id = 'outside'
      document.body.appendChild(outsideButton)
      outsideButton.focus()
      expect(document.activeElement?.id).toBe('outside')

      const ref = { current: container }
      const { unmount } = renderHook(() => useFocusTrap(ref, { enabled: true }))
      vi.runAllTimers()

      // Focus moves into trap
      expect(document.activeElement?.id).toBe('btn1')

      // Unmount the trap
      unmount()
      vi.runAllTimers()

      // Focus should return to outside button
      expect(document.activeElement?.id).toBe('outside')

      document.body.removeChild(outsideButton)
    })
  })
})
