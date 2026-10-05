"use client";

import { AlertsPanel } from "@/components/AlertsPanel";
import { AIAnalysisPanel } from "@/components/AIAnalysisPanel";
import { BotIntelligence } from "@/components/BotIntelligence";
import { computeBotInputs } from "@/lib/bot/computeInputs";
import { DarkPoolTape } from "@/components/DarkPoolTape";
import { DataSourcePanel } from "@/components/DataSourcePanel";
import { Disclaimer } from "@/components/disclaimer";
import { FlowHistory } from "@/components/FlowHistory";
import { FlowTape } from "@/components/FlowTape";
import { Header } from "@/components/header";
import { PriceCard } from "@/components/price-card";
import { PriceChart } from "@/components/PriceChart";
import { PayoffDiagram } from "@/components/PayoffDiagram";
import { RealtimeQuoteCard } from "@/components/RealtimeQuoteCard";
import { OptionsChain } from "@/components/OptionsChain";
import { SentimentSummary } from "@/components/SentimentSummary";
import { SectionHeader } from "@/components/SectionHeader";
import { StrategyRecommendation } from "@/components/StrategyRecommendation";
import { computePayoff } from "@/lib/bot/payoff";
import { recommendContracts } from "@/lib/bot/strategyEngine";
import { ApiEnvelope, FlowItem, OptionQuote, PaperPosition, StockQuote } from "@/types";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

async function fetchEnvelope<T>(url: string): Promise<ApiEnvelope<T> | null> {
  try {
    const response = await fetch(url);
    return (await response.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

export default function SymbolPage() {
  const params = useParams<{ symbol: string }>();
  const symbol = (params.symbol ?? "AAPL").toUpperCase();
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [chain, setChain] = useState<OptionQuote[]>([]);
  const [flow, setFlow] = useState<FlowItem[]>([]);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
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

  const botInputs = useMemo(
    () => quote
      ? computeBotInputs(quote, chain, flow, positions)
      : { priceTrendScore: 50, flowScore: 50, ivScore: 50, greeksScore: 50, riskScore: 80 },
    [quote, chain, flow, positions]
  );

  const recommendations = useMemo(
    () => quote ? recommendContracts(chain, { ...botInputs, tradeScore: Math.round(
      botInputs.priceTrendScore * 0.3 +
      botInputs.flowScore * 0.25 +
      botInputs.ivScore * 0.15 +
      botInputs.greeksScore * 0.2 +
      botInputs.riskScore * 0.1
    ) }, quote.price) : [],
    [botInputs, chain, quote]
  );
  const payoff = useMemo(
    () => quote ? computePayoff(recommendations, quote.price) : [],
    [quote, recommendations]
  );

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchEnvelope<{ chain: OptionQuote[] }>(`/api/market/options?symbol=${symbol}`),
      fetchEnvelope<{ flow: FlowItem[] }>(`/api/market/flow?symbol=${symbol}`),
      fetchEnvelope<{ positions: PaperPosition[] }>("/api/paper-trading/positions"),
    ]).then(([optionsPayload, flowPayload, positionsPayload]) => {
      if (!active) return;
      if (optionsPayload?.ok && optionsPayload.data) setChain(optionsPayload.data.chain);
      if (flowPayload?.ok && flowPayload.data) setFlow(flowPayload.data.flow);
      if (positionsPayload?.ok && positionsPayload.data) setPositions(positionsPayload.data.positions);
    });
    return () => { active = false; };
  }, [symbol]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <Header asOf={asOf} />
      <DataSourcePanel symbol={symbol} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <RealtimeQuoteCard symbol={symbol} />
          <PriceCard quote={quote} loading={!quote} />
          {quote && (
            <section className="space-y-3">
              <SectionHeader title="Price Path" detail="Modeled from current quote range" />
              <div className="card-3d rounded-lg p-3"><PriceChart quote={quote} /></div>
            </section>
          )}
          <SectionHeader title="Decision Layer" detail="Signal quality and sentiment" />
          <BotIntelligence inputs={botInputs} />
          <StrategyRecommendation legs={recommendations} />
          <PayoffDiagram data={payoff} />
          <SentimentSummary symbol={symbol} />
          <AlertsPanel defaultSymbol={symbol} />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <FlowTape symbol={symbol} />
          <DarkPoolTape symbol={symbol} />
        </div>
      </div>
      <AIAnalysisPanel symbol={symbol} />
      <section className="space-y-3">
        <SectionHeader title="Market Structure" detail="Chain and historical flow" />
        <OptionsChain symbol={symbol} />
        <FlowHistory symbol={symbol} />
      </section>
      <Disclaimer />
    </div>
  );
}
