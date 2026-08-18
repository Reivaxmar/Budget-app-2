import React from 'react';

// Small, consistent line-icon set for the sidebar navigation. Deliberately
// built from plain rects/circles/lines rather than a dependency — the icon
// set is tiny and fixed, so pulling in an icon library would be overkill.

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const DashboardIcon: React.FC = () => (
  <svg {...base}>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="13" width="8" height="8" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
  </svg>
);

export const EstimatesIcon: React.FC = () => (
  <svg {...base}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <line x1="8" y1="8" x2="16" y2="8" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="8" y1="16" x2="13" y2="16" />
  </svg>
);

export const CustomersIcon: React.FC = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c0-4 3.5-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
  </svg>
);

export const ItemLibraryIcon: React.FC = () => (
  <svg {...base}>
    <rect x="4" y="9" width="16" height="11" rx="1.5" />
    <path d="M4 9l4-5.5h8L20 9" />
    <line x1="4" y1="9" x2="20" y2="9" />
  </svg>
);

export const TemplatesIcon: React.FC = () => (
  <svg {...base}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="9" x2="9" y2="21" />
  </svg>
);

export const CompanyProfileIcon: React.FC = () => (
  <svg {...base}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="3" y1="13" x2="21" y2="13" />
  </svg>
);

export const SettingsIcon: React.FC = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    {[0, 60, 120, 180, 240, 300].map((deg) => (
      <line key={deg} x1="12" y1="4" x2="12" y2="6.5" transform={`rotate(${deg} 12 12)`} />
    ))}
  </svg>
);
