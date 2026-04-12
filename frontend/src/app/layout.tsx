import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/AppShell'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'AI Campaigns',
  description: 'AI-powered email campaign management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex h-screen overflow-hidden bg-slate-50 antialiased">
        <AppShell>{children}</AppShell>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  )
}
