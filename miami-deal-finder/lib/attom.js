const ATTOM_BASE = 'https://api.gateway.attomdata.com'
const PAGE_SIZE = 100

async function attomGet(path, params) {
  const url = new URL(path, ATTOM_BASE)
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v))
  }

  const res = await fetch(url.toString(), {
    headers: {
      apikey: process.env.ATTOM_API_KEY,
      accept: 'application/json',
    },
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

  const sales = raw.saleHistory || (raw.sale ? [raw.sale] : [])
  const lastSale = sales[0] || {}

  const owner = raw.owner || {}
  const ownerName =
    [owner.owner1FirstName, owner.owner1LastName].filter(Boolean).join(' ') ||
    lastSale.buyerName1 ||
    ''

  const mortgage = raw.mortgage || {}
  const openLienBalance =
    mortgage.amount || mortgage.loanAmount || mortgage.openLoanBalance || 0
  const freeClear = !openLienBalance && !mortgage.openMortgage

  const assess = raw.assessment?.assessed || raw.assessment || {}
  const avm = raw.avm?.amount || {}

  const lastSaleDate = lastSale.saleTransDate || sum.lastSaleDate || ''

  return {
    attomId: raw.identifier?.attomId,
    apn: raw.identifier?.apn,
    address: [addr.line1, addr.locality, `FL ${addr.postal1}`]
      .filter(Boolean)
      .join(', '),
    propertyType: sum.proptype || sum.propSubType || sum.propLandUse || '',
    yearBuilt: sum.yearbuilt || bldg.summary?.yearBuilt || '',
    bedrooms: rooms.bedroomsCount || rooms.beds || '',
    bathrooms: rooms.bathroomsCount || rooms.bathsFull || '',
    sqft: size.livingSize || size.bldgSize || '',
    ownerName,
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
  // Try expanded profile first (includes mortgage data); fall back to snapshot
  try {
    const data = await attomGet('/propertyapi/v1.0.0/property/expandedprofile', {
      postalcode: zip,
      propertytype: ptype,
      page,
      pagesize: PAGE_SIZE,
    })
    return data.property || []
  } catch (err) {
    if (err.message.includes('401') || err.message.includes('403')) throw err
    const data = await attomGet('/propertyapi/v1.0.0/property/snapshot', {
      postalcode: zip,
      propertytype: ptype,
      page,
      pagesize: PAGE_SIZE,
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
        if (p.yearsOwned >= minYears && p.freeClear) {
          results.push(p)
        }
      }

      if (props.length < PAGE_SIZE) break
      page++
    }
  }

  return results.sort((a, b) => b.yearsOwned - a.yearsOwned)
}
