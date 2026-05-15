'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import SearchForm from '@/components/SearchForm'
import ResultsTable from '@/components/ResultsTable'
import ExportButton from '@/components/ExportButton'
import StatsBar from '@/components/StatsBar'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchMeta, setSearchMeta] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && session.user.role === 'pending') router.push('/login')
  }, [status, session, router])

  async function handleSearch({ zip, minYears, propertyTypes }) {
    setLoading(true)
    setError(null)
    setResults([])
    setSearchMeta({ zip, minYears, propertyTypes })

    try {
      const params = new URLSearchParams({
        zip,
        minYears,
        propertyTypes: propertyTypes.join(','),
      })
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data.properties)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏠</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Miami Deal Finder</h1>
              <p className="text-xs text-gray-500">Free &amp; clear · Off-market · Fix &amp; flip</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session?.user?.image && (
              <img src={session.user.image} alt="" className="w-8 h-8 rounded-full" />
            )}
            <span className="text-sm text-gray-700 hidden sm:block">{session?.user?.name}</span>
            {session?.user?.role === 'admin' && (
              <button
                onClick={() => router.push('/admin')}
                className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <SearchForm onSearch={handleSearch} loading={loading} />

        {loading && (
          <div className="mt-10 flex flex-col items-center gap-3 text-gray-500">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Searching ATTOM database&hellip;</p>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="mt-6 space-y-4">
            <StatsBar properties={results} searchMeta={searchMeta} />
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {results.length} qualifying properties
              </h2>
              <ExportButton data={results} filename={`miami-deals-${searchMeta?.zip}`} />
            </div>
            <ResultsTable properties={results} />
          </div>
        )}

        {!loading && results.length === 0 && searchMeta && !error && (
          <div className="mt-10 text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm">
              No qualifying properties found in {searchMeta.zip}. Try lowering the minimum years or a different zip.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
