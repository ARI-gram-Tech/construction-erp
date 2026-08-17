interface StatCardProps {
  label: string
  value: string
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-steel-100 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-steel-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-primary-900">{value}</p>
    </div>
  )
}
