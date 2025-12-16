# @fledgely/shared

Shared constants, utilities, and crisis allowlist for the Fledgely platform.

## Crisis Allowlist

The crisis allowlist is a critical safety feature that protects crisis resources from any monitoring. Children must be able to access help without any trace being visible to parents.

### Quick Start

```typescript
import { isCrisisUrl, getCrisisAllowlist } from '@fledgely/shared'

// Check if a URL should be protected
if (isCrisisUrl('https://988lifeline.org')) {
  // CRITICAL: Skip ALL monitoring for this URL
  // - No screenshot capture
  // - No URL logging
  // - No activity tracking
  // - No notifications
}

// Get the full allowlist
const allowlist = getCrisisAllowlist()
console.log(`Version: ${allowlist.version}`)
console.log(`Entries: ${allowlist.entries.length}`)
```

### API Reference

#### URL Checking

```typescript
// Check if any URL is a crisis resource
isCrisisUrl(url: string): boolean

// Get the crisis resource entry for a domain
getCrisisResourceByDomain(domain: string): CrisisUrlEntry | undefined

// Extract domain from a URL
extractDomain(url: string): string
```

#### Filtering

```typescript
// Get resources by category
getCrisisResourcesByCategory(category: CrisisResourceCategory): CrisisUrlEntry[]

// Get resources by region
getCrisisResourcesByRegion(region: string): CrisisUrlEntry[]

// Search by name or description
searchCrisisResources(query: string): CrisisUrlEntry[]

// Get all categories and regions
getAllCategories(): CrisisResourceCategory[]
getAllRegions(): string[]
```

#### Version Management

```typescript
// Get current version
getAllowlistVersion(): string

// Check if local allowlist is stale
isAllowlistStale(remoteVersion: string): boolean

// Compare two versions
compareVersions(versionA: string, versionB: string): -1 | 0 | 1

// Get last updated timestamp
getLastUpdated(): Date
```

### Categories

- `suicide` - Suicide prevention resources
- `abuse` - General abuse support
- `crisis` - General crisis support
- `lgbtq` - LGBTQ+ specific resources
- `mental_health` - Mental health support
- `domestic_violence` - Domestic violence resources
- `child_abuse` - Child abuse specific resources
- `eating_disorder` - Eating disorder support
- `substance_abuse` - Substance abuse support

### Platform Integration

The allowlist is distributed to all platforms:

| Platform | Location |
|----------|----------|
| TypeScript | `@fledgely/shared/constants/crisis-urls` |
| Android | `assets/crisis-allowlist.json` |
| iOS | `Resources/crisis-allowlist.json` |

#### Exporting for Native Platforms

```bash
npm run export:allowlist
```

This creates JSON files in `dist/android/` and `dist/ios/` that can be copied to native projects.

### Version Format

Versions follow the format: `MAJOR.MINOR.PATCH-YYYY-MM-DDTHH:MM:SSZ`

Example: `1.0.0-2025-12-16T12:00:00Z`

### Testing

```bash
npm test
```

### Important Notes

1. **NEVER** capture, log, or track any visit to a crisis URL
2. **ALWAYS** check URLs before any monitoring action
3. **FAIL-SAFE**: If allowlist check fails, use cached version
4. **SYNC**: Check for updates regularly (24h TTL recommended)

## License

Private - Fledgely Inc.
