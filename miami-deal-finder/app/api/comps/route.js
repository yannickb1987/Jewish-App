import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { fetchComps, fetchNeighborhoodStats } from '@/lib/attom'

export async function GET(request) {
  const session = await getServerSession(authOptions)
  if (!session || !['approved', 'admin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const zip = searchParams.get('zip')
  const propertyType = searchParams.get('propertyType') || 'SFR'
  if (!zip) return NextResponse.json({ error: 'zip required' }, { status: 400 })
  try {
    const [comps, stats] = await Promise.all([
      fetchComps({ lat: lat ? parseFloat(lat) : null, lng: lng ? parseFloat(lng) : null, zip, propertyType }),
      fetchNeighborhoodStats({ zip, propertyType }),
    ])
    return NextResponse.json({ comps, stats })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
