# Able Stable

Evidence-first stablecoin yield research. This repository contains a phone-first React frontend, a Cloudflare Worker API/scheduler/queue boundary, protocol-isolated ingestion adapters, canonical registries, D1 migrations, deterministic fixtures, and local test suites.

## Honest runtime status

Morpho on Base uses separate official GraphQL discovery queries for listed Morpho Vault V1 (`vaults`) and Morpho Vault V2 (`vaultV2s`), plus Morpho Blue markets. Vault rows are lending-only and carry an explicit V1/V2 marker; market rows are classified by whether canonical Base USDC is the loan asset (lend USDC) or collateral asset (borrow another asset against USDC). Listed-only filtering intentionally excludes unlisted/test deployments. The product filter defaults to All, and live counts are snapshots rather than hard-coded expectations.

The checked-in Wrangler configuration remains **fixture/demo mode by default**. Set `DEMO_MODE=false` only on a Worker that is intended to make live requests. In live mode, `GET /v1/catalog?mode=core&chain=base&asset=usdc` concurrently calls isolated Aave, Morpho, Moonwell, and advisory DeFiLlama adapters. Valid observations survive other-provider failures. No validated rows returns HTTP 503 with `status: "unavailable"`; mixed results return HTTP 206 with `status: "partial"`. Provider failure is never represented as zero or an empty successful catalog.

Aave uses its official GraphQL markets query and requires the AaveV3Base market, Base chain IDs, and canonical native-USDC address; its app-root link remains visibly unverified because no exact asset route was proven. Morpho V1 uses `state.netApy`, `state.totalAssetsUsd`, and `liquidity.usd`; V2 uses its top-level `avgNetApy` (falling back to `avgNetApyExcludingRewards`), `totalAssetsUsd`, and `liquidityUsd`. Both require Base and canonical native-USDC identity. Moonwell likewise requires the contract address, so deprecated bridged USDC cannot match by symbol. DeFiLlama is advisory and publishes only with complete evidence.

This phase performs request-time ingestion and returns evidence in the response. Durable D1/R2 history and queue persistence are still deployment prerequisites. Do not describe the public Pages site as live until a Worker with `DEMO_MODE=false` is deployed, probed, and its URL is supplied to the Pages build.

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

The frontend uses its local normalized fixture catalog unless `VITE_API_URL` points to a Worker. GitHub Pages reads this from the repository Actions variable `VITE_API_URL`; if absent, the build deliberately remains fixture-only. `wrangler dev` serves the API. Worker variables are documented in `.env.example`; the reserved Compound RPC configuration does not cause an unverified read.

## Guarantees enforced locally

- EVM identity is chain ID + normalized 20-byte address; Solana identity is cluster + mint. Symbols never join records.
- Missing or malformed rates fail schema validation. Explicit string zero remains a real zero.
- APR is converted to APY only with known integer compounding; incompatible components have no calculated total.
- Every opportunity carries source/run/evidence lineage and an explicit freshness, confidence, and validation state.
- Official destinations are HTTPS and protocol-domain allowlisted. Missing mappings remain unavailable.
- Adapter failures can produce partial catalogs without deleting successful observations.
- Core, Degen, and CeFi modes are separate. The latter two remain honestly unavailable until approved data exists.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md), and [docs/METHODOLOGY.md](docs/METHODOLOGY.md).
