import { Link } from 'react-router-dom'

interface UsageMeterProps {
  label: string
  used: number
  limit: number
}

function getStatus(ratio: number) {
  if (ratio >= 1) {
    return { barColor: 'bg-red-600', textColor: 'text-red-600', message: "Over your plan's limit" }
  }
  if (ratio >= 0.7) {
    return { barColor: 'bg-amber-500', textColor: 'text-amber-600', message: 'Approaching limit' }
  }
  return { barColor: 'bg-emerald-600', textColor: 'text-emerald-600', message: 'On track' }
}

export function UsageMeter({ label, used, limit }: UsageMeterProps) {
  const ratio = limit > 0 ? used / limit : 0
  const status = getStatus(ratio)
  const barWidth = Math.min(ratio, 1) * 100

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-700">{label}</h2>
        <span className={`text-sm font-medium ${status.textColor}`}>{status.message}</span>
      </div>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {used.toLocaleString()} <span className="text-base font-normal text-slate-400">/ {limit.toLocaleString()}</span>
      </p>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${status.barColor} transition-all`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {ratio >= 0.7 && (
        <p className="mt-3 text-sm text-slate-500">
          {ratio >= 1 ? "You've used all of this period's included requests. " : "You're close to this period's limit. "}
          <Link to="/plans" className="font-medium text-indigo-600 hover:text-indigo-500">
            Upgrade plan
          </Link>
        </p>
      )}
    </div>
  )
}
