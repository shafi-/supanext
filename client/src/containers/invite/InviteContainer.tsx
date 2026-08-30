'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequiredParam, isInviteToken } from '@/hooks/useQueryParam'
import { inviteService } from '@/services/InviteService'
import { useAuth } from '@/hooks/useAuth'
import { ROUTES } from '@/lib/routes'
import { InviteView, type InviteStatus } from '@/components/invite/InviteView'

export function InviteContainer() {
  const token = useRequiredParam('token')
  const router = useRouter()
  const { user } = useAuth()
  const [status, setStatus] = useState<InviteStatus>('loading')
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
      const { data, error } = await inviteService.getInvitationPreview(token!)
      if (cancelled) return
      if (error) {
        if (error.startsWith('INV01') || error.startsWith('INV02')) {
          setStatus('expired')
        } else {
          setStatus('error')
          setErrorMsg(error)
        }
        return
      }
      if (!data) {
        setStatus('expired')
        return
      }
      setOrgName(data.org_name)
      setStatus('valid')
    }
    validate()
    return () => {
      cancelled = true
    }
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setStatus('loading')
    const { error } = await inviteService.acceptInvitation(token)
    if (error) {
      setStatus('error')
      setErrorMsg(error)
      return
    }
    setStatus('accepted')
    setTimeout(() => router.push(ROUTES.appOrgs), 2000)
  }

  return (
    <InviteView
      token={token}
      status={status}
      orgName={orgName}
      errorMsg={errorMsg}
      isLoggedIn={!!user}
      onAccept={handleAccept}
    />
  )
}
