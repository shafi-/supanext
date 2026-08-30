import { Suspense } from 'react'
import { OrgsContainer } from '@/containers/org/OrgsContainer'

export default function OrgsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl py-12 text-gray-500">Loading...</div>
      }
    >
      <OrgsContainer />
    </Suspense>
  )
}
