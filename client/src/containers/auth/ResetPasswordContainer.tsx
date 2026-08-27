'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isCaptchaEnabled } from '@/lib/captcha'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export function ResetPasswordContainer() {
  const { user, loading, resetPassword, updatePassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const captchaEnabled = isCaptchaEnabled()

  useEffect(() => {
    // Clean up the recovery token from the URL once consumed.
    if (window.location.hash || window.location.search.includes('code=')) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const hasSession = !loading && !!user

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (captchaEnabled && !captchaToken) {
      setError('Please complete the captcha')
      return
    }

    setSubmitting(true)
    const { error } = await resetPassword(email, captchaToken ?? undefined)
    setSubmitting(false)
    if (error) {
      setError(error)
      setCaptchaToken(null)
    } else {
      setSent(true)
    }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    const { error } = await updatePassword(password)
    setSubmitting(false)
    if (error) setError(error)
    else setSuccess(true)
  }

  return (
    <ResetPasswordForm
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      sent={sent}
      success={success}
      hasSession={hasSession}
      error={error}
      submitting={submitting}
      captchaEnabled={captchaEnabled}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onCaptchaToken={setCaptchaToken}
      onRequestReset={handleRequestReset}
      onSetPassword={handleSetPassword}
    />
  )
}
