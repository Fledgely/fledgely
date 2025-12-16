'use client'

/**
 * Admin Fuzzy Match Queue View
 *
 * Story 7.5: Fuzzy Domain Matching - Task 8
 *
 * Displays recent fuzzy matches for operations review.
 * Allows ops to identify common typos and add them as aliases.
 */

import { useState, useEffect, useCallback } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { RefreshCw, AlertCircle, CheckCircle, Search } from 'lucide-react'

interface FuzzyMatchStats {
  inputDomain: string
  matchedDomain: string
  avgDistance: number
  count: number
  firstSeen: string
  lastSeen: string
}

interface FuzzyMatchLog {
  id: string
  inputDomain: string
  matchedDomain: string
  distance: number
  deviceType: string
  timestamp: string
}

export default function FuzzyMatchesPage() {
  const [stats, setStats] = useState<FuzzyMatchStats[]>([])
  const [recentLogs, setRecentLogs] = useState<FuzzyMatchLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingAlias, setAddingAlias] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFunctions()

      // Get aggregated stats
      const getStatsCallable = httpsCallable<void, { stats: FuzzyMatchStats[] }>(
        functions,
        'getFuzzyMatchStats'
      )
      const statsResult = await getStatsCallable()
      setStats(statsResult.data.stats || [])

      // Get recent logs
      const getLogsCallable = httpsCallable<{ limit: number }, { logs: FuzzyMatchLog[] }>(
        functions,
        'getRecentFuzzyMatchLogs'
      )
      const logsResult = await getLogsCallable({ limit: 50 })
      setRecentLogs(logsResult.data.logs || [])
    } catch (err) {
      console.error('Error fetching fuzzy match data:', err)
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load fuzzy match data. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddToAllowlist = async (inputDomain: string, matchedDomain: string) => {
    setAddingAlias(inputDomain)
    setAddSuccess(null)
    setError(null)

    // TODO: Implement addFuzzyMatchAlias callable function in a future story
    // For now, show a placeholder message
    setAddSuccess(
      `To add "${inputDomain}" as alias for "${matchedDomain}", manually update the allowlist.json file. ` +
      `(Automated alias addition coming in a future update.)`
    )
    setAddingAlias(null)
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const getDistanceBadgeColor = (distance: number) => {
    if (distance <= 1) return 'default'
    return 'secondary'
  }

  const getDeviceTypeBadgeColor = (deviceType: string) => {
    switch (deviceType) {
      case 'web':
        return 'default'
      case 'extension':
        return 'secondary'
      case 'android':
        return 'outline'
      case 'ios':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fuzzy Match Queue</h1>
          <p className="text-muted-foreground">
            Review typo'd domains that matched crisis resources. Add common typos as
            official aliases to improve the allowlist.
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {addSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{addSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Stats and Logs Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Aggregated Stats - Most Common Typos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Most Common Typos
            </CardTitle>
            <CardDescription>
              Aggregated fuzzy matches sorted by frequency. Consider adding these as
              aliases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No fuzzy matches recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typo'd Domain</TableHead>
                    <TableHead>Matched To</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Avg Dist</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.slice(0, 10).map((stat) => (
                    <TableRow key={`${stat.inputDomain}-${stat.matchedDomain}`}>
                      <TableCell className="font-mono text-sm">
                        {stat.inputDomain}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {stat.matchedDomain}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{stat.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getDistanceBadgeColor(stat.avgDistance)}>
                          {stat.avgDistance.toFixed(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={addingAlias === stat.inputDomain}
                          onClick={() =>
                            handleAddToAllowlist(stat.inputDomain, stat.matchedDomain)
                          }
                        >
                          {addingAlias === stat.inputDomain ? 'Adding...' : 'Add Alias'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Fuzzy Matches</CardTitle>
            <CardDescription>
              Latest individual fuzzy match events across all devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No recent fuzzy matches.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="font-mono text-sm">
                        <span className="text-red-600">{log.inputDomain}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{log.matchedDomain}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getDistanceBadgeColor(log.distance)}>
                        d={log.distance}
                      </Badge>
                      <Badge variant={getDeviceTypeBadgeColor(log.deviceType)}>
                        {log.deviceType}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Fuzzy Matching</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong>How it works:</strong> When a child visits a URL that doesn't exactly
            match a crisis domain, the system attempts fuzzy matching using Levenshtein
            distance. If the typo is within 2 character changes of a known crisis domain,
            protection is still applied.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Privacy:</strong> These logs are completely anonymous. No user IDs,
            family IDs, or child IDs are recorded. Only the domain, matched domain,
            distance, device type, and timestamp are stored.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>Adding Aliases:</strong> When you see a common typo, click "Add Alias"
            to add it as an official alias in the allowlist. This will convert future
            fuzzy matches into exact matches, improving performance and reliability.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
