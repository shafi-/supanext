import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { OrganizationProvider } from '@/hooks/useOrganization'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SupaNext - NextJS + Supabase Starter',
  description: 'A production-ready NextJS + Supabase starter template with function-first database architecture',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <OrganizationProvider>
            {children}
          </OrganizationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}