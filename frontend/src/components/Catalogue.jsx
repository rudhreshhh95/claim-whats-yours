import { useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { UnverifiedBadge } from './Badges.jsx';

const PAGE_SIZE = 20;

export default function Catalogue({ onFallback }) {
  const [schemes, setSchemes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  async function loadSchemes() {
    setLoading(true);
    setNotice('');
    try {
      const data = await apiFetch('/api/schemes?source=all');
      const list = Array.isArray(data) ? data : Array.isArray(data?.schemes) ? data.schemes : [];
      setSchemes(list);
      setLoaded(true);
    } catch (err) {
      if (err.network) {
        if (onFallback) onFallback();
        setSchemes([]);
        setNotice('Showing offline sample list');
      } else {
        setNotice(err.message || 'Could not load schemes');
      }
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schemes;
    return schemes.filter((s) =>
      `${s.name ?? ''} ${s.benefitSummary ?? ''}`.toLowerCase().includes(q)
    );
  }, [schemes, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearch(e) {
    setQuery(e.target.value);
    setPage(1);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={loadSchemes}
          disabled={loading}
          className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Load schemes'}
        </button>
        {notice && <p className="text-sm text-amber-700">{notice}</p>}
      </div>

      {loaded && (
        <input
          type="search"
          value={query}
          onChange={handleSearch}
          placeholder="Search by name or benefit"
          aria-label="Search schemes"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      )}

      {loaded && filtered.length === 0 && (
        <p className="text-sm text-slate-500">No schemes match your search.</p>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {visible.map((s, i) => (
          <li
            key={s.id ?? s.name ?? i}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">{s.name}</h3>
              {!s.verified && <UnverifiedBadge />}
            </div>
            {s.benefitSummary && (
              <p className="mt-2 text-sm text-slate-600">{s.benefitSummary}</p>
            )}
            {s.officialUrl && (
              <a
                href={s.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-emerald-700 underline hover:text-emerald-800"
              >
                Official page
              </a>
            )}
          </li>
        ))}
      </ul>

      {filtered.length > PAGE_SIZE && (
        <nav className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
}
