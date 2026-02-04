# Changelog

## [1.0.0] - 2026-02-04
### Added
- Admin users endpoint for authorized listings.
- Image optimization via Next.js Image with remotePatterns configuration.
- Integration test gating with `RUN_INTEGRATION_TESTS` and health checks.

### Changed
- Projects API aligned to live schema with safer fallbacks.
- Files API switched to `deliverables`/`downloads` tables.
- Stripe idempotency handling and server-side JSON parsing hardened.
- Purchases/vendor dashboards aligned to `amount_gross` and `seller_id` fields.

### Fixed
- Lint issues (unescaped entities, hook deps).
- Inconsistent schema references across API + UI.

### Tests
- `npm run lint`
- `npm run test -- --run`
- `RUN_INTEGRATION_TESTS=true TEST_BASE_URL=http://127.0.0.1:3000 npm run test -- --run`
