'use client'

import { useState } from 'react'
import { inviteService, type InvitationPayload } from '@/services/InviteService'
import { OrgInvites } from '@/components/org/OrgInvites'

interface InvitesTabContainerProps {
  orgId: string
}

export function InvitesTabContainer({ orgId }: InvitesTabContainerProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [lastInvite, setLastInvite] = useState<(InvitationPayload & { email: string }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = email.trim()
    if (!val) return
    setSending(true)
    setError(null)
    const { data, error: err } = await inviteService.inviteMember(val, role, orgId)
    setSending(false)
    if (err || !data) {
      setError(err ?? 'Failed to create invitation')
      return
    }
    setLastInvite({ ...data, email: val })
    setEmail('')
  }

  return (
    <OrgInvites
      email={email}
      role={role}
      lastInvite={lastInvite}
      error={error}
      sending={sending}
      onChangeEmail={setEmail}
      onChangeRole={setRole}
      onInvite={handleInvite}
    />
  )
}
