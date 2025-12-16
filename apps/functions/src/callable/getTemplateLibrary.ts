import { onCall, HttpsError } from 'firebase-functions/v2/https'
import {
  searchTemplatesInputSchema,
  getAllTemplates,
  getTemplatesByAgeGroup,
  filterTemplatesByConcern,
  searchTemplates,
  findTemplates,
  type AgeGroup,
  type TemplateConcern,
  type AgreementTemplate,
} from '@fledgely/contracts'

/**
 * Callable Cloud Function: getTemplateLibrary
 *
 * Story 4.1: Template Library Structure - Task 3
 *
 * Returns the bundled agreement template library with optional filtering.
 * Templates are bundled in code (not Firestore) for performance per S3.
 *
 * AC #1: Templates organized by age groups (5-7, 8-10, 11-13, 14-16)
 * AC #4: Parent can search/filter templates by specific concerns
 * AC #6: Templates load within 1 second (bundled data, no DB query)
 *
 * Features:
 * - Returns all templates by default
 * - Filter by age group
 * - Filter by concerns (gaming, social_media, homework, screen_time, safety)
 * - Search by template name/description
 * - Combined filtering supported
 *
 * Performance:
 * - No database queries (templates bundled in code)
 * - Response should be < 100ms typically
 * - Cache headers set for 1 hour TTL
 *
 * Security:
 * - App Check enforced
 * - No authentication required (public template library)
 */
export const getTemplateLibrary = onCall(
  {
    enforceAppCheck: true,
    // No CORS restrictions for public data
    cors: true,
  },
  async (request) => {
    const startTime = Date.now()

    try {
      // Handle no input case - return all templates
      if (!request.data || Object.keys(request.data).length === 0) {
        const templates = getAllTemplates()
        return buildResponse(templates, startTime)
      }

      // Validate input if provided
      const parseResult = searchTemplatesInputSchema.partial().safeParse(request.data)
      if (!parseResult.success) {
        throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
      }

      const input = parseResult.data

      // Use findTemplates for combined filtering
      const templates = findTemplates({
        ageGroup: input.ageGroup as AgeGroup | undefined,
        concerns: input.concerns as TemplateConcern[] | undefined,
        query: input.query,
      })

      return buildResponse(templates, startTime)
    } catch (error) {
      // Re-throw HttpsError as-is
      if (error instanceof HttpsError) {
        throw error
      }

      // Log unexpected errors
      console.error('getTemplateLibrary error:', error)
      throw new HttpsError('internal', 'Failed to fetch templates')
    }
  }
)

/**
 * Callable Cloud Function: getTemplatesByAgeGroupFn
 *
 * Story 4.1: Template Library Structure - Task 3
 *
 * Returns templates for a specific age group.
 * Optimized endpoint for when only age group filtering is needed.
 */
export const getTemplatesByAgeGroupFn = onCall(
  {
    enforceAppCheck: true,
    cors: true,
  },
  async (request) => {
    const startTime = Date.now()

    // Validate age group input
    if (!request.data?.ageGroup) {
      throw new HttpsError('invalid-argument', 'Age group is required')
    }

    const validAgeGroups: AgeGroup[] = ['5-7', '8-10', '11-13', '14-16']
    const ageGroup = request.data.ageGroup as AgeGroup

    if (!validAgeGroups.includes(ageGroup)) {
      throw new HttpsError('invalid-argument', 'Invalid age group')
    }

    try {
      const templates = getTemplatesByAgeGroup(ageGroup)
      return buildResponse(templates, startTime, { ageGroup })
    } catch (error) {
      console.error('getTemplatesByAgeGroupFn error:', error)
      throw new HttpsError('internal', 'Failed to fetch templates')
    }
  }
)

/**
 * Callable Cloud Function: searchTemplatesFn
 *
 * Story 4.1: Template Library Structure - Task 3
 *
 * Searches templates by name/description with optional concern filtering.
 */
export const searchTemplatesFn = onCall(
  {
    enforceAppCheck: true,
    cors: true,
  },
  async (request) => {
    const startTime = Date.now()

    // Validate input
    const parseResult = searchTemplatesInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid search input', parseResult.error.flatten())
    }

    const { query, ageGroup, concerns } = parseResult.data

    try {
      // Start with all templates or filtered by age group
      let templates = ageGroup ? getTemplatesByAgeGroup(ageGroup) : getAllTemplates()

      // Filter by concerns if provided
      if (concerns && concerns.length > 0) {
        templates = filterTemplatesByConcern(concerns, templates)
      }

      // Search by query
      templates = searchTemplates(query, templates)

      return buildResponse(templates, startTime, { query, ageGroup, concerns })
    } catch (error) {
      console.error('searchTemplatesFn error:', error)
      throw new HttpsError('internal', 'Failed to search templates')
    }
  }
)

/**
 * Build a consistent response object with metadata
 */
function buildResponse(
  templates: AgreementTemplate[],
  startTime: number,
  filters?: {
    ageGroup?: AgeGroup
    concerns?: TemplateConcern[]
    query?: string
  }
) {
  const processingTimeMs = Date.now() - startTime

  return {
    templates,
    totalCount: getAllTemplates().length,
    filteredCount: templates.length,
    processingTimeMs,
    filters: filters || {},
    // Cache hint for clients (1 hour)
    cacheMaxAgeSeconds: 3600,
  }
}
