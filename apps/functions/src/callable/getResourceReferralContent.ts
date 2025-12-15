import { onCall } from 'firebase-functions/v2/https'
import { getActiveResources, EscapeResource, ResourceType } from '../utils/resourceService'

/**
 * Resource content formatted for display
 */
interface FormattedResource {
  name: string
  type: ResourceType
  value: string
  description: string
}

interface ResourcesByCategory {
  hotlines: FormattedResource[]
  textSupport: FormattedResource[]
  websites: FormattedResource[]
  legalAid: FormattedResource[]
}

/**
 * Callable Cloud Function: getResourceReferralContent
 *
 * Returns domestic abuse resources formatted for inline display.
 * This function is intentionally PUBLIC (no auth required) to allow
 * resources to be displayed to anyone who needs them.
 *
 * CRITICAL: This function does NOT log who accesses it.
 * We do NOT want to track who is seeking abuse resources.
 */
export const getResourceReferralContent = onCall(
  {
    // No enforceAppCheck - we want this to be as accessible as possible
  },
  async () => {
    // Fetch active resources
    const resources = await getActiveResources()

    // Format and categorize resources
    const formatted = formatResources(resources)

    return {
      success: true,
      resources: formatted,
      disclaimer: 'If you or someone you know is in immediate danger, call 911.',
      supportMessage: 'You are not alone. Help is available 24/7.',
    }
  }
)

/**
 * Format and categorize resources for display
 */
function formatResources(resources: EscapeResource[]): ResourcesByCategory {
  const result: ResourcesByCategory = {
    hotlines: [],
    textSupport: [],
    websites: [],
    legalAid: [],
  }

  for (const resource of resources) {
    const formatted: FormattedResource = {
      name: resource.name,
      type: resource.type,
      value: resource.value,
      description: resource.description,
    }

    switch (resource.type) {
      case 'hotline':
        result.hotlines.push(formatted)
        break
      case 'text-line':
        result.textSupport.push(formatted)
        break
      case 'website':
      case 'guide':
        result.websites.push(formatted)
        break
      case 'legal-aid':
        result.legalAid.push(formatted)
        break
    }
  }

  return result
}
