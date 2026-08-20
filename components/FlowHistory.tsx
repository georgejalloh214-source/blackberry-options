"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DEFAULT_FLOW_FILTERS, FlowFilters } from "@/components/FlowFilters";
import { ApiEnvelope } from "@/types";
import { FlowFiltersState, LiveFlowEvent } from "@/types/features";
import { History, Search } from "lucide-react";
import { useState } from "react";

const fmt = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(0)}K`);

export function FlowHistory({ symbol }: { symbol: string }) {
  const [from, setFrom] = useState("2017-01-01");
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [filters, setFilters] = useState<FlowFiltersState>(DEFAULT_FLOW_FILTERS);
  const [events, setEvents] = useState<LiveFlowEvent[] | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    setLoading(true);
    const p = new URLSearchParams({ symbol, from, to, limit: "100" });
    if (filters.minPremium) p.set("minPremium", String(filters.minPremium));
    if (filters.strike) p.set("strike", String(filters.strike));
    if (filters.expiry) p.set("expiry", filters.expiry);
    if (filters.sentiment && filters.sentiment !== "ALL") p.set("sentiment", filters.sentiment);
    if (filters.orderType && filters.orderType !== "ALL") p.set("orderType", filters.orderType);
    const res = await fetch(`/api/flow/history?${p}`);
    const json = (await res.json()) as ApiEnvelope<{ events: LiveFlowEvent[] }>;
    if (json.ok && json.data) setEvents(json.data.events);
    setLoading(false);
  };

  return (
    <Card className="card-3d">
      <CardHeader className="pb-3 space-y-3">
        <CardTitle className="headline text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Historical Flow Search · {symbol}
          <Badge variant="secondary" className="text-[10px]">SAMPLE ARCHIVE 2017-PRESENT</Badge>
        </CardTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">From</Label>
            <Input type="date" min="2017-01-01" value={from} className="h-8 w-36 text-xs"
              onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">To</Label>
            <Input type="date" value={to} className="h-8 w-36 text-xs"
              onChange={(e) => setTo(e.target.value)} />
          </div>
          <FlowFilters value={filters} onChange={setFilters} />
          <Button size="sm" className="h-8 gap-1 text-xs font-bold" onClick={search} disabled={loading}>
            <Search className="h-3 w-3" />
            Search
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && <Skeleton className="h-24 w-full" />}
        {!loading && events !== null && events.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No archive prints match.</p>
        )}
        {!loading && events && events.length > 0 && (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Date</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead>Sentiment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id} className="text-xs tabular">
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {e.time.slice(0, 10)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-semibold">{e.contract}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-primary/40 text-[9px]">{e.orderType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{e.size.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold gold-text">{fmt(e.premium)}</TableCell>
                    <TableCell
                      className={
                        e.sentiment === "BULLISH"
                          ? "text-emerald-400"
                          : e.sentiment === "BEARISH"
                            ? "text-red-400"
                            : "text-muted-foreground"
                      }
                    >
                      {e.sentiment}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
