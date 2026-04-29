# Global Commerce P1 Implementation Notes

Date: 2026-04-29

## Implemented

- Locale routing now prefers explicit user choice via `NEXT_LOCALE` / `preferredLocale` cookies.
- First visit without a locale uses deployment/CDN country headers:
  - `JP` -> `ja`
  - `CN`, `HK`, `MO`, `TW` -> `zh`
  - all other countries -> `en`
- Frontend positioning copy and metadata now describe Kangaroo Shop as a cross-border commerce site sourcing/importing products from China for Japan, Europe, North America and global markets.
- Admin product publishing P1 is implemented for the self-owned storefront:
  - `POST /api/admin/platform-listings`
  - `platform: "own"` with `action: "publish" | "unpublish"` updates `products.is_active` and records an `own` listing status.
- Rakuten/Amazon publishing remains preview/template-only:
  - `platform: "rakuten" | "amazon"` returns a stub template payload.
  - No external marketplace API calls are made.
- Brand theme tokens are isolated in `src/app/[locale]/brand-theme.css`.
- Brand colors have been updated from the provided logo / visual reference:
  - airy aqua background: `--brand-sky`, `--brand-sky-soft`
  - white lettering: `--brand-white`
  - pink heart: `--brand-heart`
  - warm orange underline: `--brand-sunline`
  - natural vine green: `--brand-leaf`
  - darker aqua `--brand-primary` remains the main interactive color for readable buttons/links.

## Logo Theme Notes

- Source image shows a clean summer/Japanese-style sign: pale aqua base, white dimensional wordmark, pink heart, orange underline and fresh green leaves.
- The website should keep the palette fresh and premium, not overly childish. Therefore the bright logo colors are used as background/accent tokens, while the primary CTA uses a deeper aqua for accessibility.
- Future real logo asset placement should stay centralized under the site header/brand components; color changes should continue to go through `src/app/[locale]/brand-theme.css` instead of hard-coded page-level colors.

## Still Blocked

- Actual logo image file is still needed if the header should display an image asset instead of text/wordmark styling.
- Rakuten RMS real publishing requires RMS credentials, upload format confirmation, logging requirements and explicit approval.
- Amazon real publishing requires SP-API credentials, marketplace IDs, feed type confirmation and explicit approval.
- External marketplace write operations must keep preview, confirmation, logs and retry/error handling before production enablement.
