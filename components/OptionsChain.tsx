"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiData } from "@/lib/useApiData";
import { YahooOptionsPayload } from "@/types";
import { ArrowDownUp, Layers3 } from "lucide-react";
import { useEffect, useState } from "react";

function price(value: number | null) {
  return value === null ? "—" : `$${value.toFixed(2)}`;
}

function count(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

function volatility(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function OptionsChain({ symbol }: { symbol: string }) {
  const [selected, setSelected] = useState<{ symbol: string; expiry: string } | null>(null);
  const [known, setKnown] = useState<{ symbol: string; expiries: string[] }>({ symbol: "", expiries: [] });
  const expiry = selected?.symbol === symbol ? selected.expiry : "";
  const state = useApiData<YahooOptionsPayload>(
    symbol ? `/api/market/options?symbol=${encodeURIComponent(symbol)}${expiry ? `&expiry=${encodeURIComponent(expiry)}` : ""}` : null
  );

  useEffect(() => {
    if (state.status === "ready") setKnown({ symbol, expiries: state.data.expiries });
  }, [state, symbol]);

  // Keep the expiration list visible while a different expiry loads.
  const expiries = state.status === "ready" ? state.data.expiries : known.symbol === symbol ? known.expiries : [];
  const chain = state.status === "ready" && state.data.source === "YAHOO_OPTIONS" ? state.data.chain : [];
  const loading = state.status === "loading";
  const unavailable = !loading && chain.length === 0;

  return (
    <Card className="card-3d">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="headline flex items-center gap-2 text-sm">
              <Layers3 className="h-4 w-4 text-primary" /> Options Chain
            </CardTitle>
            <Badge variant="outline" className="border-emerald-500/40 text-[9px] text-emerald-400">
              YAHOO OPTIONS (15 MIN DELAY)
            </Badge>
          </div>
          <select
            value={expiry || expiries[0] || ""}
            onChange={(event) => setSelected({ symbol, expiry: event.target.value })}
            aria-label="Options expiration"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {expiries.length === 0 && <option value="">Expiration</option>}
            {expiries.map((date) => <option key={date} value={date}>{date}</option>)}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading Yahoo options…</p>
        ) : unavailable || chain.length === 0 ? (
          <p role="status" className="py-6 text-center text-xs font-semibold text-red-400">DATA UNAVAILABLE</p>
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-xs tabular">
              <thead className="sticky top-0 bg-card text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-left">Type</th>
                  <th className="px-2 py-2 text-right">Strike</th>
                  <th className="px-2 py-2 text-right">Last Price</th>
                  <th className="px-2 py-2 text-right">Bid</th>
                  <th className="px-2 py-2 text-right">Ask</th>
                  <th className="px-2 py-2 text-right">Volume</th>
                  <th className="px-2 py-2 text-right">Open Interest</th>
                  <th className="px-2 py-2 text-right">IV</th>
                </tr>
              </thead>
              <tbody>
                {chain.map((contract) => (
                  <tr key={`${contract.expiry}-${contract.type}-${contract.strike}`} className="border-t border-border/60 hover:bg-muted/30">
                    <td className="px-2 py-2">
                      <Badge variant="outline" className={`text-[9px] ${contract.type === "CALL" ? "border-emerald-500/40 text-emerald-400" : "border-red-500/40 text-red-400"}`}>
                        {contract.type}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">${contract.strike.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right">{price(contract.lastPrice)}</td>
                    <td className="px-2 py-2 text-right">{price(contract.bid)}</td>
                    <td className="px-2 py-2 text-right">{price(contract.ask)}</td>
                    <td className="px-2 py-2 text-right">{count(contract.volume)}</td>
                    <td className="px-2 py-2 text-right">{count(contract.openInterest)}</td>
                    <td className="px-2 py-2 text-right">{volatility(contract.iv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
          <ArrowDownUp className="h-3 w-3" /> Yahoo option quotes may be delayed; missing fields are shown as —.
        </div>
      </CardContent>
    </Card>
  );
}
