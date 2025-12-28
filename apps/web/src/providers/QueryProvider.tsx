'use client'

/**
 * TanStack Query Provider.
 *
 * Story 4.1: Template Library Structure - AC4, AC6
 *
 * Provides React Query client for data fetching and caching.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create QueryClient once per component lifecycle
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic background refetching in development
            refetchOnWindowFocus: process.env.NODE_ENV === 'production',
            // Keep data fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export default QueryProvider
