'use client'

import Link from 'next/link'
import { Captcha } from '@/components/auth/Captcha'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface RegisterFormProps {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  error: string
  loading: boolean
  captchaEnabled: boolean
  onFullNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onCaptchaToken: (token: string | null) => void
  onSubmit: (e: React.FormEvent) => void
}

export function RegisterForm({
  fullName,
  email,
  password,
  confirmPassword,
  error,
  loading,
  captchaEnabled,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onCaptchaToken,
  onSubmit,
}: RegisterFormProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-2 text-gray-600">Join SupaNext today</p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Full Name <span className="text-gray-400">(optional)</span>
            </label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={e => onFullNameChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="John Doe"
            />
          </div>

          <Input
            id="email"
            label="Email Address"
            type="email"
            value={email}
            onChange={e => onEmailChange(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="you@example.com"
          />

          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={e => onPasswordChange(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
          />

          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={e => onConfirmPasswordChange(e.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
          />

          <div className="text-sm text-gray-600">
            <p>
              By creating an account, you agree to our Terms of Service and
              Privacy Policy.
            </p>
          </div>

          {captchaEnabled && <Captcha onToken={onCaptchaToken} />}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
