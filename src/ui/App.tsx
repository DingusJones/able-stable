import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCatalog } from "../api";
import { assetById, chainById, coverage } from "../data/registry";
import { percent, usd } from "../domain/rates";
import type { CatalogResponse, Mode, Opportunity } from "../domain/types";

export type MorphoFilter = "all" | "vaults" | "lend-usdc" | "borrow-usdc";
const BASE_CHAIN_ID = "eip155:8453";

export function matchesMorphoFilter(o: Opportunity, filter: MorphoFilter) {
  if (filter === "all") return true;
  if (o.protocolId !== "morpho" || o.chainId !== BASE_CHAIN_ID) return false;
  if (filter === "vaults") return o.productType === "vault";
  if (filter === "lend-usdc")
    return o.productType === "market" && o.usdcRole === "lending_asset";
  return o.productType === "market" && o.usdcRole === "collateral_asset";
}

const modes: { id: Mode; label: string; sub: string }[] = [
  { id: "core", label: "Core DeFi", sub: "Established lending markets" },
  { id: "degen", label: "Degen DeFi", sub: "Curated, differentiated risk" },
  { id: "cefi", label: "CeFi", sub: "Custodial products" },
];
function ageLabel(o: Opportunity) {
  return o.evidence.demo
    ? "Fixture snapshot"
    : o.freshness.ageSeconds === undefined
      ? "Age unavailable"
      : `${Math.floor(o.freshness.ageSeconds / 60)}m ago`;
}
function rate(o: Opportunity) {
  if (o.totalQuotedApy)
    return {
      value: percent(o.totalQuotedApy),
      basis: o.displayRateLabel ?? "Provider total APY",
    };
  if (o.baseApy !== undefined)
    return {
      value: percent(o.baseApy),
      basis: o.displayRateLabel ?? "Base APY",
    };
  return { value: percent(o.baseApr), basis: o.displayRateLabel ?? "Base APR" };
}

