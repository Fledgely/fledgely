/**
 * Tests for VPN Detection Module (Story 8.7)
 *
 * Tests VPN detection for bilateral transparency feature.
 * Key focus: Non-accusatory language and detection accuracy.
 */

import { describe, expect, it } from 'vitest'
import { VpnDetectionResult, _testExports } from './vpn-detection'

const { isPrivateIp, analyzeIpsForVpn, VPN_MESSAGES } = _testExports

describe('VPN Detection Module (Story 8.7)', () => {
  describe('isPrivateIp', () => {
    it('should detect 10.x.x.x range as private', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true)
      expect(isPrivateIp('10.8.0.1')).toBe(true)
      expect(isPrivateIp('10.255.255.255')).toBe(true)
    })

    it('should detect 172.16-31.x.x range as private', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true)
      expect(isPrivateIp('172.20.1.1')).toBe(true)
      expect(isPrivateIp('172.31.255.255')).toBe(true)
    })

    it('should NOT detect 172.0-15.x.x as private', () => {
      expect(isPrivateIp('172.0.0.1')).toBe(false)
      expect(isPrivateIp('172.15.0.1')).toBe(false)
    })

    it('should NOT detect 172.32+.x.x as private', () => {
      expect(isPrivateIp('172.32.0.1')).toBe(false)
      expect(isPrivateIp('172.100.0.1')).toBe(false)
    })

    it('should detect 192.168.x.x range as private', () => {
      expect(isPrivateIp('192.168.0.1')).toBe(true)
      expect(isPrivateIp('192.168.1.1')).toBe(true)
      expect(isPrivateIp('192.168.255.255')).toBe(true)
    })

    it('should NOT detect public IPs as private', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false)
      expect(isPrivateIp('1.1.1.1')).toBe(false)
      expect(isPrivateIp('142.250.80.14')).toBe(false)
      expect(isPrivateIp('192.169.0.1')).toBe(false)
    })

    it('should handle invalid IPs', () => {
      expect(isPrivateIp('')).toBe(false)
      expect(isPrivateIp('not-an-ip')).toBe(false)
      expect(isPrivateIp('192.168')).toBe(false)
      expect(isPrivateIp('256.0.0.1')).toBe(false)
    })
  })

  describe('analyzeIpsForVpn', () => {
    it('should detect VPN when multiple private IPs present', () => {
      const result = analyzeIpsForVpn(['192.168.1.100', '10.8.0.5'])
      expect(result.vpnDetected).toBe(true)
      expect(result.confidence).toBe('medium')
      expect(result.method).toBe('webrtc_ip_mismatch')
    })

    it('should detect VPN for OpenVPN default ranges', () => {
      const result = analyzeIpsForVpn(['10.8.0.1'])
      expect(result.vpnDetected).toBe(true)
      expect(result.confidence).toBe('low')
    })

    it('should detect VPN for 10.9.x.x range', () => {
      const result = analyzeIpsForVpn(['10.9.0.5'])
      expect(result.vpnDetected).toBe(true)
    })

    it('should NOT detect VPN for single standard LAN IP', () => {
      const result = analyzeIpsForVpn(['192.168.1.100'])
      expect(result.vpnDetected).toBe(false)
    })

    it('should handle empty IP list', () => {
      const result = analyzeIpsForVpn([])
      expect(result.vpnDetected).toBe(false)
      expect(result.confidence).toBe('low')
    })

    it('should return proper message for VPN detection', () => {
      const result = analyzeIpsForVpn(['192.168.1.100', '10.8.0.5'])
      expect(result.message).toBe(VPN_MESSAGES.detected)
    })

    it('should return proper message for no VPN', () => {
      const result = analyzeIpsForVpn(['192.168.1.100'])
      expect(result.message).toBe(VPN_MESSAGES.notDetected)
    })
  })

  describe('Non-Accusatory Language (AC6)', () => {
    it('should use informational tone in detected message', () => {
      expect(VPN_MESSAGES.detected).toBe('VPN detected - monitoring may be limited')
      expect(VPN_MESSAGES.detected).not.toContain('hiding')
      expect(VPN_MESSAGES.detected).not.toContain('suspicious')
      expect(VPN_MESSAGES.detected).not.toContain('bypassing')
    })

    it('should use neutral tone in not detected message', () => {
      expect(VPN_MESSAGES.notDetected).toBe('No VPN detected')
    })

    it('should use appropriate tone for limitations', () => {
      expect(VPN_MESSAGES.limitations).toBe('Some VPN types may not be detected')
    })

    it('should NOT contain accusatory language', () => {
      const allMessages = Object.values(VPN_MESSAGES)
      const accusatoryWords = [
        'hiding',
        'suspicious',
        'bypassing',
        'sneaking',
        'covert',
        'secret',
        'disobey',
        'violat',
        'cheat',
        'trick',
      ]

      for (const message of allMessages) {
        for (const word of accusatoryWords) {
          expect(message.toLowerCase()).not.toContain(word)
        }
      }
    })
  })

  describe('Detection Result Structure', () => {
    it('should always include confidence level', () => {
      const results: VpnDetectionResult[] = [
        analyzeIpsForVpn(['192.168.1.100', '10.8.0.5']),
        analyzeIpsForVpn(['192.168.1.100']),
        analyzeIpsForVpn([]),
      ]

      for (const result of results) {
        expect(['high', 'medium', 'low']).toContain(result.confidence)
      }
    })

    it('should always include detection method', () => {
      const results: VpnDetectionResult[] = [
        analyzeIpsForVpn(['192.168.1.100', '10.8.0.5']),
        analyzeIpsForVpn(['192.168.1.100']),
        analyzeIpsForVpn([]),
      ]

      const validMethods = ['webrtc_ip_mismatch', 'known_vpn_ip', 'connection_timing', 'none']
      for (const result of results) {
        expect(validMethods).toContain(result.method)
      }
    })

    it('should always include user message', () => {
      const results: VpnDetectionResult[] = [
        analyzeIpsForVpn(['192.168.1.100', '10.8.0.5']),
        analyzeIpsForVpn(['192.168.1.100']),
        analyzeIpsForVpn([]),
      ]

      for (const result of results) {
        expect(result.message).toBeTruthy()
        expect(typeof result.message).toBe('string')
        expect(result.message.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle three or more private IPs', () => {
      const result = analyzeIpsForVpn(['192.168.1.100', '10.8.0.5', '172.16.0.1'])
      expect(result.vpnDetected).toBe(true)
      expect(result.confidence).toBe('medium')
    })

    it('should handle duplicate IPs', () => {
      const result = analyzeIpsForVpn(['192.168.1.100', '192.168.1.100'])
      expect(result.vpnDetected).toBe(true) // 2 IPs even if same
    })

    it('should handle standard 10.x.x.x that is NOT OpenVPN default', () => {
      const result = analyzeIpsForVpn(['10.0.0.1'])
      expect(result.vpnDetected).toBe(false) // Could be corporate LAN
    })

    it('should handle single 172.x.x.x address', () => {
      const result = analyzeIpsForVpn(['172.16.0.50'])
      expect(result.vpnDetected).toBe(false)
    })
  })

  describe('Privacy Compliance', () => {
    it('should NOT log VPN provider in result', () => {
      const result = analyzeIpsForVpn(['192.168.1.100', '10.8.0.5'])
      const resultString = JSON.stringify(result)

      // Should not contain provider names
      expect(resultString).not.toContain('NordVPN')
      expect(resultString).not.toContain('ExpressVPN')
      expect(resultString).not.toContain('provider')
    })

    it('should NOT include actual IP addresses in message', () => {
      const result = analyzeIpsForVpn(['192.168.1.100', '10.8.0.5'])

      // Message should not contain actual IPs
      expect(result.message).not.toContain('192.168')
      expect(result.message).not.toContain('10.8')
    })
  })

  describe('Bilateral Transparency (AC3)', () => {
    it('should provide same message for parent and child', () => {
      // The message is the same regardless of who views it
      // This is a design principle - both parties see the same info
      const result = analyzeIpsForVpn(['192.168.1.100', '10.8.0.5'])

      // Message should be suitable for both audiences
      expect(result.message).toBe(VPN_MESSAGES.detected)

      // Should not mention "child" or "parent" specifically
      expect(result.message).not.toContain('child')
      expect(result.message).not.toContain('parent')
    })
  })

  describe('Detection Limitations Documentation (AC5)', () => {
    it('should acknowledge detection limitations', () => {
      expect(VPN_MESSAGES.limitations).toBeTruthy()
      expect(VPN_MESSAGES.limitations).toContain('may not be detected')
    })

    it('should have medium confidence for non-detection (acknowledges limitations)', () => {
      const result = analyzeIpsForVpn(['192.168.1.100'])
      // Medium (not high) because browser VPNs won't be detected
      expect(result.confidence).toBe('medium')
    })
  })
})
