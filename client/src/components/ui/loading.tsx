import { cn } from '@/utils/cn'

interface LoadingProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export default function Loading({
  className,
  size = 'md',
  text,
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="text-center">
        <div
          className={cn(
            'animate-spin rounded-full border-gray-300 border-t-blue-600',
            sizeClasses[size]
          )}
        ></div>
        {text && <p className="mt-4 text-sm text-gray-600">{text}</p>}
      </div>
    </div>
  )
}

interface LoadingSkeletonProps {
  className?: string
  count?: number
}

export function LoadingSkeleton({
  className,
  count = 1,
}: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-4 w-3/4 rounded bg-gray-200"></div>
        </div>
      ))}
    </div>
  )
}

export function FullPageLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Loading text={text} size="lg" />
    </div>
  )
}