export function App() {
  const [mode, setMode] = useState<Mode>("core"),
    [data, setData] = useState<CatalogResponse>(),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [chain, setChain] = useState("all"),
    [rewards, setRewards] = useState(false),
    [sort, setSort] = useState("liquidity"),
    [morphoFilter, setMorphoFilter] = useState<MorphoFilter>("all"),
    [selected, setSelected] = useState<string[]>([]),
    [detail, setDetail] = useState<Opportunity>();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("able-stable-theme") === "dark";
    } catch {
      return false;
    }
  });
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    fetchCatalog(mode, c.signal)
      .then(setData)
      .catch((e) => e.name !== "AbortError" && setError(e.message))
      .finally(() => setLoading(false));
    return () => c.abort();
  }, [mode]);
  useEffect(() => {
    if (detail) setTimeout(() => closeRef.current?.focus(), 0);
  }, [detail]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetail(undefined);
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    try {
      window.localStorage.setItem(
        "able-stable-theme",
        darkMode ? "dark" : "light",
      );
    } catch {
      // The toggle remains usable when storage is unavailable.
    }
  }, [darkMode]);
  const hasMorphoBase = (data?.opportunities ?? []).some(
    (o) =>
      o.protocolId === "morpho" &&
      o.chainId === BASE_CHAIN_ID &&
      o.productType !== undefined,
  );
  const morphoBaseEnabled = chain === "all" || chain === BASE_CHAIN_ID;
  const shown = useMemo(() => {
    let a = [...(data?.opportunities ?? [])].filter((o) => {
      const asset = assetById[o.assetId];
      return (
        (!morphoBaseEnabled || matchesMorphoFilter(o, morphoFilter)) &&
        (!query ||
          `${o.protocolName} ${o.name} ${asset?.symbol} ${asset?.addressOrMint} ${o.counterAsset?.symbol ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (chain === "all" || o.chainId === chain) &&
        (!rewards || o.rewardComponents.length > 0)
      );
    });
    if (sort === "liquidity")
      a.sort(
        (x, y) =>
          Number(y.availableLiquidityUsd ?? -1) -
          Number(x.availableLiquidityUsd ?? -1),
      );
    else
      a.sort(
        (x, y) =>
          Number(y.baseApy ?? y.baseApr ?? -1) -
          Number(x.baseApy ?? x.baseApr ?? -1),
      );
    return a;
  }, [data, query, chain, rewards, sort, morphoFilter, morphoBaseEnabled]);
  const compared = (data?.opportunities ?? []).filter((o) =>
    selected.includes(o.id),
  );
  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : s.length < 4
          ? [...s, id]
          : s,
    );
  }
  return (
    <div className="app" data-theme={darkMode ? "dark" : "light"}>
      <header className="hero">
        <nav aria-label="Primary">
          <a className="brand" href="#top">
            <span className="mark">A</span>Able Stable
          </a>
          <div className="nav-actions">
            <a href="#methodology">Methodology</a>
            <button
              className="theme-toggle"
              type="button"
              aria-pressed={darkMode}
              aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
              onClick={() => setDarkMode((enabled) => !enabled)}
            >
              <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
              {darkMode ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </nav>
        <div className="hero-copy">
          <p className="eyebrow">STABLECOIN YIELD, WITH RECEIPTS</p>
          <h1>
            Know what your yield
            <br />
            is <em>made of.</em>
          </h1>
          <p className="lede">
            Compare stablecoin opportunities without guessed rates, fuzzy
            matches, or mystery links. Every number carries identity, context,
            and evidence.
          </p>
          <div className="trust">
            <span>
              <i />
              Canonical assets
            </span>
            <span>
              <i />
              Native sources first
            </span>
            <span>
              <i />
              No wallet required
            </span>
          </div>
        </div>
      </header>
      <main id="top">
        <section className="status-strip" aria-live="polite">
          <div>
            <span className="status-icon">◷</span>
            <div>
              <b>
                {data?.demoMode !== false
                  ? "Demonstration catalog"
                  : data.status === "unavailable"
                    ? "Live catalog unavailable"
                    : "Live Base USDC catalog"}
              </b>
              <small>
                {data?.demoMode !== false
                  ? "Illustrative fixture data · not live rates"
                  : `${data.status} · providers queried at ${data.catalogAsOf}`}
              </small>
            </div>
          </div>
          <div className="status-metrics">
            <span>
              <b>{data?.summary.total ?? "—"}</b>{" "}
              {data?.demoMode !== false
                ? "approved fixtures"
                : "validated observations"}
            </span>
            <span>
              <b>{data?.adapters?.length ?? 6}</b> isolated adapters
            </span>
            {data?.summary.unavailableProviders.length ? (
              <span className="warning">
                {data.summary.unavailableProviders.length} sources unavailable
              </span>
            ) : null}
          </div>
        </section>
        <section className="explore" aria-labelledby="explore-heading">
          <div className="section-head">
            <div>
              <p className="eyebrow">EXPLORE</p>
              <h2 id="explore-heading">Compare opportunities</h2>
            </div>
            <p>
              Rates are snapshots, not promises. Fixture values below solely
              exercise the product.
            </p>
          </div>
          <div className="tabs" role="tablist" aria-label="Opportunity type">
            {modes.map((m) => (
              <button
                role="tab"
                aria-selected={mode === m.id}
                className={mode === m.id ? "active" : ""}
                onClick={() => {
                  setMode(m.id);
                  setSelected([]);
                  setMorphoFilter("all");
                }}
                key={m.id}
              >
                <b>{m.label}</b>
                <small>{m.sub}</small>
              </button>
            ))}
          </div>
          <div className="filters">
            <label className="search">
              <span className="sr-only">Search</span>⌕
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search protocol, asset, or address"
              />
            </label>
            <label>
              <span>Chain</span>
              <select value={chain} onChange={(e) => setChain(e.target.value)}>
                <option value="all">All chains</option>
                {Object.values(chainById).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="liquidity">Available liquidity</option>
                <option value="rate">Comparable base rate</option>
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={rewards}
                onChange={(e) => setRewards(e.target.checked)}
              />
              Has rewards
            </label>
          </div>
          {hasMorphoBase && morphoBaseEnabled && (
            <fieldset className="morpho-filter">
              <legend>Morpho on Base product</legend>
              {(
                [
                  ["all", "All"],
                  ["vaults", "Vaults · lend only"],
                  ["lend-usdc", "Markets · lend USDC"],
                  ["borrow-usdc", "Markets · borrow against USDC"],
                ] as [MorphoFilter, string][]
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="morpho-product"
                    value={value}
                    checked={morphoFilter === value}
                    onChange={() => setMorphoFilter(value)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
          )}
          {loading ? (
            <State
              title="Loading catalog"
              text="Reading normalized observations and source health…"
              loading
            />
          ) : error ? (
            <State title="Catalog unavailable" text={error} />
          ) : shown.length === 0 ? (
            <State
              title={
                morphoBaseEnabled && morphoFilter !== "all"
                  ? "No Morpho opportunities match this product filter"
                  : data?.opportunities.length
                    ? "No approved opportunities match these filters"
                    : "No verified opportunities yet"
              }
              text={
                morphoBaseEnabled && morphoFilter !== "all"
                  ? "Try All or another Morpho on Base product filter."
                  : (data?.notices.join(" ") ??
                    "No validated observation exists.")
              }
            />
          ) : (
            <div className="cards">
              {shown.map((o) => (
                <Card
                  key={o.id}
                  o={o}
                  checked={selected.includes(o.id)}
                  toggle={toggle}
                  open={() => setDetail(o)}
                />
              ))}
            </div>
          )}
        </section>
        <section className="coverage" id="methodology">
          <div className="section-head">
            <div>
              <p className="eyebrow">SOURCE COVERAGE</p>
              <h2>Honest about what we know</h2>
            </div>
            <p>
              Native APIs and direct reads are the intended authority.
              Aggregators never create identity or exact links.
            </p>
          </div>
          <div className="coverage-grid">
            {coverage.map((x) => (
              <article key={x.protocol}>
                <h3>{x.protocol}</h3>
                <p>{x.scope}</p>
                <span>{x.state}</span>
                <small>{x.source}</small>
              </article>
            ))}
          </div>
        </section>
      </main>
      {selected.length > 0 && (
        <Compare items={compared} close={() => setSelected([])} />
      )}{" "}
      {detail && (
        <Detail
          o={detail}
          close={() => setDetail(undefined)}
          closeRef={closeRef}
        />
      )}
      <footer>
        <span className="brand">
          <span className="mark">A</span>Able Stable
        </span>
        <p>
          Informational research only. Rates are variable. Risk labels are not
          guarantees.
        </p>
        <p>Build 0.1 · Fixture mode</p>
      </footer>
    </div>
  );
}
function State({
  title,
  text,
  loading,
}: {
  title: string;
  text: string;
  loading?: boolean;
}) {
  return (
    <div className="state" role="status">
      {loading && <span className="spinner" />}
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Card({
  o,
  checked,
  toggle,
  open,
}: {
  o: Opportunity;
  checked: boolean;
  toggle: (id: string) => void;
  open: () => void;
}) {
  const a = assetById[o.assetId],
    c = chainById[o.chainId],
    r = rate(o),
    badge =
      o.productType === "vault"
        ? "VAULT · LEND ONLY"
        : o.productType === "market"
          ? o.usdcRole === "collateral_asset"
            ? "MARKET · USDC COLLATERAL"
            : "MARKET · LEND USDC"
          : undefined;
  return (
    <article className={`card ${o.productType ?? ""} ${o.usdcRole ?? ""}`}>
      <div className="card-top">
        <label className="compare">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggle(o.id)}
          />
          <span>Compare</span>
        </label>
        <div className="badges">
          {badge && <span className="product-badge">{badge}</span>}
          <span className={`pill ${o.riskBand}`}>{o.riskBand}</span>
        </div>
      </div>
      <div className="identity">
        <span className="coin">$</span>
        <div>
          <h3>
            {a.symbol} <small>on {c.name}</small>
          </h3>
          <p>
            {o.protocolName} · {o.name.replace(" demonstration market", "")}
          </p>
        </div>
      </div>
      {o.positionDescription && (
        <p className="position">{o.positionDescription}</p>
      )}
      <div className="yield">
        <div>
          <strong>{r.value}</strong>
          <span>{r.basis}</span>
        </div>
        {o.rewardComponents.length > 0 && (
          <div>
            <b>{percent(o.rewardComponents[0].apr)}</b>
            <span>Rewards APR</span>
          </div>
        )}
      </div>
      <dl>
        {o.counterAsset && (
          <div>
            <dt>
              {o.usdcRole === "collateral_asset"
                ? "Borrowed asset"
                : "Collateral asset"}
            </dt>
            <dd>{o.counterAsset.symbol}</dd>
          </div>
        )}
        {o.lltv && (
          <div>
            <dt>LLTV</dt>
            <dd>{percent(o.lltv)}</dd>
          </div>
        )}
        <div>
          <dt>Available liquidity</dt>
          <dd>{usd(o.availableLiquidityUsd)}</dd>
        </div>
        <div>
          <dt>Lockup</dt>
          <dd>{o.lockup.kind === "none" ? "None verified" : o.lockup.label}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{o.evidence.sourceName}</dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd className={o.evidence.demo ? "fixture" : ""}>{ageLabel(o)}</dd>
        </div>
      </dl>
      <div className="card-actions">
        <button onClick={open}>
          View evidence <span>→</span>
        </button>
        {o.link.url ? (
          <a href={o.link.url} target="_blank" rel="noopener noreferrer">
            {o.link.label} ↗
          </a>
        ) : (
          <span>Exact link unavailable</span>
        )}
      </div>
    </article>
  );
}
function Compare({
  items,
  close,
}: {
  items: Opportunity[];
  close: () => void;
}) {
  return (
    <aside className="compare-bar" aria-label="Comparison">
      <div>
        <b>Comparing {items.length} of 4</b>
        <span>{items.map((x) => x.protocolName).join(" · ")}</span>
      </div>
      <div className="compare-mini">
        {items.map((x) => (
          <span key={x.id}>
            {x.protocolName} <b>{rate(x).value}</b>
          </span>
        ))}
      </div>
      <button onClick={close}>Clear</button>
    </aside>
  );
}
function Detail({
  o,
  close,
  closeRef,
}: {
  o: Opportunity;
  close: () => void;
  closeRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const a = assetById[o.assetId],
    c = chainById[o.chainId];
  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
      >
        <button
          ref={closeRef}
          className="close"
          onClick={close}
          aria-label="Close detail"
        >
          ×
        </button>
        <p className="eyebrow">EVIDENCE &amp; RISK</p>
        <h2 id="detail-title">
          {o.protocolName} · {a.symbol}
        </h2>
        <p>
          {c.name} · <code>{a.addressOrMint}</code>
        </p>
        <div className="callout">
          <b>{o.evidence.demo ? "Fixture, not a live quote" : "Live provider snapshot"}</b>
          <p>
            {o.evidence.demo
              ? "This deterministic record tests normalization and UI behavior. Confidence remains unverified."
              : "Retrieved from the named source at the provenance timestamp; rates and liquidity can change."}
          </p>
        </div>
        <h3>Rate decomposition</h3>
        <dl className="detail-grid">
          <div>
            <dt>{o.displayRateLabel ?? "Base APY"}</dt>
            <dd>{percent(o.baseApy)}</dd>
          </div>
          <div>
            <dt>Base APR</dt>
            <dd>{percent(o.baseApr)}</dd>
          </div>
          <div>
            <dt>Rewards APR</dt>
            <dd>{percent(o.rewardComponents[0]?.apr)}</dd>
          </div>
          <div>
            <dt>Method</dt>
            <dd>{o.rateMethod.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>TVL</dt>
            <dd>{usd(o.tvlUsd)}</dd>
          </div>
          <div>
            <dt>Liquidity</dt>
            <dd>{usd(o.availableLiquidityUsd)}</dd>
          </div>
          {o.counterAsset && (
            <div>
              <dt>{o.usdcRole === "collateral_asset" ? "Borrowed asset" : "Collateral asset"}</dt>
              <dd>{o.counterAsset.symbol}</dd>
            </div>
          )}
          {o.lltv && (
            <div>
              <dt>LLTV</dt>
              <dd>{percent(o.lltv)}</dd>
            </div>
          )}
          {o.oracleAddress && (
            <div>
              <dt>Oracle</dt>
              <dd><code>{o.oracleAddress}</code></dd>
            </div>
          )}
        </dl>
        <h3>Risk dimensions</h3>
        <div className="risk-list">
          {o.risks.map((x) => (
            <div key={x.key}>
              <span className={`level l${x.level}`}>{x.level}/3</span>
              <div>
                <b>{x.label}</b>
                <p>{x.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <h3>Provenance</h3>
        <ol className="provenance">
          <li>{o.id}</li>
          <li>{o.freshness.sourceRunId}</li>
          <li>{o.evidence.sourceId}</li>
          <li>{o.evidence.rawPayloadHash}</li>
          <li>
            adapter {o.evidence.adapterVersion} · schema{" "}
            {o.evidence.schemaVersion}
          </li>
        </ol>
        <a
          className="source-link"
          href={o.evidence.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read official source documentation ↗
        </a>
      </section>
    </div>
  );
}
