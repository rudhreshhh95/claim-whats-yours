import { useState } from 'react'
import { sampleHousehold, schemes, sampleMatches, sampleChatText } from './mockData.js'

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

function App() {
  const [screen, setScreen] = useState('intake')
  const [helperMode, setHelperMode] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([])
  const [selectedNeeds, setSelectedNeeds] = useState([])
  const [members, setMembers] = useState([])
  const [incomeBand, setIncomeBand] = useState(null)
  const [active, setActive] = useState(null) // { schemeId, memberId }
  const [checkedDocs, setCheckedDocs] = useState({}) // { [schemeId]: boolean[] }

  const textSize = helperMode ? 'text-xl' : 'text-lg'

  function sendMessage() {
    const text = draft.trim()
    if (!text) return
    setMessages((prev) => [
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

  function removeMember(id) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
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

  // Matching is mocked: results come from sampleMatches, not from a real /api/match call.
  // Only members still in the family list are shown, and only if they have matches.
  const groups = members
    .map((member) => ({
      member,
      matches: sampleMatches
        .filter((m) => m.memberId === member.id)
        .map((match) => ({
          match,
          scheme: schemes.find((s) => s.id === match.schemeId),
        }))
        .filter((x) => x.scheme),
    }))
    .filter((g) => g.matches.length > 0)

  const activeScheme = active ? schemes.find((s) => s.id === active.schemeId) : null
  const activeMatch = active
    ? sampleMatches.find(
        (m) => m.schemeId === active.schemeId && m.memberId === active.memberId,
      )
    : null
  const activeChecked = activeScheme ? (checkedDocs[activeScheme.id] ?? []) : []

  return (
    <div className={`min-h-screen bg-white text-black ${textSize}`}>
      <div className="mx-auto max-w-2xl space-y-8 p-4">
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
                {messages.map((m, i) => (
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

            {groups.map(({ member, matches }) => (
              <section key={member.id} className="space-y-3">
                <h2 className="text-2xl font-bold">{member.label || 'Family member'}</h2>
                {matches.map(({ match, scheme }) => (
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
      </div>
    </div>
  )
}

export default App
