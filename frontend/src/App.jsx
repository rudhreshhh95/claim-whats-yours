import { useMemo, useState } from 'react'
import { sampleHousehold, schemes, sampleChatText, seedAlerts } from './mockData.js'

const CHIP_OPTIONS = ['Widow', 'Farmer', 'Student', 'Daily wage', 'Pension', 'Education']
const REPLY_TEXT = 'Got it. Tap Load Sample Family or add members below.'

const LAND_OPTIONS = [
  { value: 'none', label: 'No land' },
  { value: 'lt_1ac', label: 'Under 1 acre' },
  { value: '1_2.5ac', label: '1 to 2.5 acres' },
  { value: 'gt_2.5ac', label: 'Over 2.5 acres' },
]

const STUDENT_LEVEL_OPTIONS = [
  { value: 'school_1_8', label: 'Class 1 to 8' },
  { value: 'school_9_12', label: 'Class 9 to 12' },
  { value: 'college', label: 'College' },
]

const MEMBER_CHECKS = [
  ['isWidow', 'Widow'],
  ['isFarmer', 'Farmer'],
  ['isStudent', 'Student'],
  ['isDailyWage', 'Daily wage'],
]

const INCOME_LABELS = {
  lt_1l: 'under 1 lakh a year',
  '1l_2.5l': '1 to 2.5 lakh a year',
  '2.5l_5l': '2.5 to 5 lakh a year',
  gt_5l: 'over 5 lakh a year',
}

const INCOME_OPTIONS = Object.entries(INCOME_LABELS).map(([value, label]) => ({ value, label }))

const AGE_OPTIONS = [
  { value: '0_5', label: '0 to 5' },
  { value: '6_17', label: '6 to 17' },
  { value: '18_25', label: '18 to 25' },
  { value: '26_59', label: '26 to 59' },
  { value: '60_plus', label: '60 or older' },
]

const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
]

// Allowed values for fields that the Admin rule editor offers as choices.
const FIELD_OPTIONS = {
  incomeBand: INCOME_OPTIONS,
  landBand: LAND_OPTIONS,
  ageBand: AGE_OPTIONS,
  studentLevel: STUDENT_LEVEL_OPTIONS,
  gender: GENDER_OPTIONS,
}

const BOOL_FIELDS = ['isWidow', 'isStudent', 'isFarmer', 'isDisabled', 'isDailyWage']

const NAV_ITEMS = [
  ['intake', 'Intake'],
  ['results', 'Results'],
  ['tracker', 'Tracker'],
  ['admin', 'Admin'],
]

const STATUS_LABELS = {
  not_started: 'Not started',
  applied: 'Applied',
  approved: 'Approved',
  rejected: 'Rejected',
}

// Allowed next statuses. Approved and Rejected are terminal.
const NEXT_STATUS = {
  not_started: ['applied'],
  applied: ['approved', 'rejected'],
  approved: [],
  rejected: [],
}

const ALERT_TYPE_LABELS = {
  new_match: 'New match',
  rule_changed: 'Rule changed',
  deadline: 'Deadline',
}

const BTN = 'min-h-12 px-5 py-3 border-4 border-black font-bold text-lg'

// Maps a typed age to the ageBand values allowed in API.md.
function ageBandFor(age) {
  if (age === '' || Number.isNaN(Number(age))) return null
  const n = Number(age)
  if (n <= 5) return '0_5'
  if (n <= 17) return '6_17'
  if (n <= 25) return '18_25'
  if (n <= 59) return '26_59'
  return '60_plus'
}

function toNum(text) {
  return text === '' ? null : Number(text)
}

function splitList(text) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function cloneRules(rules) {
  return rules.map((r) => ({
    ...r,
    value: Array.isArray(r.value) ? [...r.value] : r.value,
  }))
}

// Tests one resolved field value against a rule. Returns true if the rule passes.
function testRule(value, rule) {
  switch (rule.op) {
    case 'eq':
      return value === rule.value
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(value)
    case 'lte':
      return rule.value != null && value <= rule.value
    case 'gte':
      return rule.value != null && value >= rule.value
    case 'between':
      return (
        Array.isArray(rule.value) &&
        rule.value[0] != null &&
        rule.value[1] != null &&
        value >= rule.value[0] &&
        value <= rule.value[1]
      )
    default:
      return false
  }
}

