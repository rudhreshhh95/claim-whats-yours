// Inline SVG icon components. Each accepts a className prop (Tailwind classes).

const base = (className, children, strokeWidth = 2) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
);

export const ShieldIcon = ({ className = 'h-5 w-5' }) =>
  base(className, <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />);

export const BellIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  );

export const SpeakIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M11 5L6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </>
  );

export const CheckIcon = ({ className = 'h-5 w-5' }) =>
  base(className, <polyline points="20 6 9 17 4 12" />);

export const XIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  );

export const MicIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </>
  );

export const ChevronIcon = ({ className = 'h-5 w-5' }) =>
  base(className, <polyline points="9 18 15 12 9 6" />);

// Lucide-style outline icons (stroke width 1.75).
const thin = 1.75;

export const UserIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
    </>,
    thin
  );

export const CalendarIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>,
    thin
  );

export const UsersIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>,
    thin
  );

export const BriefcaseIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>,
    thin
  );

export const GraduationCapIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
      <line x1="22" y1="10" x2="22" y2="16" />
    </>,
    thin
  );

export const SproutIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M7 20h10" />
      <path d="M12 20v-8" />
      <path d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5z" />
      <path d="M12 14c0-3-2-5-5-5 0 3 2 5 5 5z" />
    </>,
    thin
  );

export const HouseIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </>,
    thin
  );

export const WalletIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>,
    thin
  );

export const SearchIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>,
    thin
  );

export const BookmarkCheckIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      <polyline points="9 10 11 12 15 8" />
    </>,
    thin
  );

export const SlidersHorizontalIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <line x1="21" y1="4" x2="14" y2="4" />
      <line x1="10" y1="4" x2="3" y2="4" />
      <line x1="21" y1="12" x2="12" y2="12" />
      <line x1="8" y1="12" x2="3" y2="12" />
      <line x1="21" y1="20" x2="16" y2="20" />
      <line x1="12" y1="20" x2="3" y2="20" />
      <line x1="14" y1="2" x2="14" y2="6" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="16" y1="18" x2="16" y2="22" />
    </>,
    thin
  );

export const Trash2Icon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </>,
    thin
  );

export const PlusIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>,
    thin
  );

export const BookmarkIcon = ({ className = 'h-5 w-5' }) =>
  base(className, <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />, thin);

export const ExternalLinkIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </>,
    thin
  );

export const SaveIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </>,
    thin
  );

export const PencilIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <line x1="12" y1="20" x2="21" y2="20" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </>,
    thin
  );

export const ClockIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>,
    thin
  );

export const Building2Icon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <line x1="10" y1="6" x2="14" y2="6" />
      <line x1="10" y1="10" x2="14" y2="10" />
      <line x1="10" y1="14" x2="14" y2="14" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </>,
    thin
  );

export const BadgeCheckIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M12 3l2.4 1.9 3-.2.9 2.9 2.6 1.6-1 2.8 1 2.8-2.6 1.6-.9 2.9-3-.2L12 21l-2.4-1.9-3 .2-.9-2.9-2.6-1.6 1-2.8-1-2.8 2.6-1.6.9-2.9 3 .2z" />
      <polyline points="9 12 11 14 15 10" />
    </>,
    thin
  );

export const ShieldCheckIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <polyline points="9 12 11 14 15 10" />
    </>,
    thin
  );

export const LockIcon = ({ className = 'h-5 w-5' }) =>
  base(
    className,
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>,
    thin
  );
