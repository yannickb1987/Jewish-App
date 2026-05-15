'use client'

import { useState } from 'react'

export default function SearchForm({ onSearch, loading }) {
  const [zip, setZip] = useState('')
  const [minYears, setMinYears] = useState(10)
  const [propertyTypes, setPropertyTypes] = useState(['SFR', 'CONDO'])

  function toggleType(type) {
    setPropertyTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!zip || propertyTypes.length === 0) return
    onSearch({ zip, minYears, propertyTypes })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
          <input
            type="text"
            value={zip}
            onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            placeholder="e.g. 33139"
            pattern="\d{5}"
            maxLength={5}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-lg"
          />
          <p className="mt-1 text-xs text-gray-400">Miami-Dade zip code</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Min. Ownership:{' '}
            <span className="text-blue-600 font-semibold">{minYears} yrs</span>
          </label>
          <input
            type="range"
            min={1}
            max={40}
            value={minYears}
            onChange={e => setMinYears(Number(e.target.value))}
            className="w-full accent-blue-600 mt-3"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1 yr</span><span>40 yrs</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Property Types</label>
          <div className="flex flex-col gap-2">
            {[['SFR', 'Single Family (SFR)'], ['CONDO', 'Condo / Townhouse']].map(([val, label]) => (
              <label key={val} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={propertyTypes.includes(val)}
                  onChange={() => toggleType(val)}
                  className="rounded accent-blue-600"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-gray-400">
          Filters applied: <strong>Free &amp; clear</strong> · Same owner ≥ {minYears} yrs · {propertyTypes.join(' + ')}
        </p>
        <button
          type="submit"
          disabled={loading || !zip || propertyTypes.length === 0}
          className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Searching…' : 'Find Deals'}
        </button>
      </div>
    </form>
  )
}
