import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { SlidersHorizontalIcon, SaveIcon } from './Icons';

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

// Array-shaped rules: [{ field, op, value }, ...]. Maps an entry onto a form input key, or undefined.
const ARRAY_BOOL_FIELDS = { isFarmer: 'requiresFarmer', isStudent: 'requiresStudent', isWidow: 'requiresWidow' };

function formKeyFor(entry) {
  if (!entry || typeof entry !== 'object') return undefined;
  const { field, op, value } = entry;
  if (ARRAY_BOOL_FIELDS[field]) return ARRAY_BOOL_FIELDS[field];
  if (field === 'incomeMax') return 'incomeMax';
  if (field === 'incomeBand' && typeof value === 'number') return 'incomeMax';
  if (typeof field === 'string' && /^age/i.test(field)) {
    if (op === 'gte' || op === 'gt') return 'ageMin';
    if (op === 'lte' || op === 'lt') return 'ageMax';
  }
  return undefined;
}

// Array rules -> form values. Entries with no matching input are left out of the form state.
function rulesToForm(entries) {
  const out = {};
  for (const entry of entries) {
    const key = formKeyFor(entry);
    if (!key) continue;
    out[key] = CHECKBOX_FIELDS.includes(key) ? !!entry.value : Number(entry.value);
  }
  return out;
}

// Form values -> rules. Array-shaped rules are rebuilt keyed by each entry's `field`;
// entries without a populated form value keep their original value.
function rulesFromForm(source, values) {
  if (!Array.isArray(source)) return values;
  const out = {};
  for (const entry of source) {
    const key = formKeyFor(entry);
    const v = key ? values[key] : undefined;
    let next = entry.value;
    if (v !== undefined && v !== '') {
      next = CHECKBOX_FIELDS.includes(key) ? !!v : Number(v);
    }
    out[entry.field] = next;
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
          initial[scheme.id] = Array.isArray(scheme.rules)
            ? rulesToForm(scheme.rules)
            : pickRules(scheme.rules ?? scheme);
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
    const edited = rulesFromForm(scheme.rules, edits[id] ?? {});
    const members = household?.members ?? [];

    setSaving((prev) => ({ ...prev, [id]: true }));
    try {
      const putRes = await apiFetch(`/api/schemes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: edited }),
      });

      const response = await apiFetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ household, members }),
      });

      const newMessages = Array.isArray(putRes?.scheme?.newMessages) ? putRes.scheme.newMessages : [];

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
        const present = ALL_FIELDS.filter((key) =>
          Array.isArray(source)
            ? source.some((entry) => formKeyFor(entry) === key)
            : source && typeof source === 'object' && key in source
        );
        const values = edits[id] ?? {};
        const isSaving = !!saving[id];

        return (
          <div
            key={id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4"
          >
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <SlidersHorizontalIcon className="w-5 h-5 text-indigo-600" />
              {name}
            </h3>

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
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <SaveIcon className="w-4 h-4" />
              {isSaving ? 'Saving…' : 'Save & Notify Families'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default AdminRules;
