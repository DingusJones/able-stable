# Provider capability ledger

Status as researched on 2026-08-30. Reachability does not prove schema stability, commercial permission, quotas, or that a numeric quote applies to a given market.

| Adapter | Intended authority | Local capability | Publication status |
|---|---|---|---|
| Aave | Official API plus direct Pool/data-provider RPC | Protocol fixture parser | Live query and deployment map unverified; demo only |
| Morpho Blue | Official GraphQL/REST plus RPC cross-check | Protocol fixture parser | Public GraphQL documented; selected query and vault registry not live-tested here |
| Compound III | Official deployment artifacts plus direct Comet reads | Protocol fixture parser | RPC/deployment reads not configured; demo only |
| Moonwell Base | `api.moonwell.fi/v1/markets` plus RPC checks | Protocol fixture parser | Endpoint documented/reachable in plan research; current schema not accepted blindly |
| Kamino | Official API plus Solana RPC | Protocol fixture parser | Root/docs capability known; exact endpoint and unauthenticated quota unverified |
| Save/Solend | Official integration/API docs plus Solana RPC | Protocol fixture parser | Exact current endpoint and link mapping unverified |
| DeFiLlama | Discovery/cross-check only | No publishing adapter | Never authoritative; never creates identity or a destination |
| CeFi | Reproducible official public source only | Metadata/unavailable state | No universal public numeric feed approved |

Canonical USDC deployments used by fixtures were checked against [Circle's official contract list](https://developers.circle.com/stablecoins/usdc-contract-addresses). Compound documents that deployment artifacts live in its Comet repository. The official Morpho GraphQL endpoint and Circle list were reachable through current documentation research. Other provider capability assertions remain labeled unverified.

No USDT opportunity ships in the demo because a protocol market identity and rate observation were not jointly verified. This is intentional coverage honesty, not a claim that USDT markets do not exist.
