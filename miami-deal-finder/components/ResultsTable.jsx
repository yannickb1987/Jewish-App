'use client'

import { useState } from 'react'

function fmt(n) {
  if (!n) return 'N/A'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

const COLS = [
  { key: 'address', label: 'Address', sortable: false },
  { key: 'propertyType', label: 'Type', sortable: true },
  { key: 'yearsOwned', label: 'Yrs Owned', sortable: true },
  { key: 'lastSaleDate', label: 'Last Sale', sortable: true },
  { key: 'lastSalePrice', label: 'Bought For', sortable: true },
  { key: 'estimatedValue', label: 'Est. Value', sortable: true },
  { key: 'assessedValue', label: 'Assessed', sortable: true },
  { key: 'sqft', label: 'Sq Ft', sortable: true },
  { key: 'bedrooms', label: 'Bd/Ba', sortable: false },
  { key: 'ownerName', label: 'Owner', sortable: false },
]

const PER_PAGE = 25

export default function ResultsTable({ properties }) {
  const [sortField, setSortField] = useState('yearsOwned')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('desc') }
    setPage(1)
  }

  const sorted = [...properties].sort((a, b) => {
    const va = a[sortField] ?? 0
    const vb = b[sortField] ?? 0
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.ceil(sorted.length / PER_PAGE)
  const visible = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 w-8">#</th>
              {COLS.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                    col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                  }`}
                >
                  {col.label}
                  {col.sortable && (
                    <span className="ml-1">
                      {sortField === col.key ? (sortDir === 'asc' ? '↑' : '↓') : <span className="text-gray-300">↕</span>}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((p, i) => (
              <tr key={p.attomId || i} className="hover:bg-blue-50 transition-colors">
                <td className="px-3 py-3 text-gray-400 text-xs">{(page - 1) * PER_PAGE + i + 1}</td>
                <td className="px-3 py-3 text-gray-900 font-medium">
                  <div className="max-w-xs truncate">{p.address}</div>
                </td>
                <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{p.propertyType || '—'}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="font-bold text-indigo-700">{p.yearsOwned} yrs</span>
                </td>
                <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                  {p.lastSaleDate ? new Date(p.lastSaleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
                <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{fmt(p.lastSalePrice)}</td>
                <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">{fmt(p.estimatedValue)}</td>
                <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{fmt(p.assessedValue)}</td>
                <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                  {p.sqft ? Number(p.sqft).toLocaleString() : '—'}
                </td>
                <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                  {p.bedrooms || '?'}/{p.bathrooms || '?'}
                </td>
                <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                  <div className="max-w-[140px] truncate">{p.ownerName || '—'}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, sorted.length)} of {sorted.length}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
