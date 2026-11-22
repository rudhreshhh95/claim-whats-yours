import { useState } from 'react'
import { LikelyBadge, CheckOfficeBadge } from './Badges.jsx'
import { BadgeCheckIcon, BookmarkIcon, ExternalLinkIcon } from './Icons.jsx'
import { scoreSchemeForMember } from '../utils/scoring.js'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'eligible', label: 'Likely Eligible' },
  { key: 'check', label: 'Check with Office' },
]

function normaliseStatus(status) {
  if (status === 'eligible' || status === 'likely') return 'eligible'
  if (status === 'check' || status === 'check_office') return 'check'
  return status
}

// Order: relevance desc, then Likely Eligible before Check with Office, then backend score desc.
function tierRank(m) {
  return normaliseStatus(m.status) === 'eligible' ? 0 : 1
}

function compareMatches(a, b) {
  return (
    (b.relevanceScore - a.relevanceScore) ||
    (tierRank(a) - tierRank(b)) ||
    (Number(b.score ?? 0) - Number(a.score ?? 0))
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.296a1 1 0 010 1.408l-7.5 7.5a1 1 0 01-1.408 0l-3.5-3.5a1 1 0 111.408-1.408L8.5 11.59l6.796-6.795a1 1 0 011.408 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function MatchCard({ match, onSaveToTracker }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const status = normaliseStatus(match.status)
  const schemeName = match.schemeName || match.name || 'Unnamed scheme'
  const passed = Array.isArray(match.passed) ? match.passed : []
  const documents = Array.isArray(match.documents) ? match.documents : []
  const applySteps = Array.isArray(match.applySteps) ? match.applySteps : []

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{schemeName}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {match.relevanceScore >= 60 && match.matchBadge && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <BadgeCheckIcon className="w-4 h-4" />
              {match.matchBadge}
            </span>
          )}
          {status === 'eligible' ? <LikelyBadge /> : <CheckOfficeBadge />}
        </div>
      </header>

      {match.benefitSummary && (
        <p className="mt-2 text-sm text-slate-600">{match.benefitSummary}</p>
      )}

      {passed.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {passed.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckIcon />
              <span>{rule.reason || rule.label}</span>
            </li>
          ))}
        </ul>
      )}

      {match.officialUrl && (
        <a
          href={match.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
        >
          <ExternalLinkIcon className="w-4 h-4" />
          Official scheme page
        </a>
      )}

      {match.lastVerified && (
        <p className="mt-1 text-xs text-slate-500">Last verified: {match.lastVerified}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSaveToTracker?.(match)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <BookmarkIcon className="w-4 h-4" />
          Save to Tracker
        </button>
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Documents &amp; How to Apply
          <ChevronIcon open={drawerOpen} />
        </button>
      </div>

      {drawerOpen && (
        <div className="mt-4 grid gap-4 rounded-2xl bg-[#F8FAFC] p-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Documents</h4>
            {documents.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {documents.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No documents listed.</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">How to Apply</h4>
            {applySteps.length > 0 ? (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {applySteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No application steps listed.</p>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

export default function ResultsPanel({ matches, loading, onSaveToTracker, members = [], householdNeeds = [] }) {
  const [filter, setFilter] = useState('all')
  const list = Array.isArray(matches) ? matches : []

  const filtered = list.filter((m) => filter === 'all' || normaliseStatus(m.status) === filter)

  const memberFor = (m) =>
    (Array.isArray(members) ? members : []).find(
      (x) => (m.memberId && x.id === m.memberId) || (m.memberName && x.name === m.memberName)
    ) || {}

  const scored = filtered.map((m) => {
    const { relevanceScore, matchBadge } = scoreSchemeForMember(m, memberFor(m), householdNeeds)
    return { ...m, relevanceScore, matchBadge }
  })

  const groups = []
  const byMember = new Map()
  scored.forEach((m) => {
    const label = m.memberName || m.memberId || 'Family member'
    if (!byMember.has(label)) {
      const group = { label, items: [] }
      byMember.set(label, group)
      groups.push(group)
    }
    byMember.get(label).items.push(m)
  })
  groups.forEach((group) => group.items.sort(compareMatches))

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter results">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {loading && (
        <p className="text-sm text-slate-600" role="status">
          Checking your family's schemes...
        </p>
      )}

      {!loading && list.length === 0 && (
        <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          No matches yet. Enter your family details and press See My Family's Schemes.
        </p>
      )}

      {list.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-slate-500">No schemes in this category.</p>
      )}

      {groups.map((group) => (
        <div key={group.label} className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">{group.label}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {group.items.map((m, i) => (
              <MatchCard
                key={`${m.memberId || m.memberName}-${m.schemeId || m.schemeName || i}-${i}`}
                match={m}
                onSaveToTracker={onSaveToTracker}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
