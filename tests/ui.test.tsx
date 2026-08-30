import { createRoot } from "react-dom/client";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { App, matchesMorphoFilter } from "../src/ui/App";
import * as api from "../src/api";
import { allDemoOpportunities, buildCatalog } from "../src/data/catalog";
import type { Opportunity } from "../src/domain/types";
const wait = () => new Promise((r) => setTimeout(r, 240));
describe("Morpho product filters", () => {
  it("uses normalized product and USDC-role fields", () => {
    const base = allDemoOpportunities()[0];
    const rows = [
      {
        ...base,
        id: "vault",
        protocolId: "morpho",
        chainId: "eip155:8453",
        productType: "vault",
        usdcRole: "lending_asset",
      },
      {
        ...base,
        id: "lend",
        protocolId: "morpho",
        chainId: "eip155:8453",
        productType: "market",
        usdcRole: "lending_asset",
      },
      {
        ...base,
        id: "borrow",
        protocolId: "morpho",
        chainId: "eip155:8453",
        productType: "market",
        usdcRole: "collateral_asset",
      },
    ] as Opportunity[];
    expect(
      rows.filter((x) => matchesMorphoFilter(x, "all")).map((x) => x.id),
    ).toEqual(["vault", "lend", "borrow"]);
    expect(
      rows.filter((x) => matchesMorphoFilter(x, "vaults")).map((x) => x.id),
    ).toEqual(["vault"]);
    expect(
      rows.filter((x) => matchesMorphoFilter(x, "lend-usdc")).map((x) => x.id),
    ).toEqual(["lend"]);
    expect(
      rows
        .filter((x) => matchesMorphoFilter(x, "borrow-usdc"))
        .map((x) => x.id),
    ).toEqual(["borrow"]);
  });
});
describe("frontend states and interaction", () => {
  it("scopes Base Morpho controls and rows to All chains and Base", async () => {
    const rows = allDemoOpportunities();
    const morpho = rows.find((o) => o.protocolId === "morpho")!;
    const base = rows.find((o) => o.chainId === "eip155:8453")!;
    const baseMorpho = {
      ...morpho,
      id: "test-base-morpho-vault",
      chainId: "eip155:8453",
      assetId: base.assetId,
      productType: "vault",
      usdcRole: "lending_asset",
    } as Opportunity;
    const fetch = vi
      .spyOn(api, "fetchCatalog")
      .mockResolvedValue(buildCatalog("core", [baseMorpho]));
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<App />));
    await act(wait);

    const chain = host.querySelector<HTMLSelectElement>(
      ".filters label:nth-child(2) select",
    )!;
    expect(host.textContent).toContain("Morpho on Base product");
    expect(host.textContent).toContain("Morpho");
    expect(host.textContent).toContain("on Base");

    await act(async () => {
      chain.value = "eip155:8453";
      chain.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.textContent).toContain("Morpho on Base product");
    expect(host.textContent).toContain("Morpho");
    expect(host.textContent).toContain("on Base");

    await act(async () => {
      chain.value = "eip155:1";
      chain.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(host.textContent).not.toContain("Morpho on Base product");
    expect(host.querySelectorAll(".card")).toHaveLength(0);
    expect(host.textContent).not.toContain("on Base");
    expect(host.textContent).toContain(
      "No approved opportunities match these filters",
    );
    root.unmount();
    host.remove();
    fetch.mockRestore();
  });

  it("toggles dark mode with accessible state and persists the preference", async () => {
    localStorage.clear();
    const host = document.createElement("div");
    document.body.append(host);
    let root = createRoot(host);
    await act(async () => root.render(<App />));

    const toggle = host.querySelector<HTMLButtonElement>(".theme-toggle")!;
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(toggle.textContent).toContain("Dark mode");
    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect(toggle.textContent).toContain("Light mode");
    expect(host.querySelector(".app")?.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("able-stable-theme")).toBe("dark");

    await act(async () => root.unmount());
    root = createRoot(host);
    await act(async () => root.render(<App />));
    expect(
      host.querySelector(".theme-toggle")?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(host.querySelector(".app")?.getAttribute("data-theme")).toBe("dark");
    await act(async () => root.unmount());
    host.remove();
    localStorage.clear();
  });

  it("renders fixture warning, compare, detail, and Escape behavior", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<App />);
    });
    await act(wait);
    expect(host.textContent).toContain("Aave");
    expect(host.textContent).toContain("Illustrative fixture data");
    const compare = host.querySelector<HTMLInputElement>(".compare input")!;
    await act(async () => compare.click());
    expect(host.textContent).toContain("Comparing 1 of 4");
    const evidence = [...host.querySelectorAll("button")].find((x) =>
      x.textContent?.includes("View evidence"),
    )!;
    await act(async () => evidence.click());
    expect(host.querySelector("[role=dialog]")?.textContent).toContain(
      "Fixture, not a live quote",
    );
    await act(async () =>
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(host.querySelector("[role=dialog]")).toBeNull();
    root.unmount();
    host.remove();
  });
  it("shows honest empty state for CeFi", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<App />);
    });
    await act(wait);
    const cefi = [
      ...host.querySelectorAll<HTMLButtonElement>("[role=tab]"),
    ].find((x) => x.textContent?.includes("CeFi"))!;
    await act(async () => {
      cefi.click();
      await wait();
    });
    expect(host.textContent).toContain("No verified opportunities yet");
    expect(host.textContent).toContain("No reproducible universal CeFi");
    root.unmount();
    host.remove();
  });
});
