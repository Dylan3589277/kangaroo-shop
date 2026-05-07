type BrandLogoProps = {
  className?: string;
  compact?: boolean;
};

export function BrandLogo({ className = '', compact = false }: BrandLogoProps) {
  return (
    <span className={`brand-logo ${compact ? 'brand-logo-compact' : ''} ${className}`.trim()}>
      <svg
        className="brand-logo-mark"
        viewBox="0 0 48 48"
        role="img"
        aria-label="classe"
      >
        <rect x="4" y="6" width="40" height="34" rx="10" fill="var(--brand-sky)" />
        <path
          d="M17 16c3.8-5.2 10.7-4.7 13.9-.5 2.5 3.3 2.4 8.2.2 11.4l5.1 4.2-3.3 3.7-5.1-4.1c-2.7 1.7-6.1 2.1-9.1.8-5.1-2.1-7.1-8.5-3.9-13.4"
          fill="var(--brand-white)"
        />
        <path
          d="M25.7 21.9c2.5-.2 5.1 1.5 5.8 4.2.7 2.8-.8 5.6-3.5 6.7-2.5 1-5.9.5-8.5-1.2 2.4-.6 3.9-2 4.6-4.3.5-1.8.4-3.5 1.6-5.4Z"
          fill="var(--brand-sky)"
        />
        <path
          d="M15.7 15.7c-.9-3.1-2.3-5.5-4.4-7.1 3.2-.4 6.5 1.2 8.4 4.2"
          fill="none"
          stroke="var(--brand-white)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M29 15.2c1.4-2.6 3.8-4.3 6.8-4.8-1 2.5-1.7 5-1.8 7.5"
          fill="none"
          stroke="var(--brand-white)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M18.4 20.7c2.6-2.6 6.9-2.6 9.5 0"
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        <path
          d="M34.4 25.8c1-1.1 2.8-1.1 3.6.2.8-1.3 2.6-1.3 3.6-.2 1.2 1.4.2 3.7-3.6 5.8-3.8-2.1-4.8-4.4-3.6-5.8Z"
          fill="var(--brand-heart)"
        />
        <path
          d="M12 37c7.4 2.8 17.6 2.8 25.8 0"
          fill="none"
          stroke="var(--brand-sunline)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M8.8 33.8c2.6-1 4.6-2.7 5.9-5.2"
          fill="none"
          stroke="var(--brand-leaf)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="10.2" cy="31.7" r="1.9" fill="var(--brand-leaf)" />
        <circle cx="13.1" cy="29.3" r="1.5" fill="var(--brand-leaf)" />
      </svg>
      {!compact && (
        <span className="brand-logo-text">
          <span className="brand-logo-name">classe</span>
          <span className="brand-logo-slogan">全球好物，一站直达</span>
        </span>
      )}
    </span>
  );
}
