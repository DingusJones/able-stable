# Architecture

```text
native API / direct RPC
        ↓
protocol adapter (transport + Zod schema + semantic mapping)
        ↓
canonical identity + validation + link resolver
        ↓
source run → raw evidence hash/R2 → normalized current/history/D1
        ↓
versioned Worker read API
        ↓
static React frontend
```

The demo path exercises the same adapter public methods but supplies deterministic payloads and does not write cloud storage. `worker/index.ts` defines the public API, cron queue producer, and bounded queue consumer boundary. `migrations/0001_initial.sql` defines current identity, source-run, observation, health, error, and raw-evidence tables. Cloud resources are placeholders and were not deployed.

Each adapter owns one source schema and mapping. Shared modules are restricted to identity, decimal math, freshness, evidence hashing, and official-domain link resolution. Independent results aggregate with partial-state semantics. Production transport must add deadlines, provider concurrency budgets, transient-only retries, `Retry-After`, and circuit-breaker persistence before live publication.

## Evidence chain

`opportunityId → sourceRunId → sourceId → source URL/contract → retrievedAt → rawPayloadHash → adapterVersion → schemaVersion`

Fixture hashes use a portable deterministic FNV marker and say so in the value. Production R2 writes must use WebCrypto SHA-256 over exact redacted bytes.

## Security boundaries

The browser reads only the product API. Provider URLs are registry-owned, provider text renders as text, output links require HTTPS and an allowlisted hostname, CORS is configured for one frontend origin, and secrets belong in Worker bindings. No wallet connection or transaction path exists.
