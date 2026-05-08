type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  slogan?: string;
};

export function BrandLogo({ className = '', compact = false, slogan }: BrandLogoProps) {
  return (
    <span className={`brand-logo ${compact ? 'brand-logo-compact' : ''} ${className}`.trim()}>
      <svg
        className="brand-logo-mark"
        viewBox="0 0 48 48"
        role="img"
        aria-label="classe"
      >
        <rect x="5" y="6" width="38" height="36" rx="11" fill="var(--brand-sky)" />
        <path
          d="M35 17.6c-2.4-4.2-7.2-6.6-12.2-5.7-6.2 1.1-10.5 6.8-9.8 13.1.7 6.5 6.7 11.2 13.2 10.2 3.8-.6 6.8-2.8 8.6-5.8"
          fill="none"
          stroke="var(--brand-white)"
          strokeWidth="5.2"
          strokeLinecap="round"
        />
        <path
          d="M34.6 17.8c-2.2-3.5-6.5-5.5-10.9-4.7-5.5 1-9.3 6-8.6 11.6.7 5.8 6 9.9 11.7 9 3.2-.5 5.9-2.4 7.6-4.9"
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
        <rect
          x="21.2"
          y="18.9"
          width="9.8"
          height="9.8"
          rx="2.4"
          fill="var(--brand-white)"
        />
        <path
          d="M21.7 22.2h8.8M26.1 19.2v9.1"
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M13.2 31.6c6.5-1.2 13.7-4.4 19.9-9.9"
          fill="none"
          stroke="var(--brand-sunline)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M31.2 20.1l3.8-.3-.3 3.8"
          fill="none"
          stroke="var(--brand-sunline)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17.3 17.2c4.8-1.9 10.1-1.9 14.6.1M16 30.2c4.1 1.8 9.5 1.8 14.3.1"
          fill="none"
          stroke="var(--brand-white)"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.72"
        />
        <path
          d="M37.4 27.6c.8 2.1.4 4.7-1.1 6.6"
          fill="none"
          stroke="var(--brand-leaf)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {!compact && (
        <span className="brand-logo-text">
          <span className="brand-logo-name">classe</span>
          {slogan && <span className="brand-logo-slogan">{slogan}</span>}
        </span>
      )}
    </span>
  );
}
