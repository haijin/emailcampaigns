import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'TES Email Campaigns',
  description: 'Email campaign management for TES Active Agents',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex h-screen overflow-hidden bg-slate-50 antialiased">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  )
}
