/** Lightweight inline SVG icon set — no new dependencies. */
const PATHS: Record<string, React.ReactNode> = {
  dashboard: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10"
    />
  ),
  assessment: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 11l3 3 8-8M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9"
    />
  ),
  agent: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zm7 11l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"
    />
  ),
  plan: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 20l-5.5-2.5v-13L9 7l6-2.5L20.5 7v13L15 17.5 9 20zm0 0V7m6 8.5V5"
    />
  ),
  resources: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 19.5A2.5 2.5 0 016.5 17H20V4H6.5A2.5 2.5 0 004 6.5v13zM4 19.5A2.5 2.5 0 006.5 22H20v-5"
    />
  ),
  progress: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 17l6-6 4 4 8-8M15 7h6v6"
    />
  ),
  report: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17v-6m4 6V7m4 10v-3M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  ),
  login: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
    />
  ),
  logout: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
    />
  ),
  menu: <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />,
  close: <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />,
  arrowRight: <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />,
  arrowLeft: <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m6 6l-6-6 6-6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7v5l3 2" />
    </>
  ),
  external: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
    />
  ),
  refresh: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a9 9 0 11-2.6-6.4M21 3v6h-6"
    />
  ),
  alert: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"
    />
  ),
  eye: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zm10 3a3 3 0 100-6 3 3 0 000 6z"
    />
  ),
  eyeOff: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.94 17.94A10.6 10.6 0 0112 19c-6.5 0-10-7-10-7a17.6 17.6 0 014.06-4.94M9.9 5.1A10.4 10.4 0 0112 5c6.5 0 10 7 10 7a17.7 17.7 0 01-2.16 3.19M14.12 14.12A3 3 0 119.88 9.88M2 2l20 20"
    />
  ),
  book: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.5C10.5 5 8.5 4.5 4 4.5v15c4.5 0 6.5.5 8 2 1.5-1.5 3.5-2 8-2v-15c-4.5 0-6.5.5-8 2zm0 0v15"
    />
  ),
  play: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 4l14 8-14 8V4z" />
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
