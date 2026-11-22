// Pure, deterministic parser for the family description text and Tamil transcripts.
// No network calls and no React. Never throws: bad input gives an empty result.

const TAMIL_DIGITS = { '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4', '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9' }

// Tamil words to English. Longer phrases are replaced first (see translateTamil).
const TAMIL_TERMS = [
  ['கூலித் தொழிலாளி', 'daily wage'],
  ['தினக்கூலி', 'daily wage'],
  ['கூலி', 'daily wage'],
  ['மாணவன்', 'student'],
  ['மாணவி', 'student'],
  ['படிக்கிறான்', 'student'],
  ['படிக்கிறாள்', 'student'],
  ['விவசாயி', 'farmer'],
  ['விதவை', 'widow'],
  ['வயசு', 'age'],
  ['வயது', 'age'],
]

// Phonetic tables for offline Tamil -> Latin transliteration (Unicode block U+0B80-U+0BFF).
const TAMIL_VOWELS = {
  'அ': 'a', 'ஆ': 'a', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo', 'எ': 'e', 'ஏ': 'ee',
  'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au',
}
// Consonants carry an inherent 'a' unless a matra or pulli follows.
const TAMIL_CONSONANTS = {
  'க': 'k', 'ங': 'ng', 'ச': 's', 'ஜ': 'j', 'ஞ': 'ny', 'ட': 't', 'ண': 'n', 'த': 'th', 'ந': 'n',
  'ன': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r', 'ற': 'r', 'ல': 'l', 'ள': 'l', 'ழ': 'zh',
  'வ': 'v', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h',
}
// Vowel signs (matras) replace the inherent 'a' of the consonant they follow.
const TAMIL_MATRAS = {
  'ா': 'a', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo', 'ெ': 'e', 'ே': 'ee', 'ை': 'ai',
  'ொ': 'o', 'ோ': 'oo', 'ௌ': 'au',
}
const TAMIL_PULLI = '\u0BCD'
const TAMIL_CHAR = /[\u0B80-\u0BFF]/
const TAMIL_RUN = /[\u0B80-\u0BFF]+/g

const FEMALE_WORDS = new Set(['she', 'her', 'woman', 'girl', 'lady', 'mother', 'wife', 'daughter', 'sister', 'grandmother'])
const MALE_WORDS = new Set(['he', 'his', 'him', 'man', 'boy', 'father', 'husband', 'son', 'brother', 'grandfather'])
const RELATION_WORDS = new Set([...FEMALE_WORDS, ...MALE_WORDS, 'child', 'kid'])
// Words that carry no name and may be skipped before a name.
const FILLER_WORDS = new Set(['my', 'the', 'i', 'am', 'is', 'a', 'an', 'and', 'has', 'have', 'name', 'named', 'called', 'of', 's', 'who'])
// Words that describe a person or a value but are never part of a name.
const ROLE_WORDS = new Set([
  'age', 'aged', 'old', 'yrs', 'yr', 'years', 'year', 'yo', 'widow', 'widowed', 'widower',
  'farm', 'farms', 'farmer', 'farmers', 'farming', 'land', 'lands', 'landholding', 'acre', 'acres',
  'plot', 'plots', 'hectare', 'hectares', 'cultivate', 'cultivation', 'agriculture', 'agricultural',
  'student', 'students', 'studying', 'school', 'college', 'university', 'class', 'grade', 'std', 'standard',
  'wage', 'wages', 'daily', 'labour', 'labourer', 'labourers', 'labor', 'laborer', 'coolie', 'coolies',
  'disabled', 'disability', 'handicapped', 'blind', 'deaf', 'wheelchair', 'senior',
  'income', 'earns', 'earn', 'lakh', 'lakhs', 'lac', 'lacs', 'rs', 'rupees', 'month', 'monthly', 'annum', 'yearly', 'per',
  'half', 'one', 'an', 'no', 'not', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'has', 'family',
])
const STOP_WORDS = new Set([...FILLER_WORDS, ...RELATION_WORDS, ...ROLE_WORDS])

// Maps a typed age to the ageBand values the backend uses.
export function deriveAgeBand(age) {
  if (age === null || age === undefined || age === '' || Number.isNaN(Number(age))) return null
  const n = Number(age)
  if (n <= 5) return '0_5'
  if (n <= 17) return '6_17'
  if (n <= 25) return '18_25'
  if (n <= 59) return '26_59'
  return '60_plus'
}

