/**
 * Security utilities for the web application.
 *
 * This module contains functions for validating and sanitizing user input
 * to prevent common security vulnerabilities.
 */

/**
 * Validate redirect URL to prevent open redirect attacks.
 *
 * Only allows relative paths that start with '/'.
 * Rejects absolute URLs, protocol-relative URLs, and paths with special characters.
 *
 * @param redirect - The redirect URL to validate (typically from query params)
 * @param defaultPath - Fallback path if validation fails (defaults to '/dashboard')
 * @returns A safe redirect path or the default path if invalid
 *
 * @example
 * ```typescript
 * getSafeRedirectUrl('/dashboard')              // => '/dashboard'
 * getSafeRedirectUrl('/settings/profile')       // => '/settings/profile'
 * getSafeRedirectUrl('//evil.com')              // => '/dashboard'
 * getSafeRedirectUrl('javascript:alert(1)')     // => '/dashboard'
 * getSafeRedirectUrl('https://evil.com')        // => '/dashboard'
 * getSafeRedirectUrl('/redirect%2F%2Fevil')     // => '/dashboard' (encoded chars)
 * getSafeRedirectUrl(null)                      // => '/dashboard'
 * getSafeRedirectUrl(null, '/home')             // => '/home' (custom default)
 * ```
 *
 * Security validations:
 * - Must start with single slash (not //, not protocol:)
 * - Rejects URLs with protocol schemes (javascript:, data:, http:, https:)
 * - Rejects URLs with encoded characters (potential bypass vectors)
 * - Whitelist regex pattern for allowed characters
 */
export function getSafeRedirectUrl(
  redirect: string | null,
  defaultPath: string = '/dashboard'
): string {
  if (!redirect) return defaultPath

  // Must start with single slash (not //, not protocol:)
  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return defaultPath
  }

  // Reject any URLs with protocol schemes (e.g., javascript:, data:, http:)
  if (redirect.includes(':')) {
    return defaultPath
  }

  // Reject URLs with encoded characters that could bypass validation
  if (redirect.includes('%')) {
    return defaultPath
  }

  // Only allow alphanumeric, slashes, hyphens, underscores, and query strings
  const safePathPattern = /^\/[a-zA-Z0-9/_-]*(\?[a-zA-Z0-9=&_-]*)?$/
  if (!safePathPattern.test(redirect)) {
    return defaultPath
  }

  return redirect
}
