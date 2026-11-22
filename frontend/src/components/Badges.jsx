// Status badges for eligibility results. Pill style, no external deps.

const pill = (classes, label) => (
  <span
    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${classes}`}
  >
    {label}
  </span>
);

export const LikelyBadge = () =>
  pill('border-emerald-200 bg-emerald-50 text-emerald-700', 'Likely Eligible');

export const CheckOfficeBadge = () =>
  pill('border-amber-200 bg-amber-50 text-amber-700', 'Check with Office');

export const UnverifiedBadge = () =>
  pill('border-slate-200 bg-slate-100 text-slate-600', 'Not yet verified');