// "rudhresh" -> "Rudhresh"; "sita devi" -> "Sita Devi".
export function titleCase(text) {
  return String(text ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

// Transliterates one Tamil word (no spaces) to lowercase Latin letters. Non-Tamil characters pass through.
function transliterateTamilWord(word) {
  let out = ''
  let i = 0
  while (i < word.length) {
    const ch = word[i]
    if (TAMIL_VOWELS[ch] !== undefined) {
      out += TAMIL_VOWELS[ch]
      i++
      continue
    }
    if (TAMIL_CONSONANTS[ch] === undefined) {
      // Stray matra, pulli or non-Tamil character.
      if (TAMIL_MATRAS[ch] !== undefined) out += TAMIL_MATRAS[ch]
      else if (ch !== TAMIL_PULLI) out += ch
      i++
      continue
    }
    let base = TAMIL_CONSONANTS[ch]
    let conjunct = false
    i++
    // ட் followed by ச is the 'ksh' conjunct of Sanskrit loans (லட்சுமி -> Lakshmi).
    if (ch === 'ட' && word[i] === TAMIL_PULLI && word[i + 1] === 'ச') {
      out += 'k'
      base = 'sh'
      conjunct = true
      i += 2
    }
    const next = word[i]
    if (next === TAMIL_PULLI) {
      // Pulli suppresses the inherent 'a'.
      out += base
      i++
      continue
    }
    if (TAMIL_MATRAS[next] !== undefined) {
      i++
      // After a conjunct, an unsounded u-vowel before another consonant is dropped.
      if (conjunct && (next === 'ு' || next === 'ூ') && TAMIL_CONSONANTS[word[i]] !== undefined) {
        out += base
        continue
      }
      out += base + TAMIL_MATRAS[next]
      continue
    }
    out += base + 'a'
  }
  return out
}

// Converts Tamil script to Latin letters offline, for any name (no lookup table).
// Each whitespace-separated word that contains Tamil is capitalised; other characters are unchanged.
export function transliterateTamilToLatin(text) {
  if (typeof text !== 'string') return ''
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (part === '' || /^\s+$/.test(part) || !TAMIL_CHAR.test(part)) return part
      const latin = transliterateTamilWord(part)
      return latin.charAt(0).toUpperCase() + latin.slice(1)
    })
    .join('')
}

// Converts a Tamil transcript to clean English words the parser understands.
// Digits are converted too. Known Tamil words map to English; other Tamil words are transliterated to Latin.
export function translateTamil(text) {
  if (typeof text !== 'string') return ''
  let out = text.replace(/[௦-௯]/g, (d) => TAMIL_DIGITS[d] ?? d)
  const terms = [...TAMIL_TERMS].sort((a, b) => b[0].length - a[0].length)
  for (const [ta, en] of terms) out = out.split(ta).join(` ${en} `)
  out = out.replace(TAMIL_RUN, (run) => transliterateTamilToLatin(run))
  return out.replace(/\s+/g, ' ').trim()
}

function tokenize(clause) {
  return clause.toLowerCase().match(/[a-z]+|\d+(?:\.\d+)?/g) ?? []
}

const isWord = (t) => /^[a-z]+$/.test(t)
const isNumber = (t) => /^\d/.test(t)

// Does this clause start a new person? Yes for a name introduction, a relation word, or a leading name.
function startsPerson(clause, tokens) {
  if (/\bname\s*(?:is|:)|\bnamed\b/i.test(clause)) return true
  const first = tokens.find((t) => !FILLER_WORDS.has(t))
  if (!first) return false
  if (RELATION_WORDS.has(first)) return true
  return isWord(first) && !STOP_WORDS.has(first)
}

// Reads the name from the words that started a person. Stops at the first role word or number.
function nameFrom(tokens) {
  const words = []
  let i = 0
  while (i < tokens.length && (FILLER_WORDS.has(tokens[i]) || RELATION_WORDS.has(tokens[i]))) i++
  while (i < tokens.length && words.length < 3 && isWord(tokens[i]) && !STOP_WORDS.has(tokens[i])) {
    words.push(tokens[i])
    i++
  }
  return titleCase(words.join(' '))
}

function ageFrom(text) {
  const explicit = text.match(/\b(?:age|aged)\s*:?\s*(\d{1,3})\b/i)
    || text.match(/\b(\d{1,3})\s*(?:years?|yrs?|yo|y\/o)\b/i)
  if (explicit) return Number(explicit[1])
  // Bare numbers: ignore decimals, acres, lakh amounts and class numbers.
  const cleaned = text
    .replace(/\d+\.\d+/g, ' ')
    .replace(/\d+\s*(?:acres?|ac|lakhs?|lacs?|l)\b/gi, ' ')
    .replace(/(?:class|grade|std|standard|rs\.?|₹)\s*\d+/gi, ' ')
  const bare = cleaned.match(/(?<![\d.])(\d{1,3})(?![\d.])/)
  if (!bare) return null
  const n = Number(bare[1])
  return n <= 120 ? n : null
}

