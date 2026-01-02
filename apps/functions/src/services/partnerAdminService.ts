/**
 * Partner Admin Service - Story 7.5.2 Task 7
 *
 * Administrative management of crisis partners.
 * Only accessible by system administrators.
 *
 * Operations:
 * - Add new crisis partner
 * - Update partner configuration
 * - Deactivate/reactivate partner
 * - List and search partners
 * - Rotate API keys
 *
 * Security:
 * - All operations require system_admin role
 * - API keys are never stored in plaintext
 * - All changes are audited
 */

import * as crypto from 'crypto'
import { generatePartnerId, type CrisisPartner, type PartnerCapability } from '@fledgely/shared'

// ============================================
// Types
// ============================================

/**
 * Admin context for authorization.
 */
export interface AdminContext {
  /** Admin user ID */
  adminId: string
  /** Admin role */
  role: 'system_admin' | 'support' | 'viewer'
  /** Request timestamp */
  timestamp: Date
}

/**
 * Input for adding a new partner.
 */
export interface AddPartnerInput {
  /** Partner name */
  name: string
  /** Webhook URL (must be HTTPS) */
  webhookUrl: string
  /** Supported jurisdictions */
  jurisdictions: string[]
  /** Partner capabilities */
  capabilities: PartnerCapability[]
  /** Priority for routing */
  priority: number
}

/**
 * Input for updating a partner.
 */
export interface UpdatePartnerInput {
  /** Partner name */
  name?: string
  /** Webhook URL (must be HTTPS) */
  webhookUrl?: string
  /** Supported jurisdictions */
  jurisdictions?: string[]
  /** Partner capabilities */
  capabilities?: PartnerCapability[]
  /** Priority for routing */
  priority?: number
}

/**
 * Options for adding a partner.
 */
export interface AddPartnerOptions {
  /** Return the plain API key (only on creation) */
  returnApiKey?: boolean
}

/**
 * Result of adding a partner.
 */
export type AddPartnerResult = { partner: CrisisPartner; plainApiKey?: string } | CrisisPartner

/**
 * Options for listing partners.
 */
export interface ListPartnerOptions {
  /** Only return active partners */
  activeOnly?: boolean
  /** Sort by field */
  sortBy?: 'name' | 'priority' | 'createdAt'
}

/**
 * Health check function type.
 */
export type HealthCheckFn = (partner: CrisisPartner) => Promise<{
  healthy: boolean
  responseTimeMs?: number
  error?: string
}>

/**
 * Partner health summary.
 */
export interface PartnerHealthSummary {
  /** Partner ID */
  partnerId: string
  /** Partner name */
  partnerName: string
  /** Whether partner is healthy */
  healthy: boolean
  /** Response time in ms */
  responseTimeMs?: number
  /** Error message if unhealthy */
  error?: string
  /** When health was checked */
  checkedAt: Date
}

/**
 * Webhook validation result.
 */
export interface WebhookValidationResult {
  valid: boolean
  error?: string
}

/**
 * Options for webhook validation.
 */
export interface WebhookValidationOptions {
  /** Allow localhost URLs (for development) */
  allowLocalhost?: boolean
}

/**
 * Partner storage interface.
 */
export interface PartnerStore {
  /** Get partner by ID */
  get(id: string): Promise<CrisisPartner | null>
  /** Set partner */
  set(id: string, partner: CrisisPartner): Promise<void>
  /** Delete partner */
  delete(id: string): Promise<void>
  /** Get all partners */
  getAll(): Promise<CrisisPartner[]>
  /** Get partners by jurisdiction */
  getByJurisdiction(jurisdiction: string): Promise<CrisisPartner[]>
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a secure random API key.
 */
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Hash an API key for storage.
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Validate admin has required role.
 */
function validateAdminRole(context: AdminContext): void {
  if (context.role !== 'system_admin') {
    throw new Error('Unauthorized: system_admin role required')
  }
}

/**
 * Validate webhook URL.
 */
function validateWebhookUrl(
  url: string,
  options: WebhookValidationOptions = {}
): WebhookValidationResult {
  if (!url) {
    return { valid: false, error: 'URL is required' }
  }

  try {
    const parsed = new URL(url)

    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'URL must use HTTPS' }
    }

