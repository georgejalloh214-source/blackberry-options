"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiEnvelope, ExitTimingResult, PaperPosition } from "@/types";
import { Briefcase, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function PaperTradingPanel({ refreshKey }: { refreshKey: number }) {
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [history, setHistory] = useState<PaperPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [exitResults, setExitResults] = useState<Record<string, ExitTimingResult>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [posRes, histRes] = await Promise.all([
        fetch("/api/paper-trading/positions").then(
          (r) => r.json() as Promise<ApiEnvelope<{ positions: PaperPosition[] }>>
        ),
        fetch("/api/paper-trading/history").then(
          (r) => r.json() as Promise<ApiEnvelope<{ positions: PaperPosition[] }>>
        ),
      ]);
      if (posRes.ok && posRes.data) setPositions(posRes.data.positions);
      if (histRes.ok && histRes.data) setHistory(histRes.data.positions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 45_000); // polling refresh, v1
    return () => clearInterval(t);
  }, [load, refreshKey]);

  const closePosition = async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/paper-trading/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId: id }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const checkExit = async (p: PaperPosition) => {
    setBusy(p.id);
    try {
      const res = await fetch("/api/exit-timing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: {
            symbol: p.symbol,
            entryPrice: p.entryPrice,
            currentPrice: p.currentPrice,
            quantity: p.quantity,
            side: p.side,
            optionContract: p.optionContract,
            openedAt: p.openedAt,
          },
        }),
      });
      const json = (await res.json()) as ApiEnvelope<ExitTimingResult>;
      if (json.ok && json.data) {
        setExitResults((prev) => ({ ...prev, [p.id]: json.data as ExitTimingResult }));
      }
    } finally {
      setBusy(null);
    }
  };

  const totalPnl = positions.reduce((s, p) => s + p.pnl, 0);
  const realizedPnl = history.reduce((s, p) => s + (p.realizedPnl ?? 0), 0);

  return (
    <Card className="card-3d">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="headline text-sm flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Paper Trading
          </CardTitle>
          <div className="flex items-center gap-3 text-xs tabular">
            <span>
              Open P/L{" "}
              <span className={totalPnl >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                ${totalPnl.toFixed(0)}
              </span>
            </span>
            <span>
              Realized{" "}
              <span className={realizedPnl >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                ${realizedPnl.toFixed(0)}
              </span>
            </span>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && positions.length === 0 && <Skeleton className="h-24 w-full" />}
        {!loading && positions.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No open paper trades. Run the scanner, analyze a contract, and open one.
          </p>
        )}
        {positions.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Contract</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Entry</TableHead>
                  <TableHead className="text-right">Mark</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                  <TableHead className="text-right">Δ / Θ</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Assign Risk</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p) => (
                  <TableRow key={p.id} className="text-xs tabular">
                    <TableCell className="font-semibold whitespace-nowrap">
                      {p.symbol} ${p.optionContract.strike}
                      {p.optionContract.type[0]} {p.optionContract.expiry.slice(5)} ×{p.quantity}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px]">
                        {p.side === "SELL_TO_OPEN" ? "SHORT" : "LONG"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">${p.entryPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${p.currentPrice.toFixed(2)}</TableCell>
                    <TableCell
                      className={`text-right font-bold ${p.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      ${p.pnl.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {p.greeks.delta.toFixed(2)} / {p.greeks.theta.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${p.marginRequired.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          p.assignmentRiskScore >= 60
                            ? "text-red-400 font-bold"
                            : p.assignmentRiskScore >= 35
                              ? "text-primary font-semibold"
                              : "text-emerald-400"
                        }
                      >
                        {p.assignmentRiskScore}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] text-primary hover:text-primary"
                        disabled={busy === p.id}
                        onClick={() => checkExit(p)}
                      >
                        {busy === p.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Exit Timing"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] text-red-400 hover:text-red-300"
                        disabled={busy === p.id}
                        onClick={() => closePosition(p.id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Close
                      </Button>
                      {exitResults[p.id] && (
                        <div className="mt-1 max-w-xs text-[10px] text-muted-foreground">
                          <Badge
                            className={`text-[9px] mr-1 ${
                              exitResults[p.id].exitSignal === "TAKE_PROFIT"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : exitResults[p.id].exitSignal === "EXIT_NOW"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-primary/20 text-primary"
                            }`}
                            variant="secondary"
                          >
                            {exitResults[p.id].exitSignal.replace(/_/g, " ")}
                          </Badge>
                          {exitResults[p.id].reasons[0]}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {history.length > 0 && (
          <div className="mt-4">
            <h4 className="headline text-[10px] text-muted-foreground mb-2">
              Trade Journal (Closed)
            </h4>
            <div className="space-y-1">
              {history.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded bg-muted/30 px-3 py-1.5 text-[11px] tabular"
                >
                  <span>
                    {p.symbol} ${p.optionContract.strike}
                    {p.optionContract.type[0]} · {p.strategy.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`font-bold ${(p.realizedPnl ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    ${(p.realizedPnl ?? 0).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
