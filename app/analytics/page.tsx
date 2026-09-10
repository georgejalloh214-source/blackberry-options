"use client";

import { Header } from "@/components/header";
import { Disclaimer } from "@/components/disclaimer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiEnvelope, PaperPosition } from "@/types";
import { BarChart3, Clock3, Crosshair, Percent, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const STARTING_EQUITY = 100_000;

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<PaperPosition[]>([]);

  useEffect(() => {
    fetch("/api/paper-trading/history")
      .then((response) => response.json() as Promise<ApiEnvelope<{ positions: PaperPosition[] }>>)
      .then((payload) => setTrades(payload.data?.positions ?? []))
      .catch(() => setTrades([]));
  }, []);

  const closed = useMemo(() => trades.filter((trade) => trade.status === "CLOSED"), [trades]);
  const analytics = useMemo(() => {
    const ordered = [...closed].sort((a, b) => new Date(a.closedAt ?? a.openedAt).getTime() - new Date(b.closedAt ?? b.openedAt).getTime());
    let equity = STARTING_EQUITY;
    const curve = [{ label: "Start", equity }];
    let winners = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalDays = 0;
    const strikes = new Map<number, number>();

    for (const trade of ordered) {
      const pnl = trade.realizedPnl ?? trade.pnl;
      equity += pnl;
      const holdDays = Math.max(1, Math.round((new Date(trade.closedAt ?? trade.openedAt).getTime() - new Date(trade.openedAt).getTime()) / 86_400_000));
      totalDays += holdDays;
      if (pnl >= 0) {
        winners += 1;
        grossProfit += pnl;
      } else {
        grossLoss += Math.abs(pnl);
      }
      strikes.set(trade.optionContract.strike, (strikes.get(trade.optionContract.strike) ?? 0) + pnl);
      curve.push({ label: new Date(trade.closedAt ?? trade.openedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }), equity: Math.round(equity) });
    }

    return {
      curve,
      winRate: ordered.length ? Math.round((winners / ordered.length) * 100) : 0,
      profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0,
      avgDays: ordered.length ? totalDays / ordered.length : 0,
      strikes: [...strikes.entries()].sort((a, b) => a[0] - b[0]),
    };
  }, [closed]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <Header asOf={null} />
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Performance lab</p>
        <h2 className="headline text-2xl">Strategy Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">A compact read on your simulated decisions, built from closed paper trades.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={TrendingUp} label="Win rate" value={`${analytics.winRate}%`} />
        <Metric icon={BarChart3} label="Profit factor" value={analytics.profitFactor === Infinity ? "∞" : analytics.profitFactor.toFixed(2)} />
        <Metric icon={Clock3} label="Avg hold" value={`${analytics.avgDays.toFixed(1)} days`} />
        <Metric icon={Percent} label="Closed trades" value={String(closed.length)} />
      </div>
      <Card className="card-3d">
        <CardHeader className="pb-2"><CardTitle className="headline text-sm">Equity curve</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.curve} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid stroke="hsl(220 45% 22% / 0.55)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "hsl(220 20% 70%)", fontSize: 10 }} />
                <YAxis tick={{ fill: "hsl(220 20% 70%)", fontSize: 10 }} tickFormatter={(value) => `$${Math.round(value / 1000)}k`} width={42} />
                <Tooltip contentStyle={{ background: "hsl(220 72% 10%)", border: "1px solid hsl(220 45% 22%)", borderRadius: 8, fontSize: 12 }} formatter={(value) => [money(Number(value)), "Equity"]} />
                <Line type="monotone" dataKey="equity" stroke="hsl(43 65% 57%)" strokeWidth={3} dot={{ r: 3, fill: "hsl(43 65% 57%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-3d">
          <CardHeader className="pb-2"><CardTitle className="headline flex items-center gap-2 text-sm"><Crosshair className="h-4 w-4 text-primary" />Strike profitability</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {analytics.strikes.length === 0 ? <Empty /> : analytics.strikes.map(([strike, pnl]) => (
              <div key={strike} className="flex items-center gap-3 text-xs">
                <span className="w-16 tabular text-muted-foreground">${strike}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-muted/50"><div className={`h-full ${pnl >= 0 ? "bg-emerald-500/70" : "bg-red-500/70"}`} style={{ width: `${Math.min(100, Math.max(8, Math.abs(pnl) / 10))}%` }} /></div>
                <span className={`w-20 text-right font-semibold tabular ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>{money(pnl)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="card-3d">
          <CardHeader className="pb-2"><CardTitle className="headline text-sm">Trade distribution</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-xs">
            <Distribution label="0–3 days" count={closed.filter((trade) => ageInDays(trade) <= 3).length} total={closed.length} />
            <Distribution label="4–10 days" count={closed.filter((trade) => ageInDays(trade) > 3 && ageInDays(trade) <= 10).length} total={closed.length} />
            <Distribution label="11+ days" count={closed.filter((trade) => ageInDays(trade) > 10).length} total={closed.length} />
            <p className="pt-2 text-muted-foreground">Profit factor compares gross winning P/L with gross losing P/L. It is most useful beside sample size and drawdown.</p>
          </CardContent>
        </Card>
      </div>
      <Disclaimer />
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return <Card className="card-3d"><CardContent className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 text-primary" /><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p><p className="text-xl font-bold tabular">{value}</p></div></CardContent></Card>;
}

function Distribution({ label, count, total }: { label: string; count: number; total: number }) {
  const width = total ? Math.max(4, (count / total) * 100) : 4;
  return <div className="flex items-center gap-3"><span className="w-20 text-muted-foreground">{label}</span><div className="h-2 flex-1 rounded bg-muted/50"><div className="h-full rounded bg-primary" style={{ width: `${width}%` }} /></div><Badge variant="outline" className="w-10 justify-center text-[9px]">{count}</Badge></div>;
}

function ageInDays(trade: PaperPosition) {
  return Math.max(1, Math.round((new Date(trade.closedAt ?? trade.openedAt).getTime() - new Date(trade.openedAt).getTime()) / 86_400_000));
}

function Empty() {
  return <p className="py-6 text-center text-xs text-muted-foreground">Close paper trades to populate this view.</p>;
}
