import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { CheckIcon } from './Icons.jsx';

const STATUS_STEPS = ['Not Started', 'Applied', 'Approved'];

function groupByMember(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.memberId ?? item.memberName ?? 'unknown';
    if (!groups.has(key)) {
      groups.set(key, { key, name: item.memberName || 'Family member', items: [] });
    }
    groups.get(key).items.push(item);
  }
  return Array.from(groups.values());
}

export default function Tracker({ members = [], trackerItems = [], setTrackerItems, schemes = [] }) {
  const [notice, setNotice] = useState('');

  // Load tracker items from the server on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch('/api/tracker');
        if (cancelled) return;
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setTrackerItems(list);
      } catch (err) {
        if (cancelled) return;
        if (err?.network) setNotice('Saved locally (offline)');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setTrackerItems]);

  function updateLocal(id, changes) {
    setTrackerItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...changes } : it))
    );
  }

  async function changeItem(item, changes) {
    const next = { status: item.status, targetDate: item.targetDate, ...changes };
    updateLocal(item.id, next);
    try {
      await apiFetch(`/api/tracker/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next.status, targetDate: next.targetDate }),
      });
    } catch (err) {
      if (err?.network) setNotice('Change saved locally (offline)');
    }
  }

  async function removeItem(item) {
    // Optimistically remove from local state first.
    setTrackerItems((prev) => prev.filter((it) => it.id !== item.id));
    try {
      await apiFetch(`/api/tracker/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    } catch (err) {
      if (err?.network) setNotice('Removed locally (offline)');
      // Re-sync from the server so local state does not drift from it.
      try {
        const data = await apiFetch('/api/tracker');
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setTrackerItems(list);
      } catch {
        // Keep the optimistic state if the server cannot be reached.
      }
    }
  }

  const groups = groupByMember(trackerItems);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Scheme tracker</h2>
        {notice && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            {notice}
          </span>
        )}
      </div>

      {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No schemes tracked yet.
        </p>
      )}

      {groups.map((group) => {
        const member = members.find((m) => String(m.id) === String(group.key));
        return (
          <div key={group.key} className="space-y-3">
            <h3 className="text-base font-semibold text-indigo-600">
              {member?.name || group.name}
            </h3>

            {group.items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium">
                    {item.title || item.schemeTitle || item.scheme?.title || item.name || schemes.find((s) => s.id === item.schemeId)?.title || item.schemeId || 'Saved Welfare Scheme'}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="rounded-lg px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 inline-flex overflow-hidden rounded-xl border border-slate-200" role="group">
                  {STATUS_STEPS.map((step) => {
                    const active = item.status === step;
                    return (
                      <button
                        key={step}
                        type="button"
                        aria-pressed={active}
                        onClick={() => changeItem(item, { status: step })}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition ${
                          active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {active && <CheckIcon className="h-3.5 w-3.5" />}
                        {step}
                      </button>
                    );
                  })}
                </div>

                <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  Target date
                  <input
                    type="date"
                    value={item.targetDate || ''}
                    onChange={(e) => changeItem(item, { targetDate: e.target.value })}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-slate-800 focus:border-indigo-600 focus:outline-none"
                  />
                </label>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
