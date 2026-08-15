import type React from "react"
import type { Metadata } from "next"
import { Figtree, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { AuthProvider } from "@/lib/auth-context"
import { NotificationProvider } from "@/components/ui/notification"
import { MockMount } from "@/components/demo/mock-mount"
import { DemoBadge } from "@/components/demo/demo-badge"
import "./globals.css"

const _figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
})

const _geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Get Affiliate Core",
  description: "Get Affiliate Core",
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${_figtree.variable} ${_geistMono.variable} font-sans antialiased`}>
        <MockMount />
        <ThemeProvider defaultTheme="dark">
          <NotificationProvider>
            <AuthProvider>
              {children}
              <DemoBadge />
            </AuthProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
