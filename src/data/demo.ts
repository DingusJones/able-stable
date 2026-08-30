import { runAave } from '../ingestion/adapters/aave'; import { runMorpho } from '../ingestion/adapters/morpho'; import { runCompound } from '../ingestion/adapters/compound'; import { runMoonwell } from '../ingestion/adapters/moonwell'; import { runKamino } from '../ingestion/adapters/kamino'; import { runSolend } from '../ingestion/adapters/solend';
import type { AdapterRunResult } from '../domain/types';
export const DEMO_AT='2026-08-30T12:00:00.000Z';
export function demoRuns():AdapterRunResult[] { return [
 runAave({supplyApy:'0.0312',tvlUsd:'182000000',liquidityUsd:'61000000',utilization:'0.665'},DEMO_AT),
 runMorpho({state:{netApy:'0.0384',totalAssetsUsd:'94000000',liquidityUsd:'17000000'}},DEMO_AT),
 runCompound({supplyRateApr:'0.0278',totalSupplyUsd:'121000000',availableUsd:'33000000',utilization:'0.727'},DEMO_AT),
 runMoonwell({market:{supplyApy:'0.0441',rewardApr:'0.0060',totalSupplyUsd:'68000000',cashUsd:'12000000'}},DEMO_AT),
 runKamino({reserve:{supplyApy:'0.0518',tvl:'77000000',availableLiquidity:'14000000',utilization:'0.818'}},DEMO_AT),
 runSolend({supplyInterest:{apy:'0.0365',rewardsApr:'0.0042'},liquidity:{suppliedUsd:'23000000',availableUsd:'5100000'}},DEMO_AT)
 ]; }
