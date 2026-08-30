import { createRoot } from "react-dom/client";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { App, matchesMorphoFilter } from "../src/ui/App";
import { allDemoOpportunities } from "../src/data/catalog";
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
