'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isCaptchaEnabled } from '@/lib/captcha'
import { LoginForm } from '@/components/auth/LoginForm'

/** Only allow relative in-app redirect targets (no open redirect). */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

export function LoginContainer() {
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const captchaEnabled = isCaptchaEnabled()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    if (captchaEnabled && !captchaToken) {
      setError('Please complete the captcha')
      return
    }

    try {
      setLoading(true)
      const { error } = await signIn(email, password, captchaToken ?? undefined)
      if (error) {
        setError(error)
        setCaptchaToken(null)
      } else {
        router.push(safeNextPath(searchParams.get('next')))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoginForm
      email={email}
      password={password}
      error={error}
      loading={loading}
      captchaEnabled={captchaEnabled}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onCaptchaToken={setCaptchaToken}
      onSubmit={handleSubmit}
    />
  )
}
