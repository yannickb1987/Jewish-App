export function calculateDealScore(property) {
  let score = 0
  const breakdown = []

  const yearsScore = Math.min(Math.floor((property.yearsOwned || 0) * 1.2), 30)
  score += yearsScore
  breakdown.push({ label: 'Years Owned', pts: yearsScore, max: 30 })

  let equityScore = 0
  if (property.estimatedValue > 0 && property.lastSalePrice > 0) {
    const pct = (property.estimatedValue - property.lastSalePrice) / property.estimatedValue
    equityScore = Math.min(Math.round(pct * 50), 25)
  }
  score += equityScore
  breakdown.push({ label: 'Equity Depth', pts: equityScore, max: 25 })

  let ageScore = 0
  if (property.yearBuilt) {
    const age = new Date().getFullYear() - Number(property.yearBuilt)
    ageScore = Math.min(Math.floor(age * 0.35), 15)
  }
  score += ageScore
  breakdown.push({ label: 'Property Age', pts: ageScore, max: 15 })

  const absenteeScore = property.absenteeOwner ? 10 : 0
  score += absenteeScore
  breakdown.push({ label: 'Absentee Owner', pts: absenteeScore, max: 10 })

  const outOfStateScore = property.ownerOutOfState ? 8 : 0
  score += outOfStateScore
  breakdown.push({ label: 'Out-of-State Owner', pts: outOfStateScore, max: 8 })

  const taxScore = property.taxDelinquent ? 12 : 0
  score += taxScore
  breakdown.push({ label: 'Tax Delinquent', pts: taxScore, max: 12 })

  return { score: Math.min(score, 100), breakdown }
}

export function scoreLabel(score) {
  if (score >= 80) return { label: 'Hot', color: 'red' }
  if (score >= 60) return { label: 'Warm', color: 'orange' }
  if (score >= 40) return { label: 'Fair', color: 'yellow' }
  return { label: 'Low', color: 'gray' }
}
