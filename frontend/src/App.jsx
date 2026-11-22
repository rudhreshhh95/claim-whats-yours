import { useCallback, useEffect, useRef, useState } from 'react';
import SmsDrawer from './components/SmsDrawer.jsx';
import VoiceModal from './components/VoiceModal.jsx';
import FamilyCards from './components/FamilyCards.jsx';
import ResultsPanel from './components/ResultsPanel.jsx';
import Catalogue from './components/Catalogue.jsx';
import Tracker from './components/Tracker.jsx';
import AdminRules from './components/AdminRules.jsx';
import { StatusPill } from './components/StatusPill.jsx';
import { BellIcon } from './components/Icons.jsx';
import { apiFetch, deleteMyData } from './lib/api.js';
import { parseFamilyText } from './lib/familyParser.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const QUICK_TAGS = ['Pension', 'Scholarship', 'Farming', 'Housing', 'Widow support'];
const TABS = [
  { id: 'find', label: 'Find Schemes' },
  { id: 'tracker', label: 'My Tracker' },
  { id: 'rules', label: 'Update Rules [Admin]' },
];

// Maps a parser member ({ label, ... }) onto the member shape the cards expect.
function toMember(m, index) {
  const age = m.age ?? null;
  const isStudent = !!m.isStudent;
  return {
    id: m.id ?? `m_${Date.now()}_${index}`,
    name: m.name ?? m.label ?? '',
    age,
    gender: m.gender ?? 'other',
    isStudent,
    // Auto-infer student level from age when the parser gave none.
    studentLevel: m.studentLevel || (isStudent ? (Number(age) >= 18 ? 'college' : 'school') : ''),
    isFarmer: !!m.isFarmer,
    isWidow: !!m.isWidow,
    isSenior: m.isSenior ?? (m.age != null && m.age >= 60),
    isDailyWage: !!m.isDailyWage,
  };
}

