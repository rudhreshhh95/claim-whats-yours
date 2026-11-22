// Status badges for eligibility results. Pill style, no external deps.
import { BadgeCheckIcon, Building2Icon } from './Icons';

const pill = (classes, label, icon = null) => (
  <span
    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${classes}${icon ? ' gap-1' : ''}`}
  >
    {icon}
    {label}
  </span>
);

export const LikelyBadge = () =>
  pill(
    'border-emerald-200 bg-emerald-50 text-emerald-700',
    'Likely Eligible',
    <BadgeCheckIcon className="w-4 h-4" />
  );

export const CheckOfficeBadge = () =>
  pill(
    'border-amber-200 bg-amber-50 text-amber-700',
    'Check with Office',
    <Building2Icon className="w-4 h-4" />
  );

export const UnverifiedBadge = () =>
  pill('border-slate-200 bg-slate-100 text-slate-600', 'Not yet verified');
