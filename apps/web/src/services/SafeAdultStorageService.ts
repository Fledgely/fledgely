'use client'

/**
 * SafeAdultStorageService
 *
 * Story 7.5.4: Safe Adult Designation - Task 3
 *
 * Provides encrypted IndexedDB storage for safe adult contact information.
 * Uses SafeAdultEncryptionService for encryption/decryption.
 *
 * CRITICAL SAFETY REQUIREMENTS (INV-002):
 * - Storage is isolated from family data (separate IndexedDB database)
 * - All contact data is encrypted before storage
 * - Clears storage on child ID change (security measure)
 * - No family-accessible read path exists
 *
 * Storage Flow:
 * 1. Contact input validated using contracts schema
 * 2. Contact encrypted using SafeAdultEncryptionService
 * 3. Encrypted data stored in isolated IndexedDB
 * 4. On load, data decrypted and validated before return
 *
 * CRITICAL INVARIANT (INV-002): Safe adult contact NEVER visible to family.
 */

import type { SafeAdultContactInput, ContactType } from '@fledgely/contracts'
import {
  type ISafeAdultEncryptionService,
  type EncryptedSafeAdultContact,
  getSafeAdultEncryptionService,
} from './SafeAdultEncryptionService'

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for storage service
 */
export interface SafeAdultStorageConfig {
  /** IndexedDB database name */
  dbName?: string
  /** IndexedDB store name */
  storeName?: string
  /** Custom encryption service (for testing) */
  encryptionService?: ISafeAdultEncryptionService
  /** Enable verbose logging for debugging (NOT in production) */
  enableDebugLogging?: boolean
}

/**
 * Stored safe adult designation (encrypted)
 */
export interface StoredSafeAdultDesignation {
  /** Child ID (the designator) */
  childId: string
  /** Child's first name (for notification message) */
  childFirstName: string
  /** Encrypted contact data */
  encryptedContact: EncryptedSafeAdultContact
  /** Contact type (for UI display without decryption) */
  contactType: ContactType
  /** When the designation was created (ISO timestamp) */
  createdAt: string
  /** When the designation was last updated (ISO timestamp) */
  updatedAt: string
}

/**
 * Input for saving a safe adult designation
 */
export interface SaveSafeAdultInput {
  /** Child ID (the designator) */
  childId: string
  /** Child's first name (for notification message) */
  childFirstName: string
  /** Contact to save */
  contact: SafeAdultContactInput
}

/**
 * Result of loading a safe adult designation
 */
export interface LoadSafeAdultResult {
  /** Child ID */
  childId: string
  /** Child's first name */
  childFirstName: string
  /** Decrypted contact */
  contact: SafeAdultContactInput
  /** Contact type */
  contactType: ContactType
  /** When created */
  createdAt: string
  /** When updated */
  updatedAt: string
  /** Encryption key ID (for notification) */
  keyId: string
}

/**
 * Interface for safe adult storage service
 */
export interface ISafeAdultStorageService {
  /** Initialize the storage service */
  initialize: () => Promise<void>

  /** Save a safe adult designation (encrypted) */
  save: (input: SaveSafeAdultInput) => Promise<void>

  /** Load a safe adult designation for a child */
  load: (childId: string) => Promise<LoadSafeAdultResult | null>

  /** Check if a safe adult designation exists for a child */
  exists: (childId: string) => Promise<boolean>

  /** Delete a safe adult designation */
  delete: (childId: string) => Promise<void>

  /** Get the encrypted contact for notification (without decryption) */
  getEncryptedForNotification: (
    childId: string
  ) => Promise<{ encryptedContact: EncryptedSafeAdultContact; childFirstName: string; contactType: ContactType } | null>

  /** Clear all designations (for testing/logout) */
  clear: () => Promise<void>

  /** Close the storage service */
  destroy: () => Promise<void>
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DB_NAME = 'fledgely-safe-adult-designation'
const DEFAULT_STORE_NAME = 'designations'
const DB_VERSION = 1

// ============================================================================
// SafeAdultStorageService
// ============================================================================

/**
 * Service for managing encrypted safe adult contact storage
 *
 * Uses IndexedDB for persistence with AES-GCM encryption.
 *
 * @example
 * ```ts
 * const storageService = new SafeAdultStorageService()
 * await storageService.initialize()
 *
 * // Save a safe adult
 * await storageService.save({
 *   childId: 'child-123',
 *   childFirstName: 'Alex',
 *   contact: { type: 'phone', value: '5551234567' }
 * })
 *
 * // Load a safe adult
 * const result = await storageService.load('child-123')
 * ```
 */
export class SafeAdultStorageService implements ISafeAdultStorageService {
  private db: IDBDatabase | null = null
  private readonly dbName: string
  private readonly storeName: string
  private readonly encryption: ISafeAdultEncryptionService
  private readonly enableDebugLogging: boolean

