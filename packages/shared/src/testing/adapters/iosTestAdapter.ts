/**
 * iOS Test Adapter (Mock)
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 6.4
 *
 * Mock test adapter for iOS platform.
 * This will be fully implemented in Epic 43 (iOS Integration).
 *
 * For now, it provides a mock implementation that uses the shared
 * library functions, allowing tests to be written before the
 * actual iOS integration is implemented.
 */

import type { AllowlistTestHarnessConfig } from '../allowlistTestHarness'
import {
  getCrisisAllowlist,
  isCrisisUrl,
  isCrisisUrlFuzzy,
} from '../../constants/crisis-urls'

/**
 * Create a mock test adapter for iOS platform
 *
 * This adapter simulates iOS behavior using shared library functions.
 * The actual implementation will use CoreData for caching and
 * BGTaskScheduler for sync.
 *
 * @returns Configuration for the test harness
 *
 * @example iOS Integration (Epic 43)
 * ```swift
 * // In iOS test file (Swift)
 * class AllowlistTestRunner {
 *     private let coreDataStack: CoreDataStack
 *     private let syncService: AllowlistSyncService
 *
 *     func runPresenceTests() async -> [TestResult] {
 *         var results: [TestResult] = []
 *
 *         // Test bundled allowlist
 *         let bundled = loadBundledAllowlist()
 *         results.append(TestResult(
 *             name: "Bundled allowlist is non-empty",
 *             passed: !bundled.entries.isEmpty,
 *             category: .presence
 *         ))
 *
 *         // Test CoreData cache
 *         let cached = try? await fetchCachedAllowlist()
 *         results.append(TestResult(
 *             name: "CoreData cache is valid",
 *             passed: cached?.version != nil,
 *             category: .presence
 *         ))
 *
 *         return results
 *     }
 * }
 * ```
 */
export function createiOSTestAdapter(): AllowlistTestHarnessConfig {
  return {
    platform: 'ios',
    getAllowlist: getCrisisAllowlist,
    isCrisisUrl,
    isCrisisUrlFuzzy,
    getBundledAllowlist: getCrisisAllowlist,
    // Mock CoreData cache
    getCachedAllowlist: async () => {
      // In actual implementation (React Native bridge):
      // const result = await NativeModules.AllowlistBridge.getCachedAllowlist()
      // return result
      return null
    },
    // iOS has limited screenshot capabilities via Screen Time API
    // shouldSuppressCapture would check before logging any activity
  }
}

/**
 * Documentation for iOS Integration
 *
 * When implementing Epic 43 (iOS Integration), the test adapter
 * should be updated to:
 *
 * 1. Use CoreData for caching:
 *    ```swift
 *    @objc(CrisisAllowlistEntity)
 *    public class CrisisAllowlistEntity: NSManagedObject {
 *        @NSManaged public var version: String
 *        @NSManaged public var lastUpdated: Date
 *        @NSManaged public var entriesData: Data
 *        @NSManaged public var cachedAt: Date
 *        @NSManaged public var etag: String?
 *    }
 *
 *    extension CrisisAllowlistEntity {
 *        @nonobjc public class func fetchRequest() -> NSFetchRequest<CrisisAllowlistEntity> {
 *            return NSFetchRequest<CrisisAllowlistEntity>(entityName: "CrisisAllowlistEntity")
 *        }
 *    }
 *
 *    class AllowlistCacheService {
 *        private let context: NSManagedObjectContext
 *
 *        func getCachedAllowlist() async throws -> CachedAllowlist? {
 *            let request = CrisisAllowlistEntity.fetchRequest()
 *            request.fetchLimit = 1
 *            guard let entity = try context.fetch(request).first else {
 *                return nil
 *            }
 *            let allowlist = try JSONDecoder().decode(
 *                CrisisAllowlist.self,
 *                from: entity.entriesData
 *            )
 *            return CachedAllowlist(
 *                allowlist: allowlist,
 *                cachedAt: entity.cachedAt,
 *                etag: entity.etag
 *            )
 *        }
 *    }
 *    ```
 *
 * 2. Load bundled allowlist from Resources:
 *    ```swift
 *    func loadBundledAllowlist() -> CrisisAllowlist {
 *        guard let url = Bundle.main.url(
 *            forResource: "crisis-allowlist",
 *            withExtension: "json"
 *        ) else {
 *            fatalError("Bundled allowlist not found")
 *        }
 *
 *        let data = try! Data(contentsOf: url)
 *        return try! JSONDecoder().decode(CrisisAllowlist.self, from: data)
 *    }
 *    ```
 *
 * 3. Implement shouldSuppressCapture for Screen Time content filtering:
 *    ```swift
 *    // In DeviceActivityMonitorExtension
 *    class DeviceActivityMonitorExtension: DeviceActivityMonitor {
 *        override func eventDidReachThreshold(
 *            _ event: DeviceActivityEvent.Name,
 *            activity: DeviceActivityName
 *        ) {
 *            // Check if URL is crisis resource before logging
 *            guard let url = getCurrentURL() else { return }
 *
 *            let result = PrivacyGapDetector.shared.shouldSuppressCapture(
 *                childId: currentChildId,
 *                timestamp: Date(),
 *                url: url.absoluteString
 *            )
 *
 *            // CRITICAL: result only has 'suppress' field - no reason
 *            if result.suppress {
 *                return // Skip all logging
 *            }
 *
 *            // Continue with activity logging
 *            logActivity(event, activity)
 *        }
 *    }
 *    ```
 *
 * 4. Test structure for iOS:
 *    ```swift
 *    import XCTest
 *    @testable import FledgelyiOS
 *
 *    final class AllowlistIntegrationTests: XCTestCase {
 *        func testBundledAllowlistIsNonEmpty() throws {
 *            let bundled = loadBundledAllowlist()
 *            XCTAssertFalse(bundled.entries.isEmpty)
 *        }
 *
 *        func testCrisisUrlTriggersSuppressionWithNoReason() async throws {
 *            let result = await detector.shouldSuppressCapture(
 *                childId: "child-123",
 *                timestamp: Date(),
 *                url: "https://988lifeline.org"
 *            )
 *
 *            // Zero-data-path compliance
 *            XCTAssertTrue(result.suppress)
 *
 *            // Verify no reason field via Mirror
 *            let mirror = Mirror(reflecting: result)
 *            let properties = mirror.children.map { $0.label }
 *            XCTAssertEqual(properties, ["suppress"])
 *        }
 *    }
 *    ```
 *
 * Note: iOS Screen Time API has significant limitations compared to
 * other platforms. The content filter can detect URLs but cannot
 * capture screenshots. The allowlist check should prevent any
 * activity logging for crisis resources.
 */
export const IOS_INTEGRATION_DOCS = `
See JSDoc above for iOS integration documentation.
`
