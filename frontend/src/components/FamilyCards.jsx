import {
  UserIcon,
  CalendarIcon,
  UsersIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  SproutIcon,
  Trash2Icon,
  PlusIcon,
} from './Icons';

const ROLES = [
  { key: 'isStudent', label: 'Student', Icon: GraduationCapIcon },
  { key: 'isFarmer', label: 'Farmer', Icon: SproutIcon },
  { key: 'isWidow', label: 'Widow', Icon: UserIcon },
  { key: 'isSenior', label: 'Senior 60+', Icon: UserIcon },
  { key: 'isDailyWage', label: 'Daily Wage', Icon: BriefcaseIcon },
];

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100';

const labelClass = 'mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600';

// Student level inferred from age when a student has no level yet.
const studentLevelFor = age => (Number(age) >= 18 ? 'college' : 'school');

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
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between pb-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Person {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => removeMember(m.id)}
              aria-label={`Remove person ${idx + 1}`}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
            >
              <Trash2Icon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <label className="block sm:col-span-1">
              <span className={labelClass}>
                <UserIcon className="w-4 h-4" />
                Name
              </span>
              <input
                type="text"
                value={m.name}
                onChange={e => updateMember(m.id, { name: e.target.value })}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                <CalendarIcon className="w-4 h-4" />
                Age
              </span>
              <input
                type="number"
                min="0"
                value={m.age}
                onChange={e => changeAge(m.id, e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                <UsersIcon className="w-4 h-4" />
                Gender
              </span>
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

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {ROLES.map(role => {
              const on = !!m[role.key];
              const { Icon } = role;
              return (
                <button
                  key={role.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleRole(m.id, role.key)}
                  className={
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ' +
                    (on
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')
                  }
                >
                  <Icon className="w-4 h-4" />
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
      >
        <PlusIcon className="w-4 h-4" />
        Add Another Person
      </button>
    </div>
  );
}
