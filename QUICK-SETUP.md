# Quick Setup (Local)

## Prerequisites
- Node.js 18+
- npm 8+

## Install
```bash
npm install
```

## Configure Env
Copy `.env.example` to `.env.local` and fill values:
- Supabase URL + keys
- Stripe keys + webhook secret
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## Run
```bash
npm run dev
```
Open `http://localhost:3000`.

## Tests
```bash
npm run lint
npm run test -- --run
```

## Integration Tests (optional)
```bash
RUN_INTEGRATION_TESTS=true TEST_BASE_URL=http://127.0.0.1:3000 npm run test -- --run
```

## Stripe Webhook (local)
Use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```
Paste the `whsec_...` into `.env.local`.
