"use client";

import { AnalysisPanel } from "@/components/analysis-panel";
import { Disclaimer } from "@/components/disclaimer";
import { FlowPanel } from "@/components/flow-panel";
import { Header } from "@/components/header";
import { PaperTradingPanel } from "@/components/paper-trading-panel";
import { PriceCard } from "@/components/price-card";
import { ScannerPanel } from "@/components/scanner-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiEnvelope,
  FlowItem,
  ScannerResult,
  StockQuote,
} from "@/types";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function DashboardPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [input, setInput] = useState("AAPL");
  const [minDelta, setMinDelta] = useState("0.2");
  const [maxDelta, setMaxDelta] = useState("0.4");

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [scanResults, setScanResults] = useState<ScannerResult[]>([]);
  const [flow, setFlow] = useState<FlowItem[]>([]);
  const [flowIsMock, setFlowIsMock] = useState(true);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ScannerResult | null>(null);
  const [tradeRefreshKey, setTradeRefreshKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        symbol,
        minDelta,
        maxDelta,
      });
      const [quoteRes, scanRes, flowRes] = await Promise.all([
        fetch(`/api/market/quote?symbol=${symbol}`).then(
          (r) => r.json() as Promise<ApiEnvelope<StockQuote>>
        ),
        fetch(`/api/scanner/options?${params}`).then(
          (r) => r.json() as Promise<ApiEnvelope<{ options: ScannerResult[] }>>
        ),
        fetch(`/api/market/flow`).then(
          (r) => r.json() as Promise<ApiEnvelope<{ flow: FlowItem[]; source: string }>>
        ),
      ]);
      if (quoteRes.ok && quoteRes.data) {
        setQuote(quoteRes.data);
        setAsOf(quoteRes.asOf);
      }
      if (scanRes.ok && scanRes.data) setScanResults(scanRes.data.options);
      if (flowRes.ok && flowRes.data) {
        setFlow(flowRes.data.flow);
        setFlowIsMock(flowRes.data.source === "MOCK");
      }
    } finally {
      setLoading(false);
    }
  }, [symbol, minDelta, maxDelta]);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 45_000); // v1 polling — websockets are Phase 2
    return () => clearInterval(t);
  }, [loadAll]);

  const openPaperTrade = async (c: ScannerResult) => {
    const res = await fetch("/api/paper-trading/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: c.symbol,
        optionContract: { expiry: c.expiry, strike: c.strike, type: c.type },
        quantity: 1,
        side: "SELL_TO_OPEN",
        strategy: c.strategyTag,
      }),
    });
    const json = (await res.json()) as ApiEnvelope<unknown>;
    setToast(
      json.ok
        ? `Paper trade opened: ${c.symbol} $${c.strike}${c.type[0]} ${c.expiry}`
        : `Could not open trade: ${json.error?.message ?? "unknown error"}`
    );
    setTradeRefreshKey((k) => k + 1);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <Header asOf={asOf} />

      {/* Symbol search + filters */}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSymbol(input.trim().toUpperCase() || "AAPL");
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="symbol" className="text-xs text-muted-foreground">
            Symbol
          </Label>
          <Input
            id="symbol"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            className="w-28 font-bold tabular"
            placeholder="AAPL"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="minDelta" className="text-xs text-muted-foreground">
            Min |Δ|
          </Label>
          <Input
            id="minDelta"
            value={minDelta}
            onChange={(e) => setMinDelta(e.target.value)}
            className="w-20 tabular"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="maxDelta" className="text-xs text-muted-foreground">
            Max |Δ|
          </Label>
          <Input
            id="maxDelta"
            value={maxDelta}
            onChange={(e) => setMaxDelta(e.target.value)}
            className="w-20 tabular"
          />
        </div>
        <Button type="submit" className="font-bold gap-2" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Scan
        </Button>
        {toast && (
          <span className="text-xs text-primary font-semibold animate-pulse">{toast}</span>
        )}
      </form>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <PriceCard quote={quote} loading={loading && !quote} />
          <FlowPanel flow={flow} loading={loading && flow.length === 0} isMock={flowIsMock} />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <ScannerPanel
            results={scanResults}
            loading={loading && scanResults.length === 0}
            onSendToEntry={setSelected}
          />
          <AnalysisPanel contract={selected} onOpenPaperTrade={openPaperTrade} />
        </div>
      </div>

      <PaperTradingPanel refreshKey={tradeRefreshKey} />

      <Disclaimer />
    </div>
  );
}
