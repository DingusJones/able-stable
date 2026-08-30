# Provider capability ledger

Status as researched on 2026-08-30. Reachability does not prove schema stability, commercial permission, quotas, or that a numeric quote applies to a given market.

| Adapter | Intended authority | Local capability | Publication status |
|---|---|---|---|
| Aave Base | `api.v3.aave.com/graphql` | Live official markets query, runtime schema, Base market/chain and canonical-address filters | Enabled in live mode; schema drift or no exact native-USDC match produces an explicit provider failure/empty state |
| Morpho Blue | `api.morpho.org/graphql` | Live Base/listed-market query, runtime schema, address filter | Enabled in live mode; actual observations depend on provider validation at request time |
| Morpho Vaults | `api.morpho.org/graphql` | Listed Base vaults filtered and revalidated for canonical native USDC; provider net APY, TVL, and vault liquidity | Lending-only rows with exact address routes; live counts are snapshots and are not hard-coded |

Morpho Blue normalization validates both loan and collateral asset chain/address identities. Canonical USDC as loan asset produces a lender-supply row; canonical USDC as collateral produces a borrow row with its counter asset, LLTV, oracle address, and role-specific borrow APY when available. Missing role-specific rates are quarantined rather than converted to zero.
| Compound III Base | Direct Comet reads | Isolated explicit-unavailable live adapter | Requires independently verified `COMPOUND_BASE_COMET` and reviewed ABI read; no row today |
| Moonwell Base | `api.moonwell.fi/v1/markets?chain=base` | Live request, runtime schema, address filter | Enabled in live mode; schema drift produces provider error, never zero |
| Seamless | Native source required | Explicit unavailable; DeFiLlama may only supply an advisory row with complete identity/link evidence | Operational status and native source not validated |
| Kamino | Official API plus Solana RPC | Protocol fixture parser | Root/docs capability known; exact endpoint and unauthenticated quota unverified |
| Save/Solend | Official integration/API docs plus Solana RPC | Protocol fixture parser | Exact current endpoint and link mapping unverified |
| DeFiLlama | Discovery/cross-check only | Advisory fallback adapter with strict Base/address/project/link gates | Never authoritative; symbols are ignored for identity |
| CeFi | Reproducible official public source only | Metadata/unavailable state | No universal public numeric feed approved |

Canonical USDC deployments used by fixtures were checked against [Circle's official contract list](https://developers.circle.com/stablecoins/usdc-contract-addresses). Compound documents that deployment artifacts live in its Comet repository. The official Morpho GraphQL endpoint and Circle list were reachable through current documentation research. Other provider capability assertions remain labeled unverified.

The live endpoint is deliberately restricted to Base native USDC. No USDT opportunity ships because a protocol market identity and rate observation were not jointly verified. This is coverage honesty, not a missing-market claim.
