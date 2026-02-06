import React from "react"
import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Cairo, Tajawal } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LanguageProvider } from '@/lib/i18n/language-context'
import { AuthProvider } from '@/components/auth-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { FloatingChatWidget } from '@/components/floating-chat-widget'
import { OfflineSyncProvider } from '@/components/offline-sync-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"], variable: '--font-geist' });
const _geistMono = Geist_Mono({ subsets: ["latin"], variable: '--font-geist-mono' });
const _cairo = Cairo({ 
  subsets: ["arabic", "latin"], 
  variable: '--font-cairo',
  weight: ['300', '400', '500', '600', '700', '800']
});
const _tajawal = Tajawal({ 
  subsets: ["arabic"], 
  variable: '--font-tajawal',
  weight: ['300', '400', '500', '700', '800']
});
const _notoArabic = {}; // Placeholder for _notoArabic variable

export const metadata: Metadata = {
  title: 'DZDoc - حجز المواعيد الطبية في الجزائر | Book Medical Appointments',
  description: 'Book medical appointments online with the best doctors in Algeria. Réservez vos rendez-vous médicaux en ligne. احجز موعدك الطبي اونلاين',
  generator: 'v0.app',
  keywords: ['medical appointments', 'doctors Algeria', 'healthcare', 'téléconsultation', 'حجز مواعيد طبية', 'أطباء الجزائر'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DZDoc',
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#0891B2',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 0.75,
  minimumScale: 0.5,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${_geist.variable} ${_geistMono.variable} ${_cairo.variable} ${_tajawal.variable} font-sans antialiased`}>
        <Script
          id="rtl-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=localStorage.getItem('dzdoc-language');var d=l==='ar'?'rtl':'ltr';var lang=l&&['ar','fr','en'].includes(l)?l:'ar';document.documentElement.dir=d;document.documentElement.lang=lang;})();`,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          storageKey="dzdoc-theme"
        >
          <LanguageProvider>
            <AuthProvider>
              {children}
              <FloatingChatWidget />
              <OfflineSyncProvider />
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
