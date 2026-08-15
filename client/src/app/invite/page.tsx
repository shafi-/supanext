'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequiredParam, isInviteToken } from '@/hooks/useQueryParam'
import { inviteService } from '@/services/InviteService'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'

type Status = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'error'

export default function InvitePage() {
  const token = useRequiredParam('token')
  const router = useRouter()
  const { user } = useAuth()
  const [status, setStatus] = useState<Status>('loading')
  const [orgName, setOrgName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }
    if (!isInviteToken(token)) {
      setStatus('invalid')
      return
    }

    let cancelled = false
    async function validate() {
      const { data, error } = await inviteService.validateInvite(token!)
      if (cancelled) return
      if (error) {
        setStatus('error')
        setErrorMsg(error)
        return
      }
      if (!data || data.length === 0) {
        setStatus('expired')
        return
      }
      setOrgName(data[0].org_name)
      setStatus('valid')
    }
    validate()
    return () => { cancelled = true }
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setStatus('loading')
    const { error } = await inviteService.acceptInvite(token)
    if (error) {
      setStatus('error')
      setErrorMsg(error)
      return
    }
    setStatus('accepted')
    setTimeout(() => router.push('/orgs'), 2000)
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto text-center space-y-4">
        {status === 'loading' && <div className="text-gray-600">Validating invite...</div>}
        {status === 'invalid' && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-600">Invalid Invite</h1>
            <p className="text-gray-600">This invite link is invalid.</p>
            <Link href="/" className="text-blue-600 hover:underline">Go home</Link>
          </div>
        )}
        {status === 'expired' && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-orange-600">Invite Expired</h1>
            <p className="text-gray-600">This invite link has expired or was already used.</p>
            <Link href="/" className="text-blue-600 hover:underline">Go home</Link>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-600">Error</h1>
            <p className="text-gray-600">{errorMsg || 'Something went wrong.'}</p>
            <Link href="/" className="text-blue-600 hover:underline">Go home</Link>
          </div>
        )}
        {status === 'accepted' && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-green-600">Welcome!</h1>
            <p className="text-gray-600">Redirecting to your organizations...</p>
          </div>
        )}
        {status === 'valid' && !user && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">You&apos;ve been invited!</h1>
            <p className="text-gray-600">Sign in to join <strong>{orgName}</strong></p>
            <Link href="/auth/login" className="bg-blue-600 text-white px-4 py-2 rounded-md inline-block hover:bg-blue-700">Sign in</Link>
          </div>
        )}
        {status === 'valid' && user && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Join {orgName}</h1>
            <p className="text-gray-600">Click below to accept the invitation.</p>
            <button onClick={handleAccept} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Accept Invitation</button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
