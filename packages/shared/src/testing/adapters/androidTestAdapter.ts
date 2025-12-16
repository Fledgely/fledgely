/**
 * Android Test Adapter (Mock)
 *
 * Story 7.9: Cross-Platform Allowlist Testing - Task 6.3
 *
 * Mock test adapter for Android platform.
 * This will be fully implemented in Epic 15 (Android Agent).
 *
 * For now, it provides a mock implementation that uses the shared
 * library functions, allowing tests to be written before the
 * actual Android agent is implemented.
 */

import type { AllowlistTestHarnessConfig } from '../allowlistTestHarness'
import {
  getCrisisAllowlist,
  isCrisisUrl,
  isCrisisUrlFuzzy,
} from '../../constants/crisis-urls'

/**
 * Create a mock test adapter for Android platform
 *
 * This adapter simulates Android behavior using shared library functions.
 * The actual implementation will use Room database for caching and
 * WorkManager for sync.
 *
 * @returns Configuration for the test harness
 *
 * @example Android Integration (Epic 15)
 * ```kotlin
 * // In Android test file (Kotlin)
 * class AllowlistTestRunner {
 *     private val crisisAllowlistDao: CrisisAllowlistDao
 *     private val syncService: AllowlistSyncService
 *
 *     suspend fun runPresenceTests(): List<TestResult> {
 *         val results = mutableListOf<TestResult>()
 *
 *         // Test bundled allowlist
 *         val bundled = loadBundledAllowlist()
 *         results.add(TestResult(
 *             name = "Bundled allowlist is non-empty",
 *             passed = bundled.entries.isNotEmpty(),
 *             category = "presence"
 *         ))
 *
 *         // Test Room cache
 *         val cached = crisisAllowlistDao.getCachedAllowlist()
 *         results.add(TestResult(
 *             name = "Room cache is valid",
 *             passed = cached?.version != null,
 *             category = "presence"
 *         ))
 *
 *         return results
 *     }
 * }
 * ```
 */
export function createAndroidTestAdapter(): AllowlistTestHarnessConfig {
  return {
    platform: 'android',
    getAllowlist: getCrisisAllowlist,
    isCrisisUrl,
    isCrisisUrlFuzzy,
    getBundledAllowlist: getCrisisAllowlist,
    // Mock Room database cache
    getCachedAllowlist: async () => {
      // In actual implementation (React Native bridge):
      // const result = await NativeModules.AllowlistBridge.getCachedAllowlist()
      // return result
      return null
    },
    // Android capture would go through MediaProjection API
    // shouldSuppressCapture would be called before each screenshot
  }
}

/**
 * Documentation for Android Integration
 *
 * When implementing Epic 15 (Android Agent), the test adapter
 * should be updated to:
 *
 * 1. Use Room database for caching:
 *    ```kotlin
 *    @Entity(tableName = "crisis_allowlist")
 *    data class CrisisAllowlistEntity(
 *        @PrimaryKey val id: String = "current",
 *        val version: String,
 *        val lastUpdated: Long,
 *        val entriesJson: String,
 *        val cachedAt: Long,
 *        val etag: String?
 *    )
 *
 *    @Dao
 *    interface CrisisAllowlistDao {
 *        @Query("SELECT * FROM crisis_allowlist WHERE id = 'current'")
 *        suspend fun getCachedAllowlist(): CrisisAllowlistEntity?
 *
 *        @Insert(onConflict = OnConflictStrategy.REPLACE)
 *        suspend fun saveAllowlist(allowlist: CrisisAllowlistEntity)
 *    }
 *    ```
 *
 * 2. Load bundled allowlist from assets:
 *    ```kotlin
 *    fun loadBundledAllowlist(context: Context): CrisisAllowlist {
 *        val json = context.assets.open("crisis-allowlist.json")
 *            .bufferedReader().use { it.readText() }
 *        return Json.decodeFromString(json)
 *    }
 *    ```
 *
 * 3. Implement shouldSuppressCapture in MediaProjection callback:
 *    ```kotlin
 *    class ScreenshotService : Service() {
 *        private val privacyGapDetector: PrivacyGapDetector
 *
 *        private suspend fun shouldCapture(url: String): Boolean {
 *            val result = privacyGapDetector.shouldSuppressCapture(
 *                childId = currentChildId,
 *                timestamp = System.currentTimeMillis(),
 *                url = url
 *            )
 *            // CRITICAL: result only has 'suppress' field - no reason
 *            return !result.suppress
 *        }
 *    }
 *    ```
 *
 * 4. Test structure for Android:
 *    ```kotlin
 *    @RunWith(AndroidJUnit4::class)
 *    class AllowlistIntegrationTest {
 *        @get:Rule
 *        val instantTaskExecutor = InstantTaskExecutorRule()
 *
 *        @Test
 *        fun bundledAllowlistIsNonEmpty() {
 *            val bundled = loadBundledAllowlist(context)
 *            assertThat(bundled.entries).isNotEmpty()
 *        }
 *
 *        @Test
 *        fun crisisUrlTriggersSuppressionWithNoReason() = runTest {
 *            val result = detector.shouldSuppressCapture(
 *                "child-123",
 *                Date(),
 *                "https://988lifeline.org"
 *            )
 *            // Zero-data-path compliance
 *            assertThat(result.suppress).isTrue()
 *            assertThat(result.javaClass.declaredFields.map { it.name })
 *                .containsExactly("suppress")
 *        }
 *    }
 *    ```
 */
export const ANDROID_INTEGRATION_DOCS = `
See JSDoc above for Android integration documentation.
`
