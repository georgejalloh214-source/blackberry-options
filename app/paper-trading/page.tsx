"use client";

import { AutoExitToggle } from "@/components/AutoExitToggle";
import { AutoEntryToggle } from "@/components/AutoEntryToggle";
import { Disclaimer } from "@/components/disclaimer";
import { DataSourcePanel } from "@/components/DataSourcePanel";
import { Header } from "@/components/header";
import { PaperAccount } from "@/components/PaperAccount";
import { PaperTradingPanel } from "@/components/paper-trading-panel";
import { TradeJournal } from "@/components/TradeJournal";
import { MultiLegBuilder, MultiLegOption } from "@/components/MultiLegBuilder";
import { OptionsChain } from "@/components/OptionsChain";
import { LearningModeToggle, AppMode } from "@/components/LearningModeToggle";
import { LearningRail } from "@/components/LearningRail";
import { Input } from "@/components/ui/input";
import { ApiStatus, useApiData } from "@/lib/useApiData";
import { YahooOptionsPayload } from "@/types";
import { useMemo, useState } from "react";

const SYMBOL_PATTERN = /^[A-Z0-9.^=-]{1,20}$/;

export default function PaperTradingPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [symbol, setSymbol] = useState("AAPL");
  const [mode, setMode] = useState<AppMode>("TRADER");
  const bump = () => setRefreshKey((k) => k + 1);

  const optionsState = useApiData<YahooOptionsPayload>(
    SYMBOL_PATTERN.test(symbol) ? `/api/market/options?symbol=${encodeURIComponent(symbol)}` : null
  );
  const options = useMemo<MultiLegOption[]>(() => {
    if (optionsState.status !== "ready" || optionsState.data.source !== "YAHOO_OPTIONS") return [];
    return optionsState.data.chain.map((option) => ({
      symbol: option.symbol,
      strike: option.strike,
      expiration: option.expiry,
      type: option.type,
      bid: option.bid ?? undefined,
      ask: option.ask ?? undefined,
      delta: option.greeks?.delta,
      theta: option.greeks?.theta,
    }));
  }, [optionsState]);
  const chainStatus: ApiStatus = optionsState.status === "ready" && options.length === 0 ? "unavailable" : optionsState.status;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <Header asOf={null} />
      <DataSourcePanel symbol={symbol} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Paper desk</p>
          <h2 className="headline text-lg">Trade with a plan</h2>
        </div>
        <LearningModeToggle onChange={setMode} />
      </div>
      <PaperAccount refreshKey={refreshKey} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <AutoEntryToggle symbol={symbol} options={options} chainStatus={chainStatus} />
        <AutoExitToggle onTradeClosed={bump} />
      </div>
      <PaperTradingPanel refreshKey={refreshKey} />
      <div className="flex items-center gap-3">
        <label htmlFor="paper-trading-symbol" className="text-sm font-medium">Ticker</label>
        <Input id="paper-trading-symbol" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} className="w-28" maxLength={10} />
      </div>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
        <div className="min-w-0">
          <MultiLegBuilder symbol={symbol} options={options} onTradePlaced={bump} />
        </div>
        <div className="min-w-0">
          <OptionsChain symbol={symbol} />
        </div>
      </div>
      <TradeJournal refreshKey={refreshKey} />
      {mode === "LEARNING" && <LearningRail />}
      <Disclaimer />
    </div>
  );
}
