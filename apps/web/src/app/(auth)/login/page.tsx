import { SafetyResourcesLink } from '@/components/safety'

/**
 * Login Page
 *
 * Contains a subtle "Safety Resources" link in the footer
 * for victims needing to escape abuse.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to Fledgely
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to continue to your family dashboard
            </p>
          </div>

          {/* Login form placeholder - will be implemented in Epic 1 */}
          <div className="rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground text-center">
              Authentication coming in Epic 1
            </p>
          </div>
        </div>
      </main>

      {/* Footer with subtle safety link */}
      <footer className="border-t py-4">
        <div className="container flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Fledgely</span>
          <span>&middot;</span>
          <a href="/privacy" className="hover:underline">
            Privacy
          </a>
          <span>&middot;</span>
          <a href="/terms" className="hover:underline">
            Terms
          </a>
          <span>&middot;</span>
          {/*
            CRITICAL: Safety Resources link for abuse victims
            - Positioned subtly in footer alongside other links
            - Uses neutral text that doesn't attract attention
            - Opens modal (not new page) to avoid URL history
          */}
          <SafetyResourcesLink source="login-page" />
        </div>
      </footer>
    </div>
  )
}
