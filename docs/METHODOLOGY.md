# Methodology

Able Stable ranks evidence quality ahead of breadth. A publishable live record needs canonical chain/asset/protocol/opportunity identity, a validated protocol-native observation, independently reviewable risk and liquidity context, explicit freshness, and a verified destination. Aggregators may discover or cross-check; they cannot supply identity by symbol matching.

Rates remain decimal strings until display. Base and reward yield are separate. Provider totals are retained but not recreated when methodologies or time windows differ. APR becomes APY only when compounding is known. Forecast, historical, and fixed-to-maturity rates require separate presentation.

For Morpho on Base, product semantics are normalized fields rather than inferred from display text. The official API separates Morpho Vault V1 discovery (`vaults`) from Morpho Vault V2 discovery (`vaultV2s`), so both listed-only fields are queried independently and every normalized vault records `vaultVersion`. V1 and V2 rows are merged by exact contract address only, never by name. Listed-only is intentional: unlisted, test, and junk deployments do not become opportunities merely to increase coverage. A Morpho Blue market with USDC as its loan asset shows Lender supply APY. A market with USDC as collateral shows Borrow APY, the borrowed counter asset, and liquidation/LLTV/oracle warnings. Canonical chain and address identity are required throughout.

Freshness states are live, recently updated, cached, stale, partial, unavailable, and unverified. Provider failure is never an empty success or zero. Last-known-good data may remain only with its exact age and warning and is excluded from best-current sorting.

Risk is dimensional: contracts, stablecoin/depeg, liquidity/exit, oracle, admin, bridge, custody/counterparty, leverage, rewards, and lockup/maturity. Core is a category, not a safety guarantee. Degen and CeFi are intentionally separate from Core.

## Demo data

Fixture values are synthetic test inputs. They verify parsing, explicit zero handling, decomposition, filtering, responsive rendering, evidence traversal, and failure states. They must never be copied into a production database as observations.
