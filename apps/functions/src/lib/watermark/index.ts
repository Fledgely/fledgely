/**
 * Forensic Watermark Library
 * Story 18.5: Forensic Watermarking on View
 *
 * Provides invisible watermarking for screenshot leak tracing.
 */

export {
  embedWatermark,
  hasWatermarkCapacity,
  getPayloadBitLength,
  type WatermarkPayload,
  type WatermarkConfig,
} from './encode'
export { extractWatermark, hasWatermark, type DecodedWatermark } from './decode'
