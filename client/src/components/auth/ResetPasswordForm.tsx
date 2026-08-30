'use client'

import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { Captcha } from '@/components/auth/Captcha'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ResetPasswordFormProps {
  email: string
  password: string
  confirmPassword: string
  sent: boolean
  success: boolean
  hasSession: boolean
  error: string
  submitting: boolean
  captchaEnabled: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onCaptchaToken: (token: string | null) => void
  onRequestReset: (e: React.FormEvent) => void
  onSetPassword: (e: React.FormEvent) => void
}

export function ResetPasswordForm({
  email,
  password,
  confirmPassword,
  sent,
  success,
  hasSession,
  error,
  submitting,
  captchaEnabled,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onCaptchaToken,
  onRequestReset,
  onSetPassword,
}: ResetPasswordFormProps) {
  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-gray-600">
          We sent a password reset link to {email}
        </p>
        <Link href={ROUTES.login} className="text-blue-600 hover:underline">
          Back to login
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold text-green-600">Password updated</h1>
        <p className="text-gray-600">
          Your password has been changed successfully.
        </p>
        <Link
          href={ROUTES.appDashboard}
          className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Go to dashboard
        </Link>
      </div>
    )
  }

  if (hasSession) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="text-gray-600">Choose a new password for your account.</p>
        <form onSubmit={onSetPassword} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="new-password"
            >
              New password
            </label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={e => onPasswordChange(e.target.value)}
              minLength={6}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="confirm-new-password"
            >
              Confirm new password
            </label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={e => onConfirmPasswordChange(e.target.value)}
              minLength={6}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reset Password</h1>
      <form onSubmit={onRequestReset} className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium text-gray-700"
            htmlFor="reset-email"
          >
            Email
          </label>
          <Input
            id="reset-email"
            type="email"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {captchaEnabled && <Captcha onToken={onCaptchaToken} />}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
    </div>
  )
}
