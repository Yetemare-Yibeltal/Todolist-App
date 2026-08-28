import type { Metadata, Viewport } from 'next';
import { Inter, Poppins, Roboto_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import { ThemeProvider } from 'next-themes';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { AnalyticsProvider } from '@/providers/analytics-provider';
import { SocketProvider } from '@/providers/socket-provider';
import { SettingsProvider } from '@/providers/settings-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { ProgressBar } from '@/components/progress-bar';
import { Suspense } from 'react';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
  fallback: ['system-ui', 'sans-serif'],
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
  fallback: ['monospace'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'TodoList Pro - Smart Task Management',
    template: '%s | TodoList Pro',
  },
  description: 'Enterprise-grade task management platform with real-time collaboration, AI-powered suggestions, and advanced analytics for modern teams.',
  keywords: [
    'task management',
    'todo list',
    'productivity',
    'project management',
    'team collaboration',
    'real-time',
    'analytics',
    'AI',
    'smart tasks'
  ],
  authors: [
    {
      name: 'Yetemare Yibeltal',
      url: 'https://github.com/Yetemare-Yibeltal',
    },
  ],
  creator: 'Yetemare Yibeltal',
  publisher: 'TodoList Pro',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'TodoList Pro',
    title: 'TodoList Pro - Smart Task Management',
    description: 'Enterprise-grade task management platform with real-time collaboration and AI-powered features.',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TodoList Pro - Smart Task Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TodoList Pro - Smart Task Management',
    description: 'Enterprise-grade task management platform with real-time collaboration and AI-powered features.',
    images: ['/images/twitter-image.jpg'],
    creator: '@todolistpro',
    site: '@todolistpro',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || '',
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || '',
    yahoo: process.env.NEXT_PUBLIC_YAHOO_VERIFICATION || '',
    other: {
      'facebook-domain-verification': process.env.NEXT_PUBLIC_FACEBOOK_VERIFICATION || '',
    },
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    languages: {
      'en-US': '/en',
      'es-ES': '/es',
      'fr-FR': '/fr',
      'de-DE': '/de',
      'zh-CN': '/zh',
      'ja-JP': '/ja',
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TodoList Pro',
    startupImage: ['/images/startup.png'],
  },
  applicationName: 'TodoList Pro',
  category: 'Productivity',
  formatDetection: {
    telephone: true,
    date: true,
    address: true,
    email: true,
    url: true,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon-57x57.png', sizes: '57x57', type: 'image/png' },
      { url: '/apple-icon-60x60.png', sizes: '60x60', type: 'image/png' },
      { url: '/apple-icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/apple-icon-76x76.png', sizes: '76x76', type: 'image/png' },
      { url: '/apple-icon-114x114.png', sizes: '114x114', type: 'image/png' },
      { url: '/apple-icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: '/apple-icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/apple-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: [{ url: '/shortcut-icon.png' }],
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
    interactiveWidget: 'overlays-content',
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#ffffff' },
      { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
    ],
  } as Viewport,
  other: {
    'msapplication-TileColor': '#0055ff',
    'msapplication-TileImage': '/ms-icon-144x144.png',
    'msapplication-config': '/browserconfig.xml',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const locale = headersList.get('accept-language')?.split(',')[0] || 'en-US';
  
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${poppins.variable} ${robotoMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="x-ua-compatible" content="IE=edge" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="darkreader-lock" content="true" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@todolistpro" />
        <meta name="twitter:creator" content="@todolistpro" />
        <link
          rel="preload"
          href="/fonts/inter-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/poppins-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="dns-prefetch" href="//api.todolist.com" />
        <link rel="dns-prefetch" href="//ws.todolist.com" />
        <link rel="preconnect" href="https://api.todolist.com" />
        <link rel="preconnect" href="https://ws.todolist.com" />
        <link
          rel="apple-touch-startup-image"
          href="/images/startup.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/startup-1242x2208.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/startup-1536x2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)"
        />
      </head>
      <body
        className="min-h-screen bg-background antialiased overflow-x-hidden"
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="todolist-theme"
            value={{
              light: 'light',
              dark: 'dark',
              system: 'system',
            }}
          >
            <QueryProvider>
              <AuthProvider>
                <ToastProvider>
                  <SocketProvider>
                    <SettingsProvider>
                      <ProgressBar />
                      <Suspense fallback={null}>
                        <AnalyticsProvider>
                          <main className="relative flex min-h-screen flex-col">
                            {children}
                          </main>
                        </AnalyticsProvider>
                      </Suspense>
                    </SettingsProvider>
                  </SocketProvider>
                </ToastProvider>
              </AuthProvider>
            </QueryProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}