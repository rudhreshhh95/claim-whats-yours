import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const NUMERIC_FIELDS = ['incomeMax', 'ageMin', 'ageMax'];
const CHECKBOX_FIELDS = ['requiresLand', 'requiresStudent', 'requiresFarmer', 'requiresWidow'];
const ALL_FIELDS = [...NUMERIC_FIELDS, ...CHECKBOX_FIELDS];

const FIELD_LABELS = {
  incomeMax: 'Max income',
  ageMin: 'Min age',
  ageMax: 'Max age',
  requiresLand: 'Requires land',
  requiresStudent: 'Requires student',
  requiresFarmer: 'Requires farmer',
  requiresWidow: 'Requires widow',
};

function pickRules(source) {
  const out = {};
  if (!source || typeof source !== 'object') return out;
  for (const key of ALL_FIELDS) {
    if (key in source) out[key] = source[key];
  }
  return out;
}

export function AdminRules({ household, onNotify, onToast, onMatches }) {
  const [schemes, setSchemes] = useState([]);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiFetch('/api/schemes');
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.schemes ?? [];
        setSchemes(list);
        const initial = {};
        for (const scheme of list) {
          initial[scheme.id] = pickRules(scheme.rules ?? scheme);
        }
        setEdits(initial);
      } catch (err) {
        if (!cancelled) {
          onToast?.(`Could not load schemes: ${err?.message || 'network error'}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (id, key, value) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), [key]: value } }));
  };

  const handleNumberChange = (id, key, raw) => {
    updateField(id, key, raw === '' ? '' : Number(raw));
  };

  const handleSave = async (scheme) => {
    const id = scheme.id;
    const name = scheme.name || scheme.title || id;
    const edited = edits[id] ?? {};
    const members = household?.members ?? [];

    setSaving((prev) => ({ ...prev, [id]: true }));
    try {
      await apiFetch(`/api/schemes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: edited }),
      });

      const response = await apiFetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ household, members }),
      });

      let newMessages = [];
      if (Array.isArray(response?.schemes)) {
        const match = response.schemes.find((s) => s?.id === id);
        newMessages = Array.isArray(match?.newMessages) ? match.newMessages : [];
      } else if (Array.isArray(response?.newMessages)) {
        newMessages = response.newMessages;
      }

      if (newMessages.length > 0) onNotify?.(newMessages);
      if (typeof onMatches === 'function') onMatches(response);

      onToast?.(`Rules saved and ${newMessages.length} family update(s) sent`);
    } catch (err) {
      onToast?.(`Failed to save "${name}": ${err?.message || 'network error'}`);
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading schemes…</p>;
  }

  if (schemes.length === 0) {
    return <p className="text-sm text-slate-500">No schemes available.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {schemes.map((scheme) => {
        const id = scheme.id;
        const name = scheme.name || scheme.title || id;
        const source = scheme.rules ?? scheme;
        const present = ALL_FIELDS.filter((key) => source && typeof source === 'object' && key in source);
        const values = edits[id] ?? {};
        const isSaving = !!saving[id];

        return (
          <div
            key={id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4"
          >
            <h3 className="text-lg font-semibold text-slate-900">{name}</h3>

            <div className="grid grid-cols-2 gap-3">
              {present.map((key) =>
                NUMERIC_FIELDS.includes(key) ? (
                  <label key={key} className="flex flex-col gap-1 text-sm text-slate-700">
                    {FIELD_LABELS[key]}
                    <input
                      type="number"
                      className="rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={values[key] ?? ''}
                      onChange={(e) => handleNumberChange(id, key, e.target.value)}
                    />
                  </label>
                ) : (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-indigo-600"
                      checked={!!values[key]}
                      onChange={(e) => updateField(id, key, e.target.checked)}
                    />
                    {FIELD_LABELS[key]}
                  </label>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => handleSave(scheme)}
              disabled={isSaving}
              className="mt-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving…' : 'Save & Notify Families'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default AdminRules;