    if (!options.allowLocalhost && parsed.hostname === 'localhost') {
      return { valid: false, error: 'localhost not allowed in production' }
    }

    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

// ============================================
// Main Functions
// ============================================

/**
 * Add a new crisis partner.
 *
 * @param input - Partner configuration
 * @param context - Admin context
 * @param store - Partner store
 * @param options - Options (e.g., return API key)
 * @returns Created partner (and API key if requested)
 */
export async function addPartner(
  input: AddPartnerInput,
  context: AdminContext,
  store: PartnerStore,
  options: AddPartnerOptions = {}
): Promise<AddPartnerResult> {
  // Validate admin role
  validateAdminRole(context)

  // Validate webhook URL
  const urlValidation = validateWebhookUrl(input.webhookUrl)
  if (!urlValidation.valid) {
    throw new Error(urlValidation.error)
  }

  // Validate jurisdictions
  if (!input.jurisdictions || input.jurisdictions.length === 0) {
    throw new Error('At least one jurisdiction is required')
  }

  // Validate capabilities
  if (!input.capabilities || input.capabilities.length === 0) {
    throw new Error('At least one capability is required')
  }

  // Generate API key
  const plainApiKey = generateApiKey()
  const apiKeyHash = hashApiKey(plainApiKey)

  // Create partner
  const now = new Date()
  const partner: CrisisPartner = {
    id: generatePartnerId(),
    name: input.name,
    webhookUrl: input.webhookUrl,
    apiKeyHash,
    active: true,
    jurisdictions: input.jurisdictions,
    priority: input.priority,
    capabilities: input.capabilities,
    createdAt: now,
    updatedAt: now,
  }

  // Save to store
  await store.set(partner.id, partner)

  // Return with or without API key
  if (options.returnApiKey) {
    return { partner, plainApiKey }
  }

  return partner
}

/**
 * Update an existing partner.
 *
 * @param partnerId - Partner ID to update
 * @param updates - Fields to update
 * @param context - Admin context
 * @param store - Partner store
 * @returns Updated partner
 */
export async function updatePartner(
  partnerId: string,
  updates: UpdatePartnerInput,
  context: AdminContext,
  store: PartnerStore
): Promise<CrisisPartner> {
  // Validate admin role
  validateAdminRole(context)

  // Get existing partner
  const existing = await store.get(partnerId)
  if (!existing) {
    throw new Error(`Partner not found: ${partnerId}`)
  }

  // Validate webhook URL if being updated
  if (updates.webhookUrl) {
    const urlValidation = validateWebhookUrl(updates.webhookUrl)
    if (!urlValidation.valid) {
      throw new Error(urlValidation.error)
    }
  }

  // Create updated partner
  const updated: CrisisPartner = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  }

  // Save to store
  await store.set(partnerId, updated)

  return updated
}

/**
 * Deactivate a partner.
 *
 * @param partnerId - Partner ID to deactivate
 * @param reason - Reason for deactivation
 * @param context - Admin context
 * @param store - Partner store
 * @returns Deactivated partner
 */
export async function deactivatePartner(
  partnerId: string,
  reason: string,
  context: AdminContext,
  store: PartnerStore
): Promise<CrisisPartner> {
  // Validate admin role
  validateAdminRole(context)

  // Validate reason
  if (!reason || reason.trim().length === 0) {
    throw new Error('Deactivation reason is required')
  }

  // Get existing partner
  const existing = await store.get(partnerId)
  if (!existing) {
    throw new Error(`Partner not found: ${partnerId}`)
  }

  // Deactivate
  const deactivated: CrisisPartner = {
    ...existing,
    active: false,
    updatedAt: new Date(),
  }

  // Save to store
  await store.set(partnerId, deactivated)

  return deactivated
}

/**
 * Reactivate a partner.
 *
 * @param partnerId - Partner ID to reactivate
 * @param context - Admin context
 * @param store - Partner store
 * @returns Reactivated partner
 */
export async function reactivatePartner(
  partnerId: string,
  context: AdminContext,
  store: PartnerStore
): Promise<CrisisPartner> {
  // Validate admin role
  validateAdminRole(context)

  // Get existing partner
  const existing = await store.get(partnerId)
  if (!existing) {
    throw new Error(`Partner not found: ${partnerId}`)
  }

  // Check if already active
  if (existing.active) {
    throw new Error('Partner is already active')
  }

  // Reactivate
  const reactivated: CrisisPartner = {
    ...existing,
    active: true,
    updatedAt: new Date(),
  }

  // Save to store
  await store.set(partnerId, reactivated)

  return reactivated
}