// Computes matches for every family member against every verified scheme.
// Field values come from the member if the member has that field, otherwise from the household.
// A missing value counts as unknown. Matches that are 'check' with nothing passed are dropped.
function computeMatches(members, incomeBand, rulesById) {
  const household = { incomeBand, needs: sampleHousehold.needs ?? [] }
  const result = []
  for (const member of members) {
    for (const scheme of schemes) {
      if (scheme.verified !== true) continue
      const rules = rulesById[scheme.id] ?? scheme.rules
      const passed = []
      const unknown = []
      let allPass = true
      for (const rule of rules) {
        const raw = rule.field in member ? member[rule.field] : household[rule.field]
        if (raw === undefined || raw === null) {
          unknown.push(rule.label)
          allPass = false
          continue
        }
        if (testRule(raw, rule)) passed.push(rule.label)
        else allPass = false
      }
      const status = allPass ? 'likely' : 'check'
      if (status === 'check' && passed.length === 0) continue
      const needScore = (scheme.needs ?? []).filter((n) => household.needs.includes(n)).length
      result.push({ schemeId: scheme.id, memberId: member.id, status, passed, unknown, needScore })
    }
  }
  return result
}

function StatusBadge({ status }) {
  if (status === 'likely') {
    return (
      <span className="inline-block bg-green-700 text-white font-bold px-3 py-1 border-2 border-black">
        Likely eligible
      </span>
    )
  }
  return (
    <span className="inline-block bg-amber-300 text-black font-bold px-3 py-1 border-2 border-black">
      Check with the office
    </span>
  )
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

// Input for one rule value. The control depends on the field and the operator.
function RuleValueControl({ rule, onChange }) {
  const { field, op, value } = rule
  const opts = FIELD_OPTIONS[field]
  const inputClass = 'mt-1 w-full border-4 border-black p-3 font-normal'

  if (op === 'between') {
    const [lo, hi] = Array.isArray(value) ? value : [null, null]
    return (
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          aria-label={`${rule.label}, from`}
          value={lo ?? ''}
          onChange={(e) => onChange([toNum(e.target.value), hi])}
          className={inputClass}
        />
        <input
          type="number"
          aria-label={`${rule.label}, to`}
          value={hi ?? ''}
          onChange={(e) => onChange([lo, toNum(e.target.value)])}
          className={inputClass}
        />
      </div>
    )
  }

  if (op === 'lte' || op === 'gte') {
    return (
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(toNum(e.target.value))}
        className={inputClass}
      />
    )
  }

  if (op === 'in' && opts) {
    const current = Array.isArray(value) ? value : []
    return (
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => (
          <label
            key={o.value}
            className="flex items-center gap-3 min-h-12 border-2 border-black p-2"
          >
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={current.includes(o.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...current, o.value]
                    : current.filter((v) => v !== o.value),
                )
              }
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    )
  }

  if (op === 'in') {
    // Fallback for fields without a known list: comma-separated text, saved on blur.
    return (
      <input
        type="text"
        defaultValue={Array.isArray(value) ? value.join(', ') : ''}
        onBlur={(e) => onChange(splitList(e.target.value))}
        className={inputClass}
      />
    )
  }

  if (op === 'eq' && BOOL_FIELDS.includes(field)) {
    return (
      <label className="flex items-center gap-3 min-h-12 border-2 border-black p-2">
        <input
          type="checkbox"
          className="h-6 w-6"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{value === true ? 'Yes' : 'No'}</span>
      </label>
    )
  }

  if (op === 'eq' && opts) {
    return (
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  // Fallback for any other field: plain text, saved on blur.
  return (
    <input
      type="text"
      defaultValue={value == null ? '' : String(value)}
      onBlur={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  )
}

// One card per verified scheme. Edits stay in a local draft until Save is pressed.
function SchemeRulesEditor({ scheme, rules, onSave }) {
  const [draft, setDraft] = useState(() => cloneRules(rules))

  function setValue(index, value) {
    setDraft((prev) => prev.map((r, i) => (i === index ? { ...r, value } : r)))
  }

  return (
    <section className="border-4 border-black p-4 space-y-4">
      <h2 className="text-2xl font-bold">{scheme.name}</h2>
      {draft.map((rule, i) => (
        <div key={i} className="border-2 border-black p-3 space-y-2">
          <p className="font-bold">{rule.label}</p>
          <RuleValueControl rule={rule} onChange={(v) => setValue(i, v)} />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onSave(scheme.id, draft)}
        className={`${BTN} w-full bg-black text-white`}
      >
        Save
      </button>
    </section>
  )
}

function App() {
  const [screen, setScreen] = useState('intake')
  const [helperMode, setHelperMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [selectedNeeds, setSelectedNeeds] = useState([])
  const [members, setMembers] = useState([])
  const [incomeBand, setIncomeBand] = useState(null)
  const [active, setActive] = useState(null) // { schemeId, memberId }
  const [checkedDocs, setCheckedDocs] = useState({}) // { [schemeId]: boolean[] }
  const [alerts, setAlerts] = useState(() => seedAlerts.map((a) => ({ ...a })))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tracker, setTracker] = useState([]) // [{ id, schemeId, memberId, status, deadline, checklistDone }]
  const [pickMember, setPickMember] = useState('')
  const [pickScheme, setPickScheme] = useState('')
  const [rulesById, setRulesById] = useState(() =>
    Object.fromEntries(schemes.map((s) => [s.id, cloneRules(s.rules)])),
  )

  const textSize = helperMode ? 'text-xl' : 'text-lg'

  function sendMessage() {
    const text = draft.trim()
    if (!text) return
    setChatMessages((prev) => [
      ...prev,
      { from: 'you', text },
      { from: 'app', text: REPLY_TEXT },
    ])
    setDraft('')
  }

  function toggleNeed(label) {
    setSelectedNeeds((prev) =>
      prev.includes(label) ? prev.filter((n) => n !== label) : [...prev, label],
    )
  }

  function loadSample() {
    setMembers(sampleHousehold.members.map((m) => ({ ...m })))
    setIncomeBand(sampleHousehold.incomeBand)
  }

  function addMember() {
    setMembers((prev) => [
      ...prev,
      {
        id: 'm' + Date.now(),
        label: '',
        age: '',
        ageBand: null,
        isWidow: false,
        isStudent: false,
        isFarmer: false,
        isDailyWage: false,
        landBand: 'none',
      },
    ])
  }

  function updateMember(id, patch) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  function changeAge(id, value) {
    const age = value === '' ? '' : Number(value)
    updateMember(id, { age, ageBand: ageBandFor(age) })
  }

  // Removing a member also removes their tracker items, so nothing is left orphaned.
  function removeMember(id) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    setTracker((prev) => prev.filter((t) => t.memberId !== id))
  }

  function openDetail(schemeId, memberId) {
    setActive({ schemeId, memberId })
    setScreen('detail')
  }

  function toggleDoc(schemeId, index) {
    setCheckedDocs((prev) => {
      const current = prev[schemeId] ?? []
      const next = [...current]
      next[index] = !current[index]
      return { ...prev, [schemeId]: next }
    })
  }

  function appendAlert(type, text) {
    setAlerts((prev) => [
      ...prev,
      { id: 'a' + Date.now() + Math.random().toString(36).slice(2, 7), type, text, read: false },
    ])
  }

  function toggleMessages() {
    const next = !drawerOpen
    setDrawerOpen(next)
    if (next) setAlerts((prev) => prev.map((a) => (a.read ? a : { ...a, read: true })))
  }

  function saveRules(schemeId, rules) {
    setRulesById((prev) => ({ ...prev, [schemeId]: cloneRules(rules) }))
    const scheme = schemes.find((s) => s.id === schemeId)
    appendAlert('rule_changed', `Rule changed: ${scheme?.name ?? schemeId} rules updated. Check your matches.`)
  }

  // Mock of DELETE /api/me: clears family, tracker and messages, then returns to intake.
  function deleteMyData() {
    setMembers([])
    setIncomeBand(null)
    setTracker([])
    setAlerts([])
    setChatMessages([])
    setSelectedNeeds([])
    setActive(null)
    setCheckedDocs({})
    setPickMember('')
    setPickScheme('')
    setDrawerOpen(false)
    setScreen('intake')
  }

  const verifiedSchemes = schemes.filter((s) => s.verified === true)
  const unreadCount = alerts.filter((a) => !a.read).length

  // Matches are computed from the current members, income and rules, so edits update Results at once.
  const matches = useMemo(
    () => computeMatches(members, incomeBand, rulesById),
    [members, incomeBand, rulesById],
  )

  // Only members still in the family list are shown, and only if they have matches.
  const groups = members
    .map((member) => ({
      member,
      matches: matches
        .filter((m) => m.memberId === member.id)
        .map((match) => ({
          match,
          scheme: schemes.find((s) => s.id === match.schemeId),
        }))
        .filter((x) => x.scheme),
    }))
    .filter((g) => g.matches.length > 0)

  const pickedMemberId = members.some((m) => m.id === pickMember)
    ? pickMember
    : (members[0]?.id ?? '')
  const pickedSchemeId = verifiedSchemes.some((s) => s.id === pickScheme)
    ? pickScheme
    : (verifiedSchemes[0]?.id ?? '')

  function addTracker() {
    if (!pickedMemberId || !pickedSchemeId) return
    if (tracker.some((t) => t.memberId === pickedMemberId && t.schemeId === pickedSchemeId)) return
    setTracker((prev) => [
      ...prev,
      {
        id: 't' + Date.now(),
        schemeId: pickedSchemeId,
        memberId: pickedMemberId,
        status: 'not_started',
        deadline: '',
        checklistDone: false,
      },
    ])
  }

  function updateTracker(id, patch) {
    setTracker((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  function removeTracker(id) {
    setTracker((prev) => prev.filter((t) => t.id !== id))
  }

  const trackerGroups = members
    .map((member) => ({ member, items: tracker.filter((t) => t.memberId === member.id) }))
    .filter((g) => g.items.length > 0)

  const activeScheme = active ? schemes.find((s) => s.id === active.schemeId) : null
  const activeMatch = active
    ? matches.find((m) => m.schemeId === active.schemeId && m.memberId === active.memberId)
    : null
  const activeChecked = activeScheme ? (checkedDocs[activeScheme.id] ?? []) : []

  return (
    <div className={`min-h-screen bg-white text-black ${textSize}`}>
      <header className="border-b-4 border-black">
        <div className="mx-auto max-w-2xl flex flex-wrap items-center justify-between gap-3 p-4">
          <nav aria-label="Main" className="flex flex-wrap gap-2">
            {NAV_ITEMS.map(([key, label]) => {
              const on = screen === key
              return (
                <button
                  key={key}
                  type="button"
                  aria-current={on ? 'page' : undefined}
                  onClick={() => setScreen(key)}
                  className={`${BTN} px-4 ${on ? 'bg-black text-white' : 'bg-white text-black'}`}
                >
                  {label}
                </button>
              )
            })}
          </nav>
          <button
            type="button"
            aria-expanded={drawerOpen}
            aria-label={`Messages, ${unreadCount} unread`}
            onClick={toggleMessages}
            className={`${BTN} relative px-4 bg-white text-black`}
          >
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute -top-3 -right-3 bg-black text-white text-sm font-bold px-2 border-2 border-black">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-8 p-4">
        {drawerOpen && (
          <section className="border-4 border-black p-4 space-y-4">
            <h2 className="text-2xl font-bold">Simulated SMS to sample number.</h2>
            {alerts.length === 0 && <p>No messages.</p>}
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className="border-2 border-black p-3 space-y-1">
                  <p className="font-bold">
                    {a.read ? 'Read' : 'Unread'} · {ALERT_TYPE_LABELS[a.type] ?? a.type}
                  </p>
                  <p>{a.text}</p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={deleteMyData}
              className={`${BTN} w-full bg-white text-black`}
            >
              Delete my data
            </button>
          </section>
        )}

        {screen === 'intake' && (
          <>
            <section className="space-y-4">
              <h1 className="text-3xl font-bold leading-tight">
                Find schemes for your family.
              </h1>
              <button
                type="button"
                aria-pressed={helperMode}
                onClick={() => setHelperMode((v) => !v)}
                className={`${BTN} w-full ${helperMode ? 'bg-black text-white' : 'bg-white text-black'}`}
              >
                Helper mode
              </button>
              {helperMode && (
                <p className="font-bold">Helper mode on: bigger text and simple words.</p>
              )}
            </section>

            <section className="border-4 border-black p-4 space-y-4">
              <div className="space-y-2">
                {chatMessages.map((m, i) => (
                  <p
                    key={i}
                    className={`p-3 border-2 border-black ${
                      m.from === 'you' ? 'bg-black text-white ml-8' : 'mr-8'
                    }`}
                  >
                    {m.text}
                  </p>
                ))}
              </div>
              <label htmlFor="chat-input" className="block font-bold">
                Tell us about your family
              </label>
              <textarea
                id="chat-input"
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={sampleChatText}
                className="w-full border-4 border-black p-3 text-lg"
              />
              <button
                type="button"
                onClick={sendMessage}
                className={`${BTN} w-full bg-black text-white`}
              >
                Send
              </button>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-bold">Quick needs</h2>
              <div className="flex flex-wrap gap-3">
                {CHIP_OPTIONS.map((label) => {
                  const on = selectedNeeds.includes(label)
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleNeed(label)}
                      className={`${BTN} ${on ? 'bg-black text-white' : 'bg-white text-black'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              <p>
                Selected needs: {selectedNeeds.length ? selectedNeeds.join(', ') : 'None yet.'}
              </p>
            </section>

            <section className="space-y-3">
              <button
                type="button"
                onClick={loadSample}
                className={`${BTN} w-full bg-white text-black`}
              >
                Load Sample Family
              </button>
              {incomeBand && (
                <p>Family income: {INCOME_LABELS[incomeBand] ?? incomeBand}.</p>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold">Family members</h2>
              {members.length === 0 && (
                <p>No members yet. Load the sample family or add one.</p>
              )}
              {members.map((m, i) => (
                <div key={m.id} className="border-4 border-black p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold">Member {i + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      className={`${BTN} px-4`}
                    >
                      Remove
                    </button>
                  </div>

                  <label className="block font-bold">
                    Name
                    <input
                      type="text"
                      value={m.label}
                      onChange={(e) => updateMember(m.id, { label: e.target.value })}
                      className="mt-1 w-full border-4 border-black p-3 font-normal"
                    />
                  </label>

                  <label className="block font-bold">
                    Age
                    <input
                      type="number"
                      min="0"
                      value={m.age}
                      onChange={(e) => changeAge(m.id, e.target.value)}
                      className="mt-1 w-full border-4 border-black p-3 font-normal"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {MEMBER_CHECKS.map(([key, text]) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 min-h-12 border-2 border-black p-2"
                      >
                        <input
                          type="checkbox"
                          className="h-6 w-6"
                          checked={Boolean(m[key])}
                          onChange={(e) => updateMember(m.id, { [key]: e.target.checked })}
                        />
                        <span>{text}</span>
                      </label>
                    ))}
                  </div>

                  <label className="block font-bold">
                    Land
                    <select
                      value={m.landBand}
                      onChange={(e) => updateMember(m.id, { landBand: e.target.value })}
                      className="mt-1 w-full border-4 border-black p-3 font-normal"
                    >
                      {LAND_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {m.isStudent && (
                    <label className="block font-bold">
                      Class level
                      <select
                        value={m.studentLevel ?? ''}
                        onChange={(e) => updateMember(m.id, { studentLevel: e.target.value })}
                        className="mt-1 w-full border-4 border-black p-3 font-normal"
                      >
                        <option value="" disabled>
                          Choose a class
                        </option>
                        {STUDENT_LEVEL_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addMember}
                className={`${BTN} w-full bg-white text-black`}
              >
                Add member
              </button>
            </section>

            <button
              type="button"
              onClick={() => setScreen('results')}
              className={`${BTN} w-full bg-black text-white text-xl`}
            >
              See my schemes
            </button>
          </>
        )}

        {screen === 'results' && (
          <section className="space-y-6">
            <button
              type="button"
              onClick={() => setScreen('intake')}
              className={`${BTN} bg-white text-black`}
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold">Your schemes</h1>

            {groups.length === 0 && (
              <p>No matches yet. Add members on the first screen.</p>
            )}

            {groups.map(({ member, matches: memberMatches }) => (
              <section key={member.id} className="space-y-3">
                <h2 className="text-2xl font-bold">{member.label || 'Family member'}</h2>
                {memberMatches.map(({ match, scheme }) => (
                  <div key={match.schemeId} className="border-4 border-black">
                    <button
                      type="button"
                      onClick={() => openDetail(match.schemeId, match.memberId)}
                      className="w-full text-left p-4 space-y-3"
                    >
                      <p className="text-xl font-bold">{scheme.name}</p>
                      <StatusBadge status={match.status} />
                      <ul className="space-y-1">
                        {match.passed.map((rule) => (
                          <li key={rule}>
                            <span className="font-bold text-green-700">✓</span> {rule}
                          </li>
                        ))}
                      </ul>
                    </button>
                    <div className="border-t-4 border-black p-4 space-y-2">
                      <a
                        href={scheme.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-lg font-bold underline break-all"
                      >
                        {scheme.officialUrl}
                      </a>
                      <p>Last verified: {scheme.lastVerified}</p>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </section>
        )}

        {screen === 'detail' && (
          <section className="space-y-6">
            <button
              type="button"
              onClick={() => setScreen('results')}
              className={`${BTN} bg-white text-black`}
            >
              ← Back to results
            </button>

            {!activeScheme && <p>Scheme not found.</p>}

            {activeScheme && (
              <>
                <h1 className="text-3xl font-bold leading-tight">{activeScheme.name}</h1>
                {activeMatch && <StatusBadge status={activeMatch.status} />}
                <p className="text-xl">{activeScheme.benefit}</p>
                <p>Last verified: {activeScheme.lastVerified}</p>
                <a
                  href={activeScheme.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-lg font-bold underline break-all"
                >
                  {activeScheme.officialUrl}
                </a>

                <section className="space-y-3">
                  <h2 className="text-2xl font-bold">Documents to bring</h2>
                  {activeScheme.documents.map((doc, i) => (
                    <label
                      key={doc}
                      className="flex items-center gap-4 min-h-12 border-4 border-black p-4"
                    >
                      <input
                        type="checkbox"
                        className="h-7 w-7"
                        checked={Boolean(activeChecked[i])}
                        onChange={() => toggleDoc(activeScheme.id, i)}
                      />
                      <span className="text-lg">{doc}</span>
                    </label>
                  ))}
                </section>

                <section className="space-y-3">
                  <h2 className="text-2xl font-bold">How to apply</h2>
                  <ol className="list-decimal pl-6 space-y-3 text-lg">
                    {activeScheme.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </section>
              </>
            )}
          </section>
        )}

        {screen === 'tracker' && (
          <section className="space-y-6">
            <h1 className="text-3xl font-bold">Tracker</h1>

            {members.length === 0 ? (
              <p>Load the sample family or add a member first.</p>
            ) : (
              <div className="border-4 border-black p-4 space-y-4">
                <label className="block font-bold">
                  Family member
                  <select
                    value={pickedMemberId}
                    onChange={(e) => setPickMember(e.target.value)}
                    className="mt-1 w-full border-4 border-black p-3 font-normal"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label || 'Family member'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block font-bold">
                  Scheme
                  <select
                    value={pickedSchemeId}
                    onChange={(e) => setPickScheme(e.target.value)}
                    className="mt-1 w-full border-4 border-black p-3 font-normal"
                  >
                    {verifiedSchemes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={addTracker}
                  className={`${BTN} w-full bg-black text-white`}
                >
                  Add to tracker
                </button>
              </div>
            )}

            {members.length > 0 && trackerGroups.length === 0 && (
              <p>No schemes tracked yet.</p>
            )}

            {trackerGroups.map(({ member, items }) => (
              <section key={member.id} className="space-y-3">
                <h2 className="text-2xl font-bold">{member.label || 'Family member'}</h2>
                {items.map((item) => {
                  const scheme = schemes.find((s) => s.id === item.schemeId)
                  const next = NEXT_STATUS[item.status] ?? []
                  return (
                    <div key={item.id} className="border-4 border-black p-4 space-y-3">
                      <p className="text-xl font-bold">{scheme?.name ?? item.schemeId}</p>
                      <label className="block font-bold">
                        Status
                        <select
                          value={item.status}
                          disabled={next.length === 0}
                          onChange={(e) => updateTracker(item.id, { status: e.target.value })}
                          className="mt-1 w-full border-4 border-black p-3 font-normal"
                        >
                          <option value={item.status}>{STATUS_LABELS[item.status]}</option>
                          {next.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block font-bold">
                        Deadline
                        <input
                          type="date"
                          value={item.deadline}
                          onChange={(e) => updateTracker(item.id, { deadline: e.target.value })}
                          className="mt-1 w-full border-4 border-black p-3 font-normal"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeTracker(item.id)}
                        className={`${BTN} px-4 bg-white text-black`}
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </section>
            ))}
          </section>
        )}

        {screen === 'admin' && (
          <section className="space-y-6">
            <h1 className="text-3xl font-bold">Admin</h1>
            <p>Edit the rules for verified schemes. Results update when you save.</p>
            {verifiedSchemes.map((s) => (
              <SchemeRulesEditor
                key={s.id}
                scheme={s}
                rules={rulesById[s.id] ?? []}
                onSave={saveRules}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

export default App
