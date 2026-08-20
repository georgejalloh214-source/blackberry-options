"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiEnvelope } from "@/types";
import { AccountStats } from "@/types/features";
import { Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function Tile({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`text-lg font-bold tabular ${
          tone === "up" ? "text-emerald-400" : tone === "down" ? "text-red-400" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function PaperAccount({ refreshKey = 0 }: { refreshKey?: number }) {
  const [stats, setStats] = useState<AccountStats | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/account");
    const json = (await res.json()) as ApiEnvelope<AccountStats>;
    if (json.ok && json.data) setStats(json.data);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 45_000);
    return () => clearInterval(t);
  }, [load, refreshKey]);

  if (!stats) {
    return (
      <Card className="card-3d">
        <CardContent className="pt-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-3d card-3d-gold">
      <CardHeader className="pb-3">
        <CardTitle className="headline text-sm flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Paper Account
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        <Tile label="Equity" value={money(stats.equity)} />
        <Tile label="Balance" value={money(stats.balance)} />
        <Tile
          label="Unrealized P/L"
          value={money(stats.unrealizedPnl)}
          tone={stats.unrealizedPnl >= 0 ? "up" : "down"}
        />
        <Tile
          label="Realized P/L"
          value={money(stats.realizedPnl)}
          tone={stats.realizedPnl >= 0 ? "up" : "down"}
        />
        <Tile label="Buying Power" value={money(stats.buyingPower)} />
        <Tile label="Margin Reserved" value={money(stats.marginReserved)} />
        <Tile label="Win Rate" value={`${stats.winRate}%`} tone={stats.winRate >= 50 ? "up" : "down"} />
        <Tile label="Avg R:R" value={`${stats.avgRiskReward}:1`} />
        <Tile label="Max Drawdown" value={`${money(stats.maxDrawdown)} (${stats.maxDrawdownPct}%)`} tone="down" />
        <Tile label="Margin Used" value={`${stats.marginUtilizationPct}%`} />
        <Tile label="Open / Closed" value={`${stats.openPositions} / ${stats.closedTrades}`} />
        <Tile label="Biggest Position" value={`${stats.largestPositionMarginPct}% of acct`} />
      </CardContent>
    </Card>
  );
}
