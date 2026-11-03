# NYVA SKIN — website

Storefront: catalogue, bag and checkout. **Checkout** asks the backend ([nvya-backend](https://github.com/softonic-tech/nvya-backend)) to create a Stripe Checkout page; after payment Stripe returns the customer here (`/?order=success`) and the site confirms the order with the backend.

## Run locally

```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm run dev
```

## Deploy to Vercel

1. Vercel → **Add New Project** → import this repo. Framework preset: **Vite** (detected automatically).
2. **Settings → Environment Variables**: `VITE_API_URL` = your backend URL, e.g. `https://api.nyvaskin.com`.
3. **Settings → Domains**: add your main domain, e.g. `nyvaskin.com`.
4. Redeploy after changing environment variables (Vite bakes them in at build time).

## Prices

Prices live in `src/catalog.ts`. Keep it identical to `src/catalog.ts` in the backend — the backend's copy is what Stripe charges.
