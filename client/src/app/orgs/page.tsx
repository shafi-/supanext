import { Suspense } from 'react'
import { OrgsContainer } from './OrgsContainer'

export default function OrgsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-12 text-gray-500">Loading...</div>
      }
    >
      <OrgsContainer />
    </Suspense>
  )
}