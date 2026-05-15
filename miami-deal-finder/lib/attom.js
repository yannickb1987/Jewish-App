const ATTOM_BASE = 'https://api.gateway.attomdata.com'
const PAGE_SIZE = 100

async function attomGet(path, params) {
  const url = new URL(path, ATTOM_BASE)
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v))
  }
  const res = await fetch(url.toString(), {
    headers: { apikey: process.env.ATTOM_API_KEY, accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText)
    throw new Error(`ATTOM ${res.status}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

function yearsSince(dateStr) {
  if (!dateStr) return 0
  return (Date.now() - new Date(dateStr).getTime()) / (365.25 * 24 * 3600 * 1000)
}

function extractProperty(raw) {
  const addr = raw.address || {}
  const sum = raw.summary || {}
  const bldg = raw.building || {}
  const rooms = bldg.rooms || {}
  const size = bldg.size || {}
  const loc = raw.location || {}

  const sales = raw.saleHistory || (raw.sale ? [raw.sale] : [])
  const lastSale = sales[0] || {}

  const owner = raw.owner || {}
  const ownerName =
    [owner.owner1FirstName, owner.owner1LastName].filter(Boolean).join(' ') ||
    lastSale.buyerName1 || ''

  const mail = raw.mailAddress || owner.mailAddress || {}
  const mailLine1 = mail.line1 || ''
  const mailCity = mail.locality || mail.city || ''
  const mailState = (mail.countrySubd || mail.state || '').toUpperCase()
  const mailZip = mail.postal1 || mail.zip || ''
  const mailAddress = [mailLine1, mailCity, mailState, mailZip].filter(Boolean).join(', ')

  const propZip = addr.postal1 || ''
  const absenteeOwner = Boolean(mailZip && mailZip !== propZip)
  const ownerOutOfState = Boolean(mailState && mailState !== 'FL')

  const mortgage = raw.mortgage || {}
  const openLienBalance = mortgage.amount || mortgage.loanAmount || mortgage.openLoanBalance || 0
  const freeClear = !openLienBalance && !mortgage.openMortgage

  const assess = raw.assessment?.assessed || raw.assessment || {}
  const avm = raw.avm?.amount || {}

  const delinquent = raw.delinquentTax || {}
  const taxDelinquent = Boolean(delinquent.amount || delinquent.delinquentYear)

  const lastOwner = lastSale.sellerName1 || ''
  const probate = /estate|probate|trust|heir|executor|deceased/i.test(lastOwner)

  const lastSaleDate = lastSale.saleTransDate || sum.lastSaleDate || ''

  return {
    attomId: String(raw.identifier?.attomId || ''),
    apn: raw.identifier?.apn || '',
    address: [addr.line1, addr.locality, `FL ${propZip}`].filter(Boolean).join(', '),
    lat: loc.latitude || null,
    lng: loc.longitude || null,
    propertyType: sum.proptype || sum.propSubType || sum.propLandUse || '',
    yearBuilt: sum.yearbuilt || bldg.summary?.yearBuilt || '',
    bedrooms: rooms.bedroomsCount || rooms.beds || '',
    bathrooms: rooms.bathroomsCount || rooms.bathsFull || '',
    sqft: size.livingSize || size.bldgSize || '',
    ownerName,
    mailAddress,
    mailState,
    absenteeOwner,
    ownerOutOfState,
    taxDelinquent,
    probate,
    lastSaleDate,
    lastSalePrice: lastSale.saleAmt || lastSale.amount || 0,
    yearsOwned: Math.floor(yearsSince(lastSaleDate)),
    assessedValue: assess.assdTtlValue || assess.totalValue || 0,
    estimatedValue: avm.value || raw.avmAmount || 0,
    openLienBalance,
    freeClear,
  }
}

async function fetchPage(zip, ptype, page) {
  try {
    const data = await attomGet('/propertyapi/v1.0.0/property/expandedprofile', {
      postalcode: zip, propertytype: ptype, page, pagesize: PAGE_SIZE,
    })
    return data.property || []
  } catch (err) {
    if (err.message.includes('401') || err.message.includes('403')) throw err
    const data = await attomGet('/propertyapi/v1.0.0/property/snapshot', {
      postalcode: zip, propertytype: ptype, page, pagesize: PAGE_SIZE,
    })
    return data.property || []
  }
}

export async function searchFreeClearProperties({ zip, minYears, propertyTypes }) {
  const results = []
  for (const ptype of propertyTypes) {
    let page = 1
    while (true) {
      const props = await fetchPage(zip, ptype, page)
      if (props.length === 0) break
      for (const raw of props) {
        const p = extractProperty(raw)
        if (p.yearsOwned >= minYears && p.freeClear) results.push(p)
      }
      if (props.length < PAGE_SIZE) break
      page++
    }
  }
  return results.sort((a, b) => b.yearsOwned - a.yearsOwned)
}

export async function fetchComps({ lat, lng, zip, propertyType }) {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const startDate = sixMonthsAgo.toISOString().slice(0, 10)

  try {
    const params =
      lat && lng
        ? { latitude: lat, longitude: lng, radius: 0.5, propertytype: propertyType, startcalrecordingdate: startDate, pagesize: 20 }
        : { postalcode: zip, propertytype: propertyType, startcalrecordingdate: startDate, pagesize: 20 }

    const data = await attomGet('/propertyapi/v1.0.0/sale/snapshot', params)
    return (data.property || []).map(s => ({
      address: [s.address?.line1, s.address?.locality].filter(Boolean).join(', '),
      saleDate: s.sale?.saleTransDate || '',
      salePrice: s.sale?.saleAmt || 0,
      sqft: s.building?.size?.livingSize || 0,
      pricePerSqft:
        s.sale?.saleAmt && s.building?.size?.livingSize
          ? Math.round(s.sale.saleAmt / s.building.size.livingSize)
          : 0,
      beds: s.building?.rooms?.bedroomsCount || '',
      baths: s.building?.rooms?.bathroomsCount || '',
      propertyType: s.summary?.proptype || '',
    }))
  } catch {
    return []
  }
}

export async function fetchNeighborhoodStats({ zip, propertyType }) {
  const comps = await fetchComps({ zip, propertyType })
  if (!comps.length) return null
  const withSqft = comps.filter(c => c.pricePerSqft > 0)
  const avgPpsf = withSqft.length
    ? Math.round(withSqft.reduce((s, c) => s + c.pricePerSqft, 0) / withSqft.length)
    : 0
  const avgSalePrice = Math.round(comps.reduce((s, c) => s + c.salePrice, 0) / comps.length)
  const sorted = [...comps].sort((a, b) => a.salePrice - b.salePrice)
  const medianPrice = sorted[Math.floor(sorted.length / 2)]?.salePrice || 0
  return { salesLast6mo: comps.length, avgSalePrice, avgPricePerSqft: avgPpsf, medianPrice }
}
