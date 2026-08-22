'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Captcha } from '@/components/auth/Captcha'
import { isCaptchaEnabled } from '@/lib/captcha'

/**
 * Password reset page with two modes:
 * - No session: request a reset email.
 * - Session present (user followed the recovery link): set a new password.
 */
export default function ResetPasswordPage() {
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

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-gray-600">We sent a password reset link to {email}</p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">
          Back to login
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-green-600">Password updated</h1>
        <p className="text-gray-600">Your password has been changed successfully.</p>
        <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-md inline-block hover:bg-blue-700">
          Go to dashboard
        </Link>
      </div>
    )
  }

  if (!loading && user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="text-gray-600">Choose a new password for your account.</p>
        <form onSubmit={handleSetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reset Password</h1>
      <form onSubmit={handleRequestReset} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            required
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {captchaEnabled && <Captcha onToken={setCaptchaToken} />}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Send reset link'}
        </button>
      </form>
    </div>
  )
}
