# Able Stable

Evidence-first stablecoin yield research. This repository contains a phone-first React frontend, a Cloudflare Worker API/scheduler/queue boundary, protocol-isolated ingestion adapters, canonical registries, D1 migrations, deterministic fixtures, and local test suites.

## Honest runtime status

The checked-in application runs in **fixture/demo mode**. Its six rates and liquidity values are deliberately illustrative and are always labeled as such in the API and UI. They are not scraped, inferred, or presented as current. Canonical USDC deployment identities come from Circle's official registry. No exact market action link is claimed: the fixture resolver exposes only allowlisted broad protocol destinations.

Production ingestion needs verified query contracts, reviewed market/deployment registries, provider/RPC credentials as applicable, D1/R2/Queue resources, exact-link browser fixtures, and provider terms review. DeFiLlama is not an adapter or data authority in this codebase.

## Local use

```bash
npm install
npm run dev
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run worker:dev
```

The frontend uses its local normalized fixture catalog unless `VITE_API_URL` points to a Worker. `wrangler dev` serves the API; its read endpoints are `/v1/catalog`, `/v1/opportunities/:id`, `/history`, `/assets`, `/chains`, `/protocols`, `/status`, and `/methodology`.

## Guarantees enforced locally

- EVM identity is chain ID + normalized 20-byte address; Solana identity is cluster + mint. Symbols never join records.
- Missing or malformed rates fail schema validation. Explicit string zero remains a real zero.
- APR is converted to APY only with known integer compounding; incompatible components have no calculated total.
- Every opportunity carries source/run/evidence lineage and an explicit freshness, confidence, and validation state.
- Official destinations are HTTPS and protocol-domain allowlisted. Missing mappings remain unavailable.
- Adapter failures can produce partial catalogs without deleting successful observations.
- Core, Degen, and CeFi modes are separate. The latter two remain honestly unavailable until approved data exists.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md), and [docs/METHODOLOGY.md](docs/METHODOLOGY.md).