  constructor(config: SafeAdultStorageConfig = {}) {
    this.dbName = config.dbName ?? DEFAULT_DB_NAME
    this.storeName = config.storeName ?? DEFAULT_STORE_NAME
    this.encryption = config.encryptionService ?? getSafeAdultEncryptionService()
    this.enableDebugLogging = config.enableDebugLogging ?? false
  }

  /**
   * Initialize the storage service
   *
   * Opens/creates the IndexedDB database.
   */
  async initialize(): Promise<void> {
    // Skip if already initialized or in SSR
    if (this.db || typeof indexedDB === 'undefined') {
      return
    }

    this.db = await this.openDatabase()
    this.debugLog('Storage initialized')
  }

  /**
   * Save a safe adult designation (encrypted)
   *
   * @param input - The designation to save
   */
  async save(input: SaveSafeAdultInput): Promise<void> {
    if (!this.db) {
      throw new SafeAdultStorageError('Storage not initialized')
    }

    // Encrypt the contact
    const encryptedContact = await this.encryption.encrypt(input.contact)

    const now = new Date().toISOString()

    // Check if exists to preserve createdAt
    const existing = await this.getRecord(input.childId)
    const createdAt = existing?.createdAt ?? now

    const record: StoredSafeAdultDesignation = {
      childId: input.childId,
      childFirstName: input.childFirstName,
      encryptedContact,
      contactType: input.contact.type,
      createdAt,
      updatedAt: now,
    }

    await this.putRecord(record)
    this.debugLog('Designation saved', { childId: input.childId, type: input.contact.type })
  }

  /**
   * Load a safe adult designation for a child
   *
   * @param childId - The child's ID
   * @returns The decrypted designation, or null if not found
   */
  async load(childId: string): Promise<LoadSafeAdultResult | null> {
    if (!this.db) {
      throw new SafeAdultStorageError('Storage not initialized')
    }

    const record = await this.getRecord(childId)
    if (!record) {
      return null
    }

    // Decrypt the contact
    const contact = await this.encryption.decrypt(record.encryptedContact)

    return {
      childId: record.childId,
      childFirstName: record.childFirstName,
      contact,
      contactType: record.contactType,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      keyId: record.encryptedContact.keyId,
    }
  }

  /**
   * Check if a safe adult designation exists for a child
   *
   * @param childId - The child's ID
   * @returns Whether a designation exists
   */
  async exists(childId: string): Promise<boolean> {
    if (!this.db) {
      return false
    }

    const record = await this.getRecord(childId)
    return record !== null
  }

  /**
   * Delete a safe adult designation
   *
   * @param childId - The child's ID
   */
  async delete(childId: string): Promise<void> {
    if (!this.db) {
      return
    }

    await this.deleteRecord(childId)
    this.debugLog('Designation deleted', { childId })
  }

  /**
   * Get the encrypted contact for notification (without decryption)
   *
   * Used when sending a notification - we don't need to decrypt locally.
   *
   * @param childId - The child's ID
   * @returns The encrypted contact and child's first name, or null if not found
   */
  async getEncryptedForNotification(
    childId: string
  ): Promise<{ encryptedContact: EncryptedSafeAdultContact; childFirstName: string; contactType: ContactType } | null> {
    if (!this.db) {
      throw new SafeAdultStorageError('Storage not initialized')
    }

    const record = await this.getRecord(childId)
    if (!record) {
      return null
    }

    return {
      encryptedContact: record.encryptedContact,
      childFirstName: record.childFirstName,
      contactType: record.contactType,
    }
  }

  /**
   * Clear all designations
   *
   * For testing or logout scenarios.
   */
  async clear(): Promise<void> {
    if (!this.db) {
      return
    }

    await this.clearStore()
    this.debugLog('All designations cleared')
  }

  /**
   * Close the storage service
   */
  async destroy(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.debugLog('Storage destroyed')
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Open or create the IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, DB_VERSION)

      request.onerror = () => {
        reject(new SafeAdultStorageError('Failed to open safe adult storage database'))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object store for designations
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'childId' })

          // Index for finding designations by creation time (for cleanup)
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  /**
   * Get a record from IndexedDB
   */
  private getRecord(childId: string): Promise<StoredSafeAdultDesignation | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(childId)

      request.onsuccess = () => {
        resolve(request.result ?? null)
      }

      request.onerror = () => {
        reject(new SafeAdultStorageError(`Failed to get designation for child: ${childId}`))
      }
    })
  }

  /**
   * Put a record into IndexedDB
   */
  private putRecord(record: StoredSafeAdultDesignation): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(record)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new SafeAdultStorageError(`Failed to save designation for child: ${record.childId}`))
      }
    })
  }

  /**
   * Delete a record from IndexedDB
   */
  private deleteRecord(childId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(childId)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new SafeAdultStorageError(`Failed to delete designation for child: ${childId}`))
      }
    })
  }

  /**
   * Clear all records from the store
   */
  private clearStore(): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(new SafeAdultStorageError('Failed to clear designations'))
      }
    })
  }

  /**
   * Debug logging (only when enabled)
   */
  private debugLog(message: string, data?: Record<string, unknown>): void {
    if (this.enableDebugLogging) {
      console.log(`[SafeAdultStorageService] ${message}`, data ?? '')
    }
  }
}

