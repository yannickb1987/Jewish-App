import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const attomId = searchParams.get('attomId')

  if (attomId) {
    const lead = await prisma.lead.findUnique({
      where: { userId_attomId: { userId: session.user.id, attomId } },
    })
    return NextResponse.json({ lead })
  }

  const leads = await prisma.lead.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json({ leads })
}

export async function POST(request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { attomId, address, status, notes, offerPrice, repairEst, arv } = await request.json()
  if (!attomId) return NextResponse.json({ error: 'attomId required' }, { status: 400 })

  const lead = await prisma.lead.upsert({
    where: { userId_attomId: { userId: session.user.id, attomId } },
    update: { status, notes, offerPrice, repairEst, arv, address },
    create: {
      userId: session.user.id,
      attomId,
      address: address || '',
      status: status || 'new',
      notes,
      offerPrice,
      repairEst,
      arv,
    },
  })
  return NextResponse.json({ lead })
}
