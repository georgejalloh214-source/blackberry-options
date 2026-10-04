"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiEnvelope, OptionQuote } from "@/types";
import { ArrowDownUp, Layers3 } from "lucide-react";
import { useEffect, useState } from "react";

export function OptionsChain({ symbol }: { symbol: string }) {
  const [chain, setChain] = useState<OptionQuote[]>([]);
  const [expiry, setExpiry] = useState("");
  const [expiries, setExpiries] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/market/options?symbol=${encodeURIComponent(symbol)}${expiry ? `&expiry=${encodeURIComponent(expiry)}` : ""}`)
      .then((response) => response.json() as Promise<ApiEnvelope<{ chain: OptionQuote[]; expiries: string[] }>>)
      .then((payload) => {
        if (!active || !payload.ok || !payload.data) return;
        setChain(payload.data.chain);
        setExpiries(payload.data.expiries);
        if (!expiry && payload.data.expiries[0]) setExpiry(payload.data.expiries[0]);
      })
      .catch(() => { if (active) setChain([]); });
    return () => { active = false; };
  }, [symbol, expiry]);

  return (
    <Card className="card-3d">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="headline flex items-center gap-2 text-sm"><Layers3 className="h-4 w-4 text-primary" /> Options Chain</CardTitle>
          <select value={expiry} onChange={(event) => setExpiry(event.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
            {expiries.length === 0 && <option value="">Loading expiries...</option>}
            {expiries.map((date) => <option key={date} value={date}>{date}</option>)}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {chain.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">No option contracts available for {symbol}.</p> : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-xs tabular">
              <thead className="sticky top-0 bg-card text-muted-foreground"><tr><th className="px-2 py-2 text-left">Type</th><th className="px-2 py-2 text-right">Strike</th><th className="px-2 py-2 text-right">Bid</th><th className="px-2 py-2 text-right">Ask</th><th className="px-2 py-2 text-right">Delta</th><th className="px-2 py-2 text-right">IV</th><th className="px-2 py-2 text-right">DTE</th></tr></thead>
              <tbody>{chain.map((contract) => <tr key={`${contract.expiry}-${contract.type}-${contract.strike}`} className="border-t border-border/60 hover:bg-muted/30"><td className="px-2 py-2"><Badge variant="outline" className={`text-[9px] ${contract.type === "CALL" ? "border-emerald-500/40 text-emerald-400" : "border-red-500/40 text-red-400"}`}>{contract.type}</Badge></td><td className="px-2 py-2 text-right font-semibold">${contract.strike.toFixed(2)}</td><td className="px-2 py-2 text-right">${contract.bid.toFixed(2)}</td><td className="px-2 py-2 text-right">${contract.ask.toFixed(2)}</td><td className="px-2 py-2 text-right">{contract.greeks.delta.toFixed(2)}</td><td className="px-2 py-2 text-right">{(contract.iv * 100).toFixed(1)}%</td><td className="px-2 py-2 text-right">{contract.dte}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground"><ArrowDownUp className="h-3 w-3" /> Select an expiry to inspect available contracts.</div>
      </CardContent>
    </Card>
  );
}
