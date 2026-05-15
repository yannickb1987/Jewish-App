export default function StatsBar({ properties, searchMeta }) {
  const avgYears = Math.round(
    properties.reduce((s, p) => s + p.yearsOwned, 0) / properties.length
  )
  const avgValue = Math.round(
    properties.filter(p => p.estimatedValue > 0).reduce((s, p) => s + p.estimatedValue, 0) /
      (properties.filter(p => p.estimatedValue > 0).length || 1)
  )
  const maxYears = Math.max(...properties.map(p => p.yearsOwned))

  function fmt(n) {
    if (!n) return 'N/A'
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
    return `$${n}`
  }

  const stats = [
    { label: 'Properties Found', value: properties.length },
    { label: 'Avg. Years Owned', value: `${avgYears} yrs` },
    { label: 'Longest Held', value: `${maxYears} yrs` },
    { label: 'Avg. Est. Value', value: fmt(avgValue) },
    { label: 'Zip Searched', value: searchMeta?.zip },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
          <p className="text-lg font-bold text-blue-700">{s.value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