function landBandFrom(text) {
  let acres = null
  const num = text.match(/(\d+(?:\.\d+)?)\s*acres?\b/i)
  if (/half\s+an?\s+acre/i.test(text)) acres = 0.5
  else if (num) acres = parseFloat(num[1])
  else if (/\b(?:an?|one)\s+acre\b/i.test(text)) acres = 1
  if (acres === null || acres <= 0) return 'none'
  if (acres < 1) return 'lt_1ac'
  return acres <= 2.5 ? '1_2.5ac' : 'gt_2.5ac'
}

function studentLevelFrom(text) {
  if (/\b(?:college|university)\b/i.test(text)) return 'college'
  const cls = text.match(/\b(?:class|grade|std|standard)\s*(\d{1,2})\b/i)
    || text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:class|grade|standard|std)\b/i)
  if (!cls) return null
  const n = Number(cls[1])
  if (n <= 8) return 'school_1_8'
  if (n <= 12) return 'school_9_12'
  return null
}

function genderFrom(tokens) {
  if (tokens.some((t) => FEMALE_WORDS.has(t))) return 'female'
  if (tokens.some((t) => MALE_WORDS.has(t))) return 'male'
  return 'other'
}

// Household income from the whole text. Returns an income band or null when no amount is given.
function incomeBandFrom(text) {
  const money = text.match(/(?:rs\.?|\u20B9|rupees?)\s*(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|l)?(?![a-z])/i)
    || text.match(/(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|l)(?![a-z])/i)
  if (!money) return null
  let value = Number(money[1].replace(/,/g, ''))
  if (!Number.isFinite(value)) return null
  if (money[2] && /^l/i.test(money[2])) value *= 100000
  if (/\b(?:per\s+month|a\s+month|monthly)\b/i.test(text)) value *= 12
  if (value < 100000) return 'lt_1l'
  if (value < 250000) return '1l_2.5l'
  if (value <= 500000) return '2.5l_5l'
  return 'gt_5l'
}

// Splits the text into person blocks. A new block starts with a name, a relation, or the first clause.
// Attribute-only clauses (age, student, farmer) join the current person.
function groupPeople(text) {
  const clauses = text
    .split(/[,;!?\n]|\.(?!\d)|\s+and\s+/i)
    .map((c) => c.trim())
    .filter(Boolean)
  const people = []
  let current = null
  for (const clause of clauses) {
    const tokens = tokenize(clause)
    if (tokens.length === 0) continue
    const bareNumber = tokens.length === 1 && isNumber(tokens[0])
    const hasAge = current && current.age !== null
    if (!current || startsPerson(clause, tokens) || (bareNumber && hasAge)) {
      current = { clauses: [clause] }
      people.push(current)
    } else {
      current.clauses.push(clause)
    }
  }
  return people
}

// Turns the family text into members and a household income band.
// Returns { members, incomeBand } where incomeBand is null if no amount was given.
export function parseFamilyText(input) {
  const empty = { members: [], incomeBand: null }
  if (typeof input !== 'string' || input.trim() === '') return empty
  try {
    const people = groupPeople(input)
    const members = people.map((p, index) => {
      const text = p.clauses.join(' , ')
      const tokens = tokenize(text)
      const age = ageFrom(text)
      const landBand = landBandFrom(text)
      const isStudent = /\b(?:students?|studying|school|college|university)\b/i.test(text)
        || /\b(?:class|grade|std|standard)\s*\d+/i.test(text)
      return {
        id: `p_${index + 1}`,
        label: nameFrom(tokenize(p.clauses[0])),
        age,
        ageBand: deriveAgeBand(age),
        gender: genderFrom(tokens),
        isWidow: /\b(?:widow|widowed|widower)\b/i.test(text),
        isFarmer: /\b(?:farm|farms|farmer|farmers|farming|land|lands|landholding|acre|acres|plot|plots|hectares?|cultivat\w*|agricultur\w*)\b/i.test(text)
          || landBand !== 'none',
        isStudent,
        studentLevel: isStudent ? studentLevelFrom(text) : null,
        isDailyWage: /\b(?:daily\s*wages?|wage\s*workers?|labou?rers?|coolies?)\b/i.test(text),
        isDisabled: /\b(?:disabled|disability|handicapped|blind|deaf|wheelchair)\b/i.test(text),
        landBand,
      }
    })
    return { members, incomeBand: incomeBandFrom(input) }
  } catch {
    return empty
  }
}
