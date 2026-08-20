"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { filterJournal, journalToCsv, toJournalEntries } from "@/lib/tradeJournal";
import { ApiEnvelope, PaperPosition } from "@/types";
import { JournalFilters } from "@/types/features";
import { BookOpen, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function TradeJournal({ refreshKey = 0 }: { refreshKey?: number }) {
  const [closed, setClosed] = useState<PaperPosition[]>([]);
  const [filters, setFilters] = useState<JournalFilters>({});

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/paper-trading/history");
      const json = (await res.json()) as ApiEnvelope<{ positions: PaperPosition[] }>;
      if (json.ok && json.data) setClosed(json.data.positions);
    })();
  }, [refreshKey]);

  const entries = useMemo(
    () => filterJournal(toJournalEntries(closed), filters),
    [closed, filters]
  );

  const exportCsv = () => {
    const blob = new Blob([journalToCsv(entries)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blackberry-trade-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="card-3d">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="headline text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Trade Journal
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Symbol"
              className="h-8 w-24 text-xs tabular"
              onChange={(e) =>
                setFilters((f) => ({ ...f, symbol: e.target.value.toUpperCase() || undefined }))
              }
            />
            <Select
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, result: v === "ALL" ? undefined : (v as "WIN" | "LOSS") }))
              }
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="WIN">Wins</SelectItem>
                <SelectItem value="LOSS">Losses</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))}
            />
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))}
            />
            <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={exportCsv}>
              <Download className="h-3 w-3" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No closed trades match. Close a paper trade and it lands here automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Contract</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Entry → Exit</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Held</TableHead>
                  <TableHead>Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.id} className="text-xs tabular">
                    <TableCell className="whitespace-nowrap font-semibold">{e.contract}</TableCell>
                    <TableCell>{e.strategy.replace(/_/g, " ")}</TableCell>
                    <TableCell>{e.side}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      ${e.entryPrice.toFixed(2)} → ${e.exitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${
                        e.realizedPnl >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      ${e.realizedPnl.toFixed(0)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[9px] ${
                          e.result === "WIN"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : e.result === "LOSS"
                              ? "bg-red-500/20 text-red-400"
                              : ""
                        }`}
                      >
                        {e.result}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{e.holdDays}d</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(e.closedAt).toLocaleDateString()}
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
