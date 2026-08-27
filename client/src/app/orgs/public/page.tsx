import { Suspense } from 'react'
import { PublicOrgContainer } from '@/containers/org/PublicOrgContainer'

export default function PublicOrgPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto py-12 text-gray-500">Loading...</div>
      }
    >
      <PublicOrgContainer />
    </Suspense>
  )
}
