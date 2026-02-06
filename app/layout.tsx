import React from "react"
import Script from "next/script"
import type { Metadata, Viewport } from "next"
import { cookies } from "next/headers"
import { Geist, Geist_Mono, Cairo, Tajawal } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider } from "@/lib/i18n/language-context"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { FloatingChatWidget } from "@/components/floating-chat-widget"
import { OfflineSyncProvider } from "@/components/offline-sync-provider"
import { FontSizeProvider } from "@/contexts/font-size-context"
import { getServerProfile } from "@/lib/auth/server-profile"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const _geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const _cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["300", "400", "500", "600", "700", "800"],
})
const _tajawal = Tajawal({
  subsets: ["arabic"],
  variable: "--font-tajawal",
  weight: ["300", "400", "500", "700", "800"],
})
const _notoArabic = {} // Placeholder for _notoArabic variable

export const metadata: Metadata = {
  title: "Siha DZ - حجز المواعيد الطبية في الجزائر | Book Medical Appointments",
  description:
    "Book medical appointments online with the best doctors in Algeria. Réservez vos rendez-vous médicaux en ligne. احجز موعدك الطبي اونلاين",
  generator: "v0.app",
  keywords: [
    "medical appointments",
    "doctors Algeria",
    "healthcare",
    "téléconsultation",
    "حجز مواعيد طبية",
    "أطباء الجزائر",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Siha DZ",
  },
  formatDetection: {
    telephone: true,
  },
  icons: {
    icon: [
      { url: "/siha-dz-logo.png", sizes: "any" },
    ],
    apple: "/siha-dz-logo.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

// Mobile-friendly viewport: allow pinch-zoom for accessibility, cover for notch/safe areas
// interactiveWidget: overlays-content = keyboard overlays content without viewport resize (reduces page shift)
export const viewport: Viewport = {
  themeColor: "#0891B2",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  minimumScale: 0.5,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
}

const VALID_LANGS = ['ar', 'fr', 'en'] as const
type Lang = (typeof VALID_LANGS)[number]

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let initialLang: Lang = 'en'
  try {
    const cookieStore = await cookies()
    const c = cookieStore.get('dzdoc-language')?.value
    if (c && VALID_LANGS.includes(c as Lang)) initialLang = c as Lang
  } catch {
    /* ignore */
  }

  const initialProfile = await getServerProfile()

  return (
    <html lang={initialLang} dir={initialLang === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body
        className={`${_geist.variable} ${_geistMono.variable} ${_cairo.variable} ${_tajawal.variable} font-sans antialiased`}
      >
        <noscript>
          <style dangerouslySetInnerHTML={{ __html: 'body{visibility:visible!important}' }} />
        </noscript>
        <Script
          id="dzdoc-lang-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('dzdoc-language');var c=document.cookie.match(/dzdoc-language=([^;]+)/);var cval=c?decodeURIComponent(c[1]):null;var lang=(s&&['ar','fr','en'].indexOf(s)>=0)?s:(cval&&['ar','fr','en'].indexOf(cval)>=0)?cval:'en';document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.documentElement.classList.add('dzdoc-lang-ready');localStorage.setItem('dzdoc-language',lang);document.cookie='dzdoc-language='+encodeURIComponent(lang)+';path=/;max-age=31536000;SameSite=Lax';var fs=localStorage.getItem('dzdoc-font-size');var r=document.documentElement;if(fs&&['1','2','3'].indexOf(fs)>=0){r.setAttribute('data-font-size',fs);r.style.fontSize=fs==='2'?'118.75%':fs==='3'?'137.5%':'100%';}})();`,
          }}
        />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem storageKey="dzdoc-theme">
          <LanguageProvider initialLanguage={initialLang}>
            <FontSizeProvider>
              <AuthProvider initialProfile={initialProfile}>
                {children}
              <FloatingChatWidget />
              <OfflineSyncProvider />
              <Toaster />
            </AuthProvider>
              </FontSizeProvider>
          </LanguageProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
