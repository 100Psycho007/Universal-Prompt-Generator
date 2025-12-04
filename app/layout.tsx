import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'Universal IDE Platform',
  description: 'AI-powered documentation platform with RAG chat, custom doc uploads, and PRD generation',
  keywords: ['IDE', 'documentation', 'AI', 'RAG', 'chat', 'PRD', 'product requirements'],
  authors: [{ name: 'Universal IDE Platform' }],
  openGraph: {
    title: 'Universal IDE Platform',
    description: 'AI-powered documentation platform with RAG chat, custom doc uploads, and PRD generation',
    type: 'website',
  }
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
