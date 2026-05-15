'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

const ROLE_LABELS = { pending: 'Pending', approved: 'Approved', admin: 'Admin' }
const ROLE_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  admin: 'bg-blue-100 text-blue-700',
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    setUsers(data.users || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      if (session.user.role !== 'admin') router.push('/')
      else fetchUsers()
    }
  }, [status, session, router, fetchUsers])

  async function updateRole(userId, role) {
    setUpdating(userId)
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    })
    await fetchUsers()
    setUpdating(null)
  }

  const pending = users.filter(u => u.role === 'pending')
  const others = users.filter(u => u.role !== 'pending')

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">Manage user access</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to Search
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wider mb-3">
              Pending Approval ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map(u => (
                <UserRow key={u.id} user={u} onUpdate={updateRole} updating={updating} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            All Users ({others.length})
          </h2>
          <div className="space-y-3">
            {others.map(u => (
              <UserRow key={u.id} user={u} onUpdate={updateRole} updating={updating} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function UserRow({ user, onUpdate, updating }) {
  const ROLE_COLORS = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    admin: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
      {user.image && (
        <img src={user.image} alt="" className="w-10 h-10 rounded-full" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{user.name || 'Unknown'}</p>
        <p className="text-sm text-gray-500 truncate">{user.email}</p>
        <p className="text-xs text-gray-400">
          Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>
      <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[user.role]}`}>
        {user.role}
      </span>
      <div className="flex gap-2">
        {user.role === 'pending' && (
          <button
            onClick={() => onUpdate(user.id, 'approved')}
            disabled={updating === user.id}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
        )}
        {user.role === 'approved' && (
          <button
            onClick={() => onUpdate(user.id, 'pending')}
            disabled={updating === user.id}
            className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            Revoke
          </button>
        )}
        {user.role !== 'admin' && (
          <button
            onClick={() => onUpdate(user.id, 'admin')}
            disabled={updating === user.id}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Make Admin
          </button>
        )}
      </div>
    </div>
  )
}
