// Shows whether the UI is reading from the live API or the mock fallback.

export function StatusPill({ live }) {
  const classes = live
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';
  const label = live ? 'Live API' : 'Mock Fallback';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-500' : 'bg-amber-500'}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