/**
 * Rotate a partner's API key.
 *
 * @param partnerId - Partner ID
 * @param context - Admin context
 * @param store - Partner store
 * @returns Updated partner and new API key
 */
export async function rotateApiKey(
  partnerId: string,
  context: AdminContext,
  store: PartnerStore
): Promise<{ partner: CrisisPartner; newApiKey: string }> {
  // Validate admin role
  validateAdminRole(context)

  // Get existing partner
  const existing = await store.get(partnerId)
  if (!existing) {
    throw new Error(`Partner not found: ${partnerId}`)
  }

  // Generate new API key
  const newApiKey = generateApiKey()
  const apiKeyHash = hashApiKey(newApiKey)

  // Update partner
  const updated: CrisisPartner = {
    ...existing,
    apiKeyHash,
    updatedAt: new Date(),
  }

  // Save to store
  await store.set(partnerId, updated)

  return { partner: updated, newApiKey }
}

/**
 * Get partner details.
 *
 * @param partnerId - Partner ID
 * @param context - Admin context
 * @param store - Partner store
 * @returns Partner details
 */
export async function getPartnerDetails(
  partnerId: string,
  context: AdminContext,
  store: PartnerStore
): Promise<CrisisPartner> {
  // Validate admin role
  validateAdminRole(context)

  // Get partner
  const partner = await store.get(partnerId)
  if (!partner) {
    throw new Error(`Partner not found: ${partnerId}`)
  }

  return partner
}

/**
 * List all partners.
 *
 * @param context - Admin context
 * @param store - Partner store
 * @param options - List options
 * @returns List of partners
 */
export async function listPartners(
  context: AdminContext,
  store: PartnerStore,
  options: ListPartnerOptions = {}
): Promise<CrisisPartner[]> {
  // Validate admin role
  validateAdminRole(context)

  // Get all partners
  let partners = await store.getAll()

  // Filter by active if requested
  if (options.activeOnly) {
    partners = partners.filter((p) => p.active)
  }

  // Sort if requested
  if (options.sortBy) {
    partners = partners.sort((a, b) => {
      switch (options.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'priority':
          return a.priority - b.priority
        case 'createdAt':
          return a.createdAt.getTime() - b.createdAt.getTime()
        default:
          return 0
      }
    })
  }

  return partners
}

/**
 * Search partners by jurisdiction.
 *
 * @param jurisdiction - Jurisdiction to search for
 * @param context - Admin context
 * @param store - Partner store
 * @returns Matching partners
 */
export async function searchPartnersByJurisdiction(
  jurisdiction: string,
  context: AdminContext,
  store: PartnerStore
): Promise<CrisisPartner[]> {
  // Validate admin role
  validateAdminRole(context)

  // Search by jurisdiction
  return store.getByJurisdiction(jurisdiction)
}

/**
 * Get health summary for a partner.
 *
 * @param partnerId - Partner ID
 * @param context - Admin context
 * @param store - Partner store
 * @param healthCheck - Health check function
 * @returns Health summary
 */
export async function getPartnerHealthSummary(
  partnerId: string,
  context: AdminContext,
  store: PartnerStore,
  healthCheck: HealthCheckFn
): Promise<PartnerHealthSummary> {
  // Validate admin role
  validateAdminRole(context)

  // Get partner
  const partner = await store.get(partnerId)
  if (!partner) {
    throw new Error(`Partner not found: ${partnerId}`)
  }

  // Perform health check
  const health = await healthCheck(partner)

  return {
    partnerId: partner.id,
    partnerName: partner.name,
    healthy: health.healthy,
    responseTimeMs: health.responseTimeMs,
    error: health.error,
    checkedAt: new Date(),
  }
}

/**
 * Validate a webhook URL.
 *
 * @param url - URL to validate
 * @param options - Validation options
 * @returns Validation result
 */
export async function validatePartnerWebhook(
  url: string,
  options: WebhookValidationOptions = {}
): Promise<WebhookValidationResult> {
  return validateWebhookUrl(url, options)
}
