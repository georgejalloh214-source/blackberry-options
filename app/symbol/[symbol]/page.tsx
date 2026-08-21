"use client";

import { AlertsPanel } from "@/components/AlertsPanel";
import { DarkPoolTape } from "@/components/DarkPoolTape";
import { Disclaimer } from "@/components/disclaimer";
import { FlowHistory } from "@/components/FlowHistory";
import { FlowTape } from "@/components/FlowTape";
import { Header } from "@/components/header";
import { PriceCard } from "@/components/price-card";
import { SentimentSummary } from "@/components/SentimentSummary";
import { ApiEnvelope, StockQuote } from "@/types";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SymbolPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol ?? "AAPL").toUpperCase();
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/market/quote?symbol=${symbol}`);
      const json = (await res.json()) as ApiEnvelope<StockQuote>;
      if (json.ok && json.data) {
        setQuote(json.data);
        setAsOf(json.asOf);
      }
    })();
  }, [symbol]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <Header asOf={asOf} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <PriceCard quote={quote} loading={!quote} />
          <SentimentSummary symbol={symbol} />
          <AlertsPanel defaultSymbol={symbol} />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <FlowTape symbol={symbol} />
          <DarkPoolTape symbol={symbol} />
        </div>
      </div>
      <FlowHistory symbol={symbol} />
      <Disclaimer />
    </div>
  );
}
