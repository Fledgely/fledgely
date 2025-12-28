import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '../contexts/AuthContext'

export const metadata: Metadata = {
  title: 'Fledgely - Family Digital Safety',
  description:
    'Build trust and safety in your family digital life. Fledgely helps parents and children create healthy digital habits together.',
  keywords: ['parental controls', 'digital safety', 'family trust', 'screen time'],
  authors: [{ name: 'Fledgely' }],
  openGraph: {
    title: 'Fledgely - Family Digital Safety',
    description: 'Build trust and safety in your family digital life.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Fledgely',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fledgely - Family Digital Safety',
    description: 'Build trust and safety in your family digital life.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4F46E5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
