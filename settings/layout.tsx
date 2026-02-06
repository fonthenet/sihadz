import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Cairo, Tajawal } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LanguageProvider } from '@/lib/i18n/language-context'
import { AuthProvider } from '@/components/auth-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
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
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <LanguageProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
