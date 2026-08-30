'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { isCaptchaEnabled } from '@/lib/captcha'
import { DEFAULT_POST_LOGIN } from '@/lib/routes'
import { RegisterForm } from '@/components/auth/RegisterForm'

/** Only allow relative in-app redirect targets (no open redirect). */
function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//'))
    return DEFAULT_POST_LOGIN
  return raw
}

export function RegisterContainer() {
  const { signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const captchaEnabled = isCaptchaEnabled()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all required fields')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (captchaEnabled && !captchaToken) {
      setError('Please complete the captcha')
      return
    }

    try {
      setLoading(true)
      const { error } = await signUp(
        email,
        password,
        fullName || undefined,
        captchaToken ?? undefined
      )
      if (error) {
        setError(error)
        setCaptchaToken(null)
      } else {
        router.push(safeNextPath(searchParams.get('next')))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <RegisterForm
      fullName={fullName}
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      error={error}
      loading={loading}
      captchaEnabled={captchaEnabled}
      onFullNameChange={setFullName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onCaptchaToken={setCaptchaToken}
      onSubmit={handleSubmit}
    />
  )
}
