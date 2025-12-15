import { SafetyResourcesLink } from '@/components/safety'

/**
 * Settings Page
 *
 * Contains a buried "Safety Resources" link for victims needing to escape abuse.
 * Positioned in the general section, not prominently.
 */
export default function SettingsPage() {
  return (
    <div className="container max-w-2xl py-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Settings</h1>

      {/* Account Section */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Account</h2>
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Email notifications</span>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Push notifications</span>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
        </div>
      </section>

      {/* Appearance Section */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Appearance</h2>
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Theme</span>
            <span className="text-sm text-muted-foreground">System</span>
          </div>
        </div>
      </section>

      {/* General Section - Safety Resources buried here */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">General</h2>
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Language</span>
            <span className="text-sm text-muted-foreground">English</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Timezone</span>
            <span className="text-sm text-muted-foreground">Auto-detect</span>
          </div>
          <div className="border-t pt-4">
            {/*
              CRITICAL: Safety Resources link for abuse victims
              - Buried in general settings section, not prominently displayed
              - Works for both parent and child accounts
              - Uses neutral text that doesn't attract attention
              - Opens modal (not new page) to avoid URL history
            */}
            <SafetyResourcesLink source="settings" />
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section>
        <h2 className="text-lg font-medium mb-4 text-destructive">
          Danger Zone
        </h2>
        <div className="rounded-lg border border-destructive/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
        </div>
      </section>
    </div>
  )
}
