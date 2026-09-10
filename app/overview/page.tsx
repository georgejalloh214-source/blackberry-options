"use client";

import { Disclaimer } from "@/components/disclaimer";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiEnvelope, FlowItem, StockQuote } from "@/types";
import { Activity, Gauge, Globe2, TrendingDown, TrendingUp, Waves } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const watchlist = ["NVDA", "TSLA", "META", "AMD", "BA", "TGT", "KO"];
const indices = ["SPY", "QQQ", "DIA", "IWM"];

export default function MarketOverviewPage() {
  const [events, setEvents] = useState<FlowItem[]>([]);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/market/flow").then((response) => response.json() as Promise<ApiEnvelope<{ flow: FlowItem[] }>>),
      Promise.all([...indices, ...watchlist].map((symbol) => fetch(`/api/market/quote?symbol=${symbol}`).then((response) => response.json() as Promise<ApiEnvelope<StockQuote>>))),
    ]).then(([flowPayload, quotePayloads]) => {
      setEvents(flowPayload.data?.flow ?? []);
      setQuotes(quotePayloads.flatMap((payload) => payload.data ? [payload.data] : []));
    }).catch(() => { setEvents([]); setQuotes([]); });
  }, []);

  const indexQuotes = quotes.filter((quote) => indices.includes(quote.symbol));
  const movers = quotes.filter((quote) => !indices.includes(quote.symbol)).sort((a, b) => b.changePct - a.changePct);
  const symbols = useMemo(() => [...new Set(events.map((event) => event.symbol))].slice(0, 8), [events]);
  const marketScore = useMemo(() => {
    const indexScore = indexQuotes.length ? indexQuotes.reduce((sum, quote) => sum + Math.max(-5, Math.min(5, quote.changePct)), 0) / indexQuotes.length : 0;
    const bullish = events.filter((event) => event.sentiment === "BULLISH").reduce((sum, event) => sum + event.premium, 0);
    const bearish = events.filter((event) => event.sentiment === "BEARISH").reduce((sum, event) => sum + event.premium, 0);
    return Math.round(Math.max(0, Math.min(100, 50 + indexScore * 8 + (bullish + bearish ? ((bullish - bearish) / (bullish + bearish)) * 25 : 0))));
  }, [events, indexQuotes]);

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
    <Header asOf={null} />
    <div><p className="text-xs uppercase tracking-[0.2em] text-primary">Market context</p><h2 className="headline text-2xl">Market Overview</h2><p className="mt-1 text-sm text-muted-foreground">A quick read on indices, movers, volatility, and unusual options activity.</p></div>
    <div className="grid gap-4 md:grid-cols-4"><Stat icon={Gauge} label="Market score" value={`${marketScore} · ${marketScore >= 60 ? "Bullish" : marketScore <= 40 ? "Bearish" : "Mixed"}`} /><Stat icon={Activity} label="Flow prints" value={String(events.length)} /><Stat icon={TrendingUp} label="Symbols active" value={String(symbols.length)} /><Stat icon={Globe2} label="Data status" value="15 min delayed" /></div>
    <section className="space-y-3"><SectionTitle title="Major indices" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{indexQuotes.map((quote) => <QuoteTile key={quote.symbol} quote={quote} />)}</div></section>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="card-3d"><CardHeader><CardTitle className="headline text-sm">Top gainers and losers</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-4"><MoverList title="Gainers" items={movers.filter((quote) => quote.changePct >= 0).slice(0, 3)} positive /><MoverList title="Losers" items={movers.filter((quote) => quote.changePct < 0).slice(-3).reverse()} /></CardContent></Card>
      <Card className="card-3d"><CardHeader><CardTitle className="headline flex items-center gap-2 text-sm"><Waves className="h-4 w-4 text-primary" />Volatility snapshot</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">VIX proxy</p><p className="text-3xl font-bold tabular">{(18 + (100 - marketScore) / 10).toFixed(1)}</p></div><Badge variant="outline" className="text-[9px]">Sample estimate</Badge></div><p className="text-xs text-muted-foreground">The current provider does not expose a VIX endpoint. This proxy reflects market score dispersion and is for dashboard context only.</p></CardContent></Card>
    </div>
    <Card className="card-3d"><CardHeader><CardTitle className="headline text-sm">Unusual flow by ticker</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{symbols.length ? symbols.map((symbol) => { const symbolEvents = events.filter((event) => event.symbol === symbol); const premium = symbolEvents.reduce((total, event) => total + event.premium, 0); return <div key={symbol} className="rounded-lg border border-border bg-muted/20 p-4"><div className="flex items-center justify-between"><span className="font-bold">{symbol}</span><Badge variant="outline" className="text-[9px]">{symbolEvents.length} prints</Badge></div><p className="mt-3 text-lg font-bold tabular">${Math.round(premium / 1000)}k</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">notional premium</p></div>; }) : <p className="col-span-full py-8 text-center text-xs text-muted-foreground">No flow prints available yet.</p>}</CardContent></Card>
    <section className="space-y-3"><SectionTitle title="Sector heatmap" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Sector label="Technology" symbols="AAPL · NVDA · AMD · MSFT" tone="bg-emerald-500/70" /><Sector label="Consumer" symbols="TSLA · META · COIN" tone="bg-primary/70" /><Sector label="Industrials" symbols="BA · CAT · GE" tone="bg-red-500/70" /><Sector label="Healthcare" symbols="XLV · JNJ · UNH" tone="bg-sky-500/70" /><Sector label="Energy" symbols="XLE · XOM · CVX" tone="bg-orange-500/70" /><Sector label="Financials" symbols="XLF · JPM · GS" tone="bg-violet-500/70" /></div></section>
    <Disclaimer />
  </div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) { return <Card className="card-3d"><CardContent className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 text-primary" /><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="text-xl font-bold tabular">{value}</p></div></CardContent></Card>; }
function QuoteTile({ quote }: { quote: StockQuote }) { const positive = quote.changePct >= 0; return <div className="rounded-lg border border-border bg-muted/20 p-4"><div className="flex items-center justify-between"><span className="font-bold">{quote.symbol}</span>{positive ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-red-400" />}</div><p className={`mt-3 text-xl font-bold tabular ${positive ? "text-emerald-400" : "text-red-400"}`}>{positive ? "+" : ""}{quote.changePct.toFixed(2)}%</p><p className="text-xs text-muted-foreground">${quote.price.toFixed(2)}</p></div>; }
function MoverList({ title, items, positive = false }: { title: string; items: StockQuote[]; positive?: boolean }) { return <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>{items.map((quote) => <div key={quote.symbol} className="flex justify-between border-b border-border/60 py-2 text-xs"><span>{quote.symbol}</span><span className={`font-semibold tabular ${positive ? "text-emerald-400" : "text-red-400"}`}>{quote.changePct > 0 ? "+" : ""}{quote.changePct.toFixed(2)}%</span></div>)}</div>; }
function SectionTitle({ title }: { title: string }) { return <h3 className="headline border-b border-border pb-2 text-sm">{title}</h3>; }
function Sector({ label, symbols, tone }: { label: string; symbols: string; tone: string }) { return <div className="relative overflow-hidden rounded-lg border border-border p-4"><div className={`absolute inset-y-0 left-0 w-1 ${tone}`} /><p className="font-semibold">{label}</p><p className="mt-2 text-xs text-muted-foreground">{symbols}</p></div>; }
