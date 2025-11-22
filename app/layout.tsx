import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Universal IDE Database - Prompt Generator',
  description: 'Generate customized prompts for 20+ IDEs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}