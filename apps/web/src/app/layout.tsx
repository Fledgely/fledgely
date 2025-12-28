import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '../contexts/AuthContext'
import { FamilyProvider } from '../contexts/FamilyContext'

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

const skipLinkStyles = {
  position: 'absolute' as const,
  left: '-9999px',
  top: '0',
  zIndex: 9999,
  padding: '8px 16px',
  backgroundColor: '#4F46E5',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 500,
  textDecoration: 'none',
  borderRadius: '0 0 4px 0',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>
          {`
            /* Skip to content link - visible on focus */
            .skip-link:focus {
              left: 0 !important;
              outline: 2px solid #ffffff;
              outline-offset: 2px;
            }

            /* Reduced motion preference support */
            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
              }
            }
          `}
        </style>
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <a href="#main-content" className="skip-link" style={skipLinkStyles}>
          Skip to main content
        </a>
        <AuthProvider>
          <FamilyProvider>{children}</FamilyProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
