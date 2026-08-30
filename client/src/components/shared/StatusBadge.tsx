export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active'
      ? 'bg-green-100 text-green-800'
      : status === 'pending'
        ? 'bg-yellow-100 text-yellow-800'
        : status === 'suspended'
          ? 'bg-red-100 text-red-800'
          : 'bg-gray-100 text-gray-600'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{status}</span>
  )
}
