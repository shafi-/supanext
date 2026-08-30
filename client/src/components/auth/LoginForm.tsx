import Link from 'next/link'
import { ROUTES } from '@/lib/routes'
import { Captcha } from '@/components/auth/Captcha'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface LoginFormProps {
  email: string
  password: string
  error: string
  loading: boolean
  captchaEnabled: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onCaptchaToken: (token: string | null) => void
  onSubmit: (e: React.FormEvent) => void
}

export function LoginForm({
  email,
  password,
  error,
  loading,
  captchaEnabled,
  onEmailChange,
  onPasswordChange,
  onCaptchaToken,
  onSubmit,
}: LoginFormProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Sign In</h1>
          <p className="mt-2 text-gray-600">Welcome back to SupaNext</p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
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

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-4">
                <Input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <label
                htmlFor="remember"
                className="ml-2 block text-sm text-gray-700"
              >
                Remember me
              </label>
            </div>

            <Link
              href={ROUTES.resetPassword}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Forgot password?
            </Link>
          </div>

          {captchaEnabled && <Captcha onToken={onCaptchaToken} />}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href={ROUTES.register}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign up
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
