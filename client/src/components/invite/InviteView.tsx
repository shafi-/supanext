export type InviteStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'error'

interface InviteViewProps {
  token: string | null
  status: InviteStatus
  inviterName: string
  errorMsg: string
  isLoggedIn: boolean
  onAccept: () => void
}

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function InviteView({
  token,
  status,
  inviterName,
  errorMsg,
  isLoggedIn,
  onAccept,
}: InviteViewProps) {
  return (
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
          <p className="text-gray-600">Redirecting to your dashboard...</p>
        </div>
      )}
      {status === 'valid' && !isLoggedIn && (
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">You&apos;ve been invited!</h1>
          <p className="text-gray-600">
            {inviterName ? <>{inviterName} invited you to join</> : <>You&apos;ve been invited to join</>} the platform.
          </p>
          <Link
            href={`/auth/login?next=${encodeURIComponent(`/invite?token=${token}`)}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md inline-block hover:bg-blue-700"
          >
            Sign in
          </Link>
          <p className="text-sm text-gray-500">
            New here?{' '}
            <Link
              href={`/auth/register?next=${encodeURIComponent(`/invite?token=${token}`)}`}
              className="text-blue-600 hover:underline"
            >
              Create an account with this email
            </Link>
          </p>
        </div>
      )}
      {status === 'valid' && isLoggedIn && (
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Join the Platform</h1>
          <p className="text-gray-600">Click below to accept the invitation.</p>
          <Button onClick={onAccept} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Accept Invitation
          </Button>
        </div>
      )}
    </div>
  )
}