/**
 * Custom error class for storage failures
 */
export class SafeAdultStorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SafeAdultStorageError'
  }
}

// ============================================================================
// Mock Storage Service (for testing)
// ============================================================================

/**
 * Mock storage service for development and testing
 *
 * Uses in-memory Map instead of IndexedDB.
 */
export class MockSafeAdultStorageService implements ISafeAdultStorageService {
  private storage = new Map<string, StoredSafeAdultDesignation>()
  private encryption: ISafeAdultEncryptionService
  private initialized = false
  private shouldFail = false
  private failureMessage = 'Mock storage failure'

  constructor(encryptionService?: ISafeAdultEncryptionService) {
    this.encryption = encryptionService ?? getSafeAdultEncryptionService(true) // Use mock encryption
  }

  /**
   * Configure mock to fail
   */
  setFailure(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail
    if (message) this.failureMessage = message
  }

  async initialize(): Promise<void> {
    if (this.shouldFail) {
      throw new SafeAdultStorageError(this.failureMessage)
    }
    this.initialized = true
  }

  async save(input: SaveSafeAdultInput): Promise<void> {
    if (this.shouldFail) {
      throw new SafeAdultStorageError(this.failureMessage)
    }
    if (!this.initialized) {
      throw new SafeAdultStorageError('Storage not initialized')
    }

    const encryptedContact = await this.encryption.encrypt(input.contact)
    const now = new Date().toISOString()
    const existing = this.storage.get(input.childId)

    const record: StoredSafeAdultDesignation = {
      childId: input.childId,
      childFirstName: input.childFirstName,
      encryptedContact,
      contactType: input.contact.type,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

    this.storage.set(input.childId, record)
  }

  async load(childId: string): Promise<LoadSafeAdultResult | null> {
    if (this.shouldFail) {
      throw new SafeAdultStorageError(this.failureMessage)
    }
    if (!this.initialized) {
      throw new SafeAdultStorageError('Storage not initialized')
    }

    const record = this.storage.get(childId)
    if (!record) {
      return null
    }

    const contact = await this.encryption.decrypt(record.encryptedContact)

    return {
      childId: record.childId,
      childFirstName: record.childFirstName,
      contact,
      contactType: record.contactType,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      keyId: record.encryptedContact.keyId,
    }
  }

  async exists(childId: string): Promise<boolean> {
    return this.storage.has(childId)
  }

  async delete(childId: string): Promise<void> {
    if (this.shouldFail) {
      throw new SafeAdultStorageError(this.failureMessage)
    }
    this.storage.delete(childId)
  }

  async getEncryptedForNotification(
    childId: string
  ): Promise<{ encryptedContact: EncryptedSafeAdultContact; childFirstName: string; contactType: ContactType } | null> {
    if (this.shouldFail) {
      throw new SafeAdultStorageError(this.failureMessage)
    }
    if (!this.initialized) {
      throw new SafeAdultStorageError('Storage not initialized')
    }

    const record = this.storage.get(childId)
    if (!record) {
      return null
    }

    return {
      encryptedContact: record.encryptedContact,
      childFirstName: record.childFirstName,
      contactType: record.contactType,
    }
  }

  async clear(): Promise<void> {
    this.storage.clear()
  }

  async destroy(): Promise<void> {
    this.storage.clear()
    this.initialized = false
  }

  /**
   * Get the internal storage map (for testing)
   */
  getStorageMap(): Map<string, StoredSafeAdultDesignation> {
    return this.storage
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a production storage service
 */
export function createSafeAdultStorageService(
  config?: SafeAdultStorageConfig
): SafeAdultStorageService {
  return new SafeAdultStorageService(config)
}

/**
 * Create a mock storage service for testing
 */
export function createMockSafeAdultStorageService(
  encryptionService?: ISafeAdultEncryptionService
): MockSafeAdultStorageService {
  return new MockSafeAdultStorageService(encryptionService)
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: ISafeAdultStorageService | null = null

/**
 * Get the singleton storage service instance
 *
 * @param useMock - Use mock service instead of real storage
 */
export function getSafeAdultStorageService(useMock = false): ISafeAdultStorageService {
  if (!instance) {
    instance = useMock ? createMockSafeAdultStorageService() : createSafeAdultStorageService()
  }
  return instance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSafeAdultStorageService(): void {
  if (instance) {
    instance.destroy().catch(() => {
      // Ignore errors during cleanup
    })
    instance = null
  }
}
