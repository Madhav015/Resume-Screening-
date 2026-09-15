// Small, dependency-free inline SVG icon set (24x24 viewBox, currentColor
// stroke) used across the app. Kept in one file instead of pulling in an
// icon package — a dozen simple line icons isn't worth a new dependency.

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconBriefcase(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="7" width="19" height="13" rx="2" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <path d="M2.5 13h19" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M2.75 19c0-3 2.8-5.25 6.25-5.25S15.25 16 15.25 19" />
      <path d="M15.5 5.6a3.25 3.25 0 0 1 0 6.3" />
      <path d="M17.75 13.9c2.6.5 4.5 2.4 4.5 5.1" />
    </svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4.5 15v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m4 12.5 5.5 5.5L20 6" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.75 2.75L16.5 9" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconXCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconAlertTriangle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.6 3.9 2.4 18.3A1.5 1.5 0 0 0 3.7 20.6h16.6a1.5 1.5 0 0 0 1.3-2.3L13.4 3.9a1.5 1.5 0 0 0-2.8 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 16.75h.01" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconLogOut(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.5 4.5H8a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h6.5" />
      <path d="M10.5 12h10.25" />
      <path d="m17.25 8.25 3.75 3.75-3.75 3.75" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.35-4.35" />
    </svg>
  );
}

export function IconSparkles(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11 3.5 12.6 8l4.4 1.6-4.4 1.6L11 15.7 9.4 11.2 5 9.6l4.4-1.6L11 3.5Z" />
      <path d="M18.5 14v4M16.5 16h4" />
    </svg>
  );
}

export function IconFileText(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5h7L18.5 8v11a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M8.5 13h7M8.5 16.25h4.5" />
    </svg>
  );
}

export function IconLoader({ className, ...rest }: IconProps) {
  return (
    <svg {...base} {...rest} className={`animate-spin ${className ?? ''}`}>
      <path d="M12 3v3.5" opacity="1" />
      <path d="M12 17.5V21" opacity="0.3" />
      <path d="m18.5 5.5-2.5 2.5" opacity="0.9" />
      <path d="m8 15.5-2.5 2.5" opacity="0.4" />
      <path d="M21 12h-3.5" opacity="0.8" />
      <path d="M6.5 12H3" opacity="0.5" />
      <path d="m18.5 18.5-2.5-2.5" opacity="0.6" />
      <path d="m8 8-2.5-2.5" opacity="0.7" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16M13 5l7 7-7 7" />
    </svg>
  );
}

export function IconCreditCard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 9.5h19" />
      <path d="M6 15h4" />
    </svg>
  );
}

export function IconTicket(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 9.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.25a1.75 1.75 0 0 0 0 3.5V15.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.25a1.75 1.75 0 0 0 0-3.5Z" />
      <path d="M9.5 7.5v9" strokeDasharray="2.2 2.2" />
    </svg>
  );
}
