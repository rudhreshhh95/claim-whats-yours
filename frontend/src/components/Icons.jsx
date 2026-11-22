// Inline SVG icon components. Each accepts a className prop (Tailwind classes).

const base = (className, children) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
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
