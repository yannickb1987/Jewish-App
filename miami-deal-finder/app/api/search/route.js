import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { searchFreeClearProperties } from '@/lib/attom'

export async function GET(request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!['approved', 'admin'].includes(session.user.role)) {
    return NextResponse.json(
      { error: 'Account pending approval. An admin will review your request.' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const zip = searchParams.get('zip')
  const minYears = parseInt(searchParams.get('minYears') || '10', 10)
  const propertyTypes = (searchParams.get('propertyTypes') || 'SFR,CONDO')
    .split(',')
    .filter(Boolean)

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: 'Valid 5-digit zip code required' }, { status: 400 })
  }

  if (!process.env.ATTOM_API_KEY) {
    return NextResponse.json({ error: 'ATTOM_API_KEY not configured on server' }, { status: 500 })
  }

  try {
    const properties = await searchFreeClearProperties({ zip, minYears, propertyTypes })

    // Log the search for history tracking
    await prisma.search.create({
      data: {
        userId: session.user.id,
        zip,
        minYears,
        propertyTypes: propertyTypes.join(','),
        resultCount: properties.length,
      },
    }).catch(() => {})

    return NextResponse.json({ properties })
  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}