export default function App() {
  const [view, setView] = useState('find');
  const [live, setLive] = useState(false);

  const [smsOpen, setSmsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [intakeText, setIntakeText] = useState('');
  const [incomeBand, setIncomeBand] = useState('lt_1l');
  const [members, setMembers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trackerItems, setTrackerItems] = useState([]);
  const [messages, setMessages] = useState([]);
  const [token, setToken] = useState(null);
  const [offlineCatalogue, setOfflineCatalogue] = useState(false);
  const [toastText, setToastText] = useState(null);
  const [householdId] = useState(() => 'hh_' + Math.random().toString(36).slice(2, 10));
  const timerRef = useRef(null);
  // Household needs are the quick tags mentioned in the intake text (case-insensitive).
  const householdNeeds = QUICK_TAGS.filter((tag) =>
    intakeText.toLowerCase().includes(tag.toLowerCase())
  );

  const toast = useCallback((text) => {
    setToastText(text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToastText(null), 3000);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/health')
      .then(() => { if (!cancelled) setLive(true); })
      .catch(() => { if (!cancelled) setLive(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/schemes?source=all')
      .then((data) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.schemes) ? data.schemes : [];
        if (!cancelled) setSchemes(list);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  function clearAll() {
    setMembers([]);
    setMatches([]);
    setTrackerItems([]);
    setToken(null);
    setMessages([]);
    setIntakeText('');
  }

  async function handleDelete() {
    try {
      await deleteMyData(householdId, token);
    } catch {
      // Clear locally even if the server call fails.
    }
    clearAll();
    toast('Your data was deleted');
  }

  async function fillFamily() {
    try {
      const res = await apiFetch('/api/extract', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ text: intakeText, lang: 'en' }),
      });
      if (Array.isArray(res?.members)) {
        setMembers(res.members.map(toMember));
        return;
      }
      throw new Error('No members in response');
    } catch {
      const parsed = parseFamilyText(intakeText);
      setMembers(parsed.members.map(toMember));
    }
  }

  async function findSchemes() {
    setLoading(true);
    try {
      const result = await apiFetch('/api/match', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ household: { incomeBand, members }, members }),
      });
      setMatches(result?.matches ?? result ?? []);
    } catch {
      setMatches([]);
      toast('Could not load schemes. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function saveToTracker(match) {
    const item = {
      id: 'trk_' + Date.now() + Math.random().toString(36).slice(2, 6),
      memberId: match.memberId,
      memberName: match.memberName,
      schemeId: match.schemeId ?? match.id,
      schemeName: match.schemeName ?? match.name,
      title: match.title || match.name || match.schemeName,
      category: match.category || '',
      status: 'Not Started',
      targetDate: '',
    };
    setTrackerItems((prev) => [...prev, item]);
    try {
      await apiFetch('/api/tracker', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(item) });
    } catch {
      // Best effort: the local tracker already has the item.
    }
    toast('Saved to tracker');
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <h1 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <svg
                width="30"
                height="30"
                viewBox="0 0 32 32"
                aria-hidden="true"
                className="shrink-0"
              >
                <path
                  d="M16 2 L28 6 V15 C28 23 22.5 28 16 30 C9.5 28 4 23 4 15 V6 Z"
                  fill="#0D9488"
                />
                <path
                  d="M16 9 C12 12 11 16 12 20 C15 19 17.5 17 18 13 C18.5 11 17.5 10 16 9 Z"
                  fill="#ECFDF5"
                />
                <path d="M16 12 V23" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Urimai
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                Welfare Finder
              </span>
            </h1>

            <StatusPill live={live} />
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                aria-pressed={view === tab.id}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  view === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSmsOpen(true)}
              aria-label="Open notifications"
              className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
            >
              <BellIcon className="h-5 w-5" />
              {messages.length > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              Delete My Data
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {view === 'find' && (
          <>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-base font-bold text-emerald-900">
                Find every government scheme your family qualifies for — in seconds.
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                Speak or type your family details in Tamil or English. Get matched with verified Tamil Nadu &amp; Central welfare schemes and track your applications in one place — with zero sensitive IDs required.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-teal-200 bg-white px-2.5 py-0.5 text-xs font-medium text-teal-700">Tamil &amp; English Voice</span>
                <span className="rounded-full border border-teal-200 bg-white px-2.5 py-0.5 text-xs font-medium text-teal-700">Zero IDs Collected</span>
                <span className="rounded-full border border-teal-200 bg-white px-2.5 py-0.5 text-xs font-medium text-teal-700">Verified Schemes</span>
              </div>
            </div>


            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Tell us who is in your family</h2>
              <p className="mt-1 text-sm text-slate-500">
                Describe your family in a few words, or speak it in Tamil or English.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={intakeText}
                  onChange={(e) => setIntakeText(e.target.value)}
                  placeholder="e.g. Murugan 62 farmer, wife Selvi 58, son in class 9"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setVoiceOpen(true)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  Speak
                </button>

                <button
                  type="button"
                  onClick={fillFamily}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Fill Family Details
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setIntakeText((prev) => (prev.trim() ? `${prev.trim()} ${tag}` : tag))
                    }
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setOptionalOpen((v) => !v)}
                  aria-expanded={optionalOpen}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  {optionalOpen ? 'Hide' : 'Show'} Optional Details
                </button>
                {optionalOpen && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-700" htmlFor="income-band">
                      Annual household income
                    </label>
                    <select
                      id="income-band"
                      value={incomeBand}
                      onChange={(e) => setIncomeBand(e.target.value)}
                      className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="lt_1l">Below ₹1 lakh</option>
                      <option value="lt_3l">₹1–3 lakh</option>
                      <option value="gte_3l">Above ₹3 lakh</option>
                    </select>
                  </div>
                )}
              </div>
            </section>

            <FamilyCards members={members} setMembers={setMembers} />

            <div className="flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={findSchemes}
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? 'Searching…' : 'Find Schemes'}
              </button>
            </div>

            <ResultsPanel
              matches={matches}
              loading={loading}
              onSaveToTracker={saveToTracker}
              members={members}
              householdNeeds={householdNeeds}
            />

            {offlineCatalogue && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Showing offline catalogue
              </p>
            )}
            <Catalogue onFallback={() => setOfflineCatalogue(true)} />
          </>
        )}

        {view === 'tracker' && (
          <Tracker
            members={members}
            trackerItems={trackerItems}
            setTrackerItems={setTrackerItems}
            schemes={schemes}
          />
        )}

        {view === 'rules' && (
          <AdminRules
            household={{ members, incomeBand }}
            onNotify={(msgs) => {
              setMessages((prev) => [...prev, ...msgs]);
              toast('Families notified');
            }}
            onToast={toast}
            onMatches={(r) => setMatches(r?.matches ?? r ?? [])}
          />
        )}
      </main>

      <SmsDrawer
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        messages={messages}
        household={{ members, incomeBand }}
        token={token}
        setToken={setToken}
        onDeleted={() => {
          clearAll();
          toast('Your data was deleted');
        }}
      />

      <VoiceModal
        open={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onResult={(result) => {
          if (typeof result === 'string') {
            setIntakeText(result);
            return;
          }
          setIntakeText(result.text);
          if (Array.isArray(result.household?.members) && result.household.members.length > 0) {
            setMembers(result.household.members.map(toMember));
          }
        }}
      />

      {toastText && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          {toastText}
        </div>
      )}
    </div>
  );
}
