# kangaroo-shop Governance

Updated: 2026-05-26

## Positioning

`kangaroo-shop` and `kangaroo-japan` remain long-term parallel frontends.

- `kangaroo-shop`: China sourcing, global ecommerce, Brainrot/IP products, Stripe/PayPal flow.
- `kangaroo-japan`: Japan proxy-buying flow, inheriting and adapting existing DSR mini-program capabilities.

Do not merge the frontend products or treat one as a replacement for the other without a new explicit decision.

## Shared Backend Governance

Customer service, permissions, audit and admin workflow governance must converge on the shared `kangaroo-japan-backend` model.

For `kangaroo-shop`, do not create a separate model for:

- customer-service contract;
- customer account order-access boundaries;
- Hermes customer-service draft/review/send boundaries;
- admin RBAC and permission semantics;
- audit logging;
- order / warehouse / refund / support workflow handoff semantics.

These areas should follow the shared-console contract led by `kangaroo-japan-backend`.

## Project-Specific Boundaries

The following stay project-specific unless separately approved:

- storefront UI and brand experience;
- product source adapters;
- catalog/display strategy;
- payment provider implementation details;
- fulfillment strategy specific to China-sourcing ecommerce.

## Implementation Rule

Before adding support, permission, audit or admin-workflow features in `kangaroo-shop`, check the current `kangaroo-japan-backend` contract first.

If a requirement conflicts with the shared contract, record the conflict and escalate instead of forking a local model.

