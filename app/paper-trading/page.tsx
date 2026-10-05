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
import { useState } from "react";
import { useEffect } from "react";

export default function PaperTradingPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [symbol, setSymbol] = useState("AAPL");
  const [mode, setMode] = useState<AppMode>("TRADER");
  const [options, setOptions] = useState<MultiLegOption[]>([]);
  const bump = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let active = true;
    fetch(`/api/market/options?symbol=${encodeURIComponent(symbol)}`)
      .then((response) => response.json())
      .then((payload: { data?: { chain?: Array<MultiLegOption & { expiry?: string; greeks?: { delta: number; theta: number } }> } }) => {
        if (!active) return;
        const chain = payload.data?.chain ?? [];
        setOptions(chain.map((option) => ({
          symbol: option.symbol || symbol,
          strike: option.strike,
          expiration: option.expiration ?? option.expiry ?? "",
          type: option.type,
          bid: option.bid,
          ask: option.ask,
          delta: option.delta ?? option.greeks?.delta,
          theta: option.theta ?? option.greeks?.theta,
        })));
      })
      .catch(() => {
        if (active) setOptions([]);
      });
    return () => {
      active = false;
    };
  }, [symbol]);

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
        <AutoEntryToggle symbol={symbol} options={options} />
        <AutoExitToggle onTradeClosed={bump} />
      </div>
      <PaperTradingPanel refreshKey={refreshKey} />
      <div className="flex items-center gap-3">
        <label htmlFor="paper-trading-symbol" className="text-sm font-medium">Ticker</label>
        <Input id="paper-trading-symbol" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} className="w-28" maxLength={10} />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <MultiLegBuilder symbol={symbol} options={options} onTradePlaced={bump} />
        <OptionsChain symbol={symbol} />
      </div>
      <TradeJournal refreshKey={refreshKey} />
      {mode === "LEARNING" && <LearningRail />}
      <Disclaimer />
    </div>
  );
}
