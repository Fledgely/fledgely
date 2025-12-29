/**
 * Pseudo-Random Number Generator for Watermarking
 * Story 18.5: Forensic Watermarking on View
 *
 * Deterministic PRNG using Linear Congruential Generator (LCG)
 * for reproducible position generation across encode/decode.
 */

/**
 * Simple pseudo-random number generator (deterministic from seed)
 * Uses a linear congruential generator for reproducibility
 */
export class PRNG {
  private state: number

  constructor(seed: string) {
    // Convert seed string to number
    let hash = 0
    for (const char of seed) {
      hash = (hash << 5) - hash + char.charCodeAt(0)
      hash = hash & hash // Convert to 32-bit integer
    }
    this.state = Math.abs(hash) || 1
  }

  next(): number {
    // LCG parameters (same as glibc)
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff
    return this.state / 0x7fffffff
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
}
