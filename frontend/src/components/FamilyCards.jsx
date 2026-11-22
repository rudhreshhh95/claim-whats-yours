const ROLES = [
  { key: 'isStudent', label: 'Student' },
  { key: 'isFarmer', label: 'Farmer' },
  { key: 'isWidow', label: 'Widow' },
  { key: 'isSenior', label: 'Senior 60+' },
  { key: 'isDailyWage', label: 'Daily Wage' },
];

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100';

// Student level inferred from age when a student has no level yet.
const studentLevelFor = age => (Number(age) >= 18 ? 'college' : 'school');

function XIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function FamilyCards({ members, setMembers }) {
  const updateMember = (id, patch) =>
    setMembers(prev => prev.map(m => (m.id === id ? { ...m, ...patch } : m)));

  const toggleRole = (id, key) =>
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== id) return m;
        if (key === 'isSenior') {
          // Turning Senior 60+ on lifts age to 60 if it is empty or below 60.
          // While age >= 60 the pill stays active.
          if (!m.isSenior) {
            return { ...m, isSenior: true, age: Number(m.age) >= 60 ? m.age : 60 };
          }
          return { ...m, isSenior: Number(m.age) >= 60 };
        }
        const next = !m[key];
        const patch = { ...m, [key]: next };
        // Auto-infer student level when a student has none yet.
        if (key === 'isStudent' && next && !m.studentLevel) {
          patch.studentLevel = studentLevelFor(m.age);
        }
        return patch;
      })
    );

  // Keep isSenior derived from age (>= 60) whenever age is edited.
  // Also infer studentLevel from age for students with no level yet.
  const changeAge = (id, value) =>
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== id) return m;
        const num = value === '' ? '' : Number(value);
        const patch = { ...m, age: num, isSenior: num !== '' && num >= 60 };
        if (m.isStudent && !m.studentLevel) {
          patch.studentLevel = studentLevelFor(num);
        }
        return patch;
      })
    );

  const addMember = () =>
    setMembers(prev => [
      ...prev,
      {
        id: 'm_' + Date.now(),
        name: '',
        age: '',
        gender: 'female',
        isStudent: false,
        isFarmer: false,
        isWidow: false,
        isSenior: false,
        isDailyWage: false,
      },
    ]);

  const removeMember = id =>
    setMembers(prev => prev.filter(m => m.id !== id));

  return (
    <div className="space-y-4">
      {members.map((m, idx) => (
        <div
          key={m.id}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Person {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => removeMember(m.id)}
              aria-label={`Remove person ${idx + 1}`}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
            >
              <XIcon />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-1">
              <span className="mb-1 block text-xs font-medium text-slate-600">Name</span>
              <input
                type="text"
                value={m.name}
                onChange={e => updateMember(m.id, { name: e.target.value })}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Age</span>
              <input
                type="number"
                min="0"
                value={m.age}
                onChange={e => changeAge(m.id, e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Gender</span>
              <select
                value={m.gender}
                onChange={e => updateMember(m.id, { gender: e.target.value })}
                className={inputClass}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {ROLES.map(role => {
              const on = !!m[role.key];
              return (
                <button
                  key={role.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRole(m.id, role.key)}
                  className={
                    'rounded-full border px-3 py-1 text-xs font-medium transition ' +
                    (on
                      ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
                  }
                >
                  {role.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addMember}
        className="w-full rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        + Add Another Person
      </button>
    </div>
  );
}
