// Role matchers: +100 each when the member has the role and the scheme text mentions it.
const ROLE_MATCHERS = [
  {
    label: 'Matches Student',
    active: m => !!m.isStudent,
    words: ['student', 'scholarship', 'education', 'college', 'school', 'tuition', 'hostel', 'pudhalvan', 'pudhumai'],
  },
  {
    label: 'Matches Farmer',
    active: m => !!m.isFarmer,
    words: ['farmer', 'agriculture', 'crop', 'kisan', 'irrigation', 'soil', 'seed'],
  },
  {
    label: 'Matches Widow',
    active: m => !!m.isWidow,
    words: ['widow', 'destitute', 'single woman', 'mangalyam'],
  },
  {
    label: 'Matches Senior 60+',
    active: m => Number(m.age) >= 60,
    words: ['senior', 'old age', 'elderly', '60 years', 'oap', 'vayo'],
  },
  {
    label: 'Matches Daily Wage',
    active: m => !!m.isDailyWage,
    words: ['daily wage', 'labour', 'labor', 'worker', 'unorganized', 'construction', 'e-shram'],
  },
  {
    label: 'Matches Differently Abled',
    active: m => !!m.isDisabled,
    words: ['disabled', 'disability', 'differently abled', 'handicapped', 'udid', 'assistive'],
  },
]

// Household need matchers: +60 each when the need is in householdNeeds (or implied by the member).
const NEED_MATCHERS = [
  { need: 'pension', label: 'Matches Pension Need', words: ['pension', 'atal pension', 'oap', 'retirement'] },
  { need: 'scholarship', label: 'Matches Scholarship Need', words: ['scholarship', 'education', 'student', 'fee'] },
  { need: 'farming', label: 'Matches Farming Need', words: ['farmer', 'agriculture', 'crop', 'kisan'] },
  { need: 'housing', label: 'Matches Housing Need', words: ['housing', 'awas', 'pmay', 'illam', 'home', 'shelter', 'patta'] },
  { need: 'widow support', label: 'Matches Widow Support', words: ['widow', 'destitute', 'woman'] },
]

// Demographic specificity: scheme explicitly names the member's gender group (+20).
const GENDER_TERMS = {
  female: /\b(women|woman|girl|female)\b/,
  male: /\b(men|man|boy|male)\b/,
}

function toText(v) {
  if (v == null) return ''
  if (Array.isArray(v)) return v.map(toText).join(' ')
  if (typeof v === 'object') return Object.values(v).map(toText).join(' ')
  return String(v)
}

export function scoreSchemeForMember(scheme, member, householdNeeds) {
  const s = scheme || {}
  const mem = member || {}
  const needsList = Array.isArray(householdNeeds) ? householdNeeds : []

  const haystack = [s.title || s.schemeName || s.name, s.category, s.description, s.tags, s.rules]
    .map(toText)
    .join(' ')
    .toLowerCase()
  const hit = words => words.some(w => haystack.includes(w))

  const matched = []
  let relevanceScore = 0

  ROLE_MATCHERS.forEach(r => {
    if (r.active(mem) && hit(r.words)) {
      relevanceScore += 100
      matched.push({ points: 100, label: r.label })
    }
  })

  const needs = new Set(needsList.map(n => String(n).toLowerCase()))
  if (mem.isWidow) {
    needs.add('pension')
    needs.add('widow support')
  }
  NEED_MATCHERS.forEach(n => {
    if (needs.has(n.need) && hit(n.words)) {
      relevanceScore += 60
      matched.push({ points: 60, label: n.label })
    }
  })

  const genderRe = GENDER_TERMS[String(mem.gender || '').toLowerCase()]
  if (genderRe && genderRe.test(haystack)) {
    relevanceScore += 20
  }

  const best = matched.reduce((a, b) => (a === null || b.points > a.points ? b : a), null)
  return { relevanceScore, matchBadge: best ? best.label : null }
}
