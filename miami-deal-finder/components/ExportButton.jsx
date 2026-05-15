'use client'

export default function ExportButton({ data, filename }) {
  function handleExport() {
    if (!data?.length) return

    const headers = [
      'Address', 'Type', 'Years Owned', 'Last Sale Date',
      'Last Sale Price', 'Est. Value', 'Assessed Value',
      'Sq Ft', 'Bedrooms', 'Bathrooms', 'Owner Name', 'Free & Clear',
    ]

    const rows = data.map(p => [
      p.address, p.propertyType, p.yearsOwned, p.lastSaleDate,
      p.lastSalePrice, p.estimatedValue, p.assessedValue,
      p.sqft, p.bedrooms, p.bathrooms, p.ownerName, p.freeClear ? 'Yes' : 'No',
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `${filename}-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export CSV
    </button>
  )
}
