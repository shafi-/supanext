'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { inviteService } from '@/services/InviteService'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'

export default function InvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'accepted'>('loading')
  const [inviteInfo, setInviteInfo] = useState<{ org_name: string; invite_email: string } | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    async function validate() {
      const { data, error } = await inviteService.validateInvite(token!)
      if (error || !data || data.length === 0) {
        setStatus('invalid')
      } else {
        setInviteInfo({ org_name: data[0].org_name, invite_email: data[0].invite_email })
        setStatus('valid')
      }
    }
    validate()
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    const { error } = await inviteService.acceptInvite(token)
    if (!error) {
      setStatus('accepted')
      setTimeout(() => router.push('/orgs'), 2000)
    }
  }

  return (
    <AppLayout>
      <div className="text-center space-y-4">
        {status === 'loading' && <div>Validating invite...</div>}
        {status === 'invalid' && <div>Invalid or expired invite</div>}
        {status === 'accepted' && <div>Invite accepted! Redirecting...</div>}
        {status === 'valid' && !user && (
          <>
            <h1 className="text-2xl font-bold">You&apos;ve been invited!</h1>
            <p>Sign in to join <strong>{inviteInfo?.org_name}</strong></p>
            <Link href="/auth/login" className="bg-blue-600 text-white px-4 py-2 rounded-md inline-block">Sign in</Link>
          </>
        )}
        {status === 'valid' && user && (
          <>
            <h1 className="text-2xl font-bold">Join {inviteInfo?.org_name}</h1>
            <button onClick={handleAccept} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Accept Invitation</button>
          </>
        )}
      </div>
    </AppLayout>
  )
}
