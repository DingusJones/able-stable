# Provider capability ledger

Status as researched on 2026-08-30. Reachability does not prove schema stability, commercial permission, quotas, or that a numeric quote applies to a given market.

| Adapter | Intended authority | Local capability | Publication status |
|---|---|---|---|
| Aave Base | `api.v3.aave.com/graphql` | Live official markets query, runtime schema, Base market/chain and canonical-address filters | Enabled in live mode; schema drift or no exact native-USDC match produces an explicit provider failure/empty state |
| Morpho Blue | `api.morpho.org/graphql` | Live Base/listed-market query, runtime schema, address filter | Enabled in live mode; actual observations depend on provider validation at request time |
| Morpho Vaults V1 + V2 | `api.morpho.org/graphql` | Separate listed Base native-USDC queries: V1 `vaults` uses `state.netApy`, `state.totalAssetsUsd`, `liquidity.usd`; V2 `vaultV2s` uses `avgNetApy`/`avgNetApyExcludingRewards`, `totalAssetsUsd`, `liquidityUsd` | Lending-only rows with typed version and exact address routes; listed-only excludes unlisted/test/junk vaults; live counts are snapshots |

Morpho Vault V1 and V2 responses are parsed against their distinct official shapes and merged without name-based deduplication. Only an exact duplicate normalized vault address is collapsed. Missing required APY is quarantined rather than fabricated as zero; optional TVL or liquidity remains unavailable when absent. Morpho Blue normalization likewise validates both loan and collateral asset chain/address identities. Canonical USDC as loan asset produces a lender-supply row; canonical USDC as collateral produces a borrow row with its counter asset, LLTV, oracle address, and role-specific borrow APY when available.
| Compound III Base | Direct Comet reads | Isolated explicit-unavailable live adapter | Requires independently verified `COMPOUND_BASE_COMET` and reviewed ABI read; no row today |
| Moonwell Base | `api.moonwell.fi/v1/markets?chain=base` | Live request, runtime schema, address filter | Enabled in live mode; schema drift produces provider error, never zero |
| Seamless | Native source required | Explicit unavailable; DeFiLlama may only supply an advisory row with complete identity/link evidence | Operational status and native source not validated |
| Kamino | Official API plus Solana RPC | Protocol fixture parser | Root/docs capability known; exact endpoint and unauthenticated quota unverified |
| Save/Solend | Official integration/API docs plus Solana RPC | Protocol fixture parser | Exact current endpoint and link mapping unverified |
| DeFiLlama | Discovery/cross-check only | Advisory fallback adapter with strict Base/address/project/link gates | Never authoritative; symbols are ignored for identity |
| CeFi | Reproducible official public source only | Metadata/unavailable state | No universal public numeric feed approved |

Canonical USDC deployments used by fixtures were checked against [Circle's official contract list](https://developers.circle.com/stablecoins/usdc-contract-addresses). Compound documents that deployment artifacts live in its Comet repository. The official Morpho GraphQL endpoint and Circle list were reachable through current documentation research. Other provider capability assertions remain labeled unverified.

The live endpoint is deliberately restricted to Base native USDC. No USDT opportunity ships because a protocol market identity and rate observation were not jointly verified. This is coverage honesty, not a missing-market claim.
