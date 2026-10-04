"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiEnvelope } from "@/types";
import {
  ArrowDown,
  ArrowUp,
  BookOpenText,
  CalendarDays,
  LoaderCircle,
  Scale,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type AssistantTask = "analysis" | "option-explainer" | "trade-thesis" | "earnings-copilot";
type OptionType = "CALL" | "PUT";

interface AssistantResult {
  market: {
    quote: {
      price: number;
      currency: string;
      changePercent: number | null;
      volume: number | null;
      marketCap: number | null;
      asOf: string | null;
    };
    movingAverages: {
      average20Day: number | null;
      average50Day: number | null;
    };
  };
  answer: unknown;
}

const modes: Array<{ id: AssistantTask; label: string; icon: typeof Sparkles }> = [
  { id: "analysis", label: "AI Analysis", icon: Sparkles },
  { id: "option-explainer", label: "Explain Option", icon: BookOpenText },
  { id: "trade-thesis", label: "Trade Thesis", icon: Scale },
  { id: "earnings-copilot", label: "Earnings", icon: CalendarDays },
];

function labelize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function AnswerValue({ value }: { value: unknown }) {
  if (typeof value === "string" || typeof value === "number") {
    return <p className="text-sm leading-relaxed text-foreground/90">{String(value)}</p>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <p className="text-sm text-muted-foreground">No material signals identified.</p>;
    return <ul className="space-y-1.5 text-sm leading-relaxed text-foreground/90">
      {value.map((item, index) => <li key={index} className="flex gap-2"><span className="text-primary">•</span><span>{typeof item === "string" || typeof item === "number" ? String(item) : JSON.stringify(item)}</span></li>)}
    </ul>;
  }
  if (value && typeof value === "object") {
    return <div className="space-y-3">
      {Object.entries(value).map(([key, item]) => (
        <section key={key} className="space-y-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary">{labelize(key)}</h4>
          <AnswerValue value={item} />
        </section>
      ))}
    </div>;
  }
  return <p className="text-sm text-muted-foreground">No response.</p>;
}

function money(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export function AIAnalysisPanel({ symbol }: { symbol: string }) {
  const [task, setTask] = useState<AssistantTask>("analysis");
  const [strike, setStrike] = useState("");
  const [expiration, setExpiration] = useState(() => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  const [optionType, setOptionType] = useState<OptionType>("CALL");
  const [iv, setIv] = useState("");
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [symbol]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          task,
          ...(task === "option-explainer" ? {
            contract: {
              strike: Number(strike),
              expiration,
              optionType,
              impliedVolatility: iv.trim() ? Number(iv) : null,
            },
          } : {}),
        }),
      });
      const payload = await response.json() as ApiEnvelope<AssistantResult>;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || "The AI request could not be completed.");
      }
      setResult(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The AI request could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="card-3d card-3d-gold">
      <CardHeader className="gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="headline flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Market Desk
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{symbol} · Yahoo Finance data + Magica AI</p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/40 text-[10px]">Decision support only</Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="tablist" aria-label="AI tools">
          {modes.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              role="tab"
              aria-selected={task === id}
              variant={task === id ? "default" : "outline"}
              className="h-9 justify-start gap-2 px-2 text-xs sm:px-3"
              onClick={() => { setTask(id); setResult(null); setError(null); }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </Button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {task === "option-explainer" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="ai-strike" className="text-xs">Strike</Label>
                <Input id="ai-strike" type="number" min="0.01" step="any" required value={strike} onChange={(event) => setStrike(event.target.value)} placeholder="180" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-expiration" className="text-xs">Expiration</Label>
                <Input id="ai-expiration" type="date" required value={expiration} onChange={(event) => setExpiration(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contract type</Label>
                <div className="grid h-10 grid-cols-2 rounded-md border border-input p-1">
                  {(["CALL", "PUT"] as const).map((type) => (
                    <Button key={type} type="button" size="sm" variant={optionType === type ? "default" : "ghost"} className="h-full text-xs" onClick={() => setOptionType(type)}>
                      {type === "CALL" ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}{type}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ai-iv" className="text-xs">Implied volatility (%)</Label>
                <Input id="ai-iv" type="number" min="0" max="100" step="any" value={iv} onChange={(event) => setIv(event.target.value)} placeholder="65" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={loading || (task === "option-explainer" && !strike)} className="gap-2">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Working…" : modes.find((mode) => mode.id === task)?.label}
            </Button>
            {task === "trade-thesis" && <span className="text-xs text-muted-foreground">Includes a Yahoo options-chain snapshot when available.</span>}
          </div>
        </form>

        {error && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        {result && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <MarketStat label="Price" value={money(result.market.quote.price)} />
              <MarketStat label="Change" value={result.market.quote.changePercent == null ? "—" : `${result.market.quote.changePercent.toFixed(2)}%`} />
              <MarketStat label="Volume" value={result.market.quote.volume?.toLocaleString() ?? "—"} />
              <MarketStat label="Market cap" value={money(result.market.quote.marketCap)} />
              <MarketStat label="20-day avg" value={money(result.market.movingAverages.average20Day)} />
              <MarketStat label="50-day avg" value={money(result.market.movingAverages.average50Day)} />
            </div>
            <div className="rounded-md border border-border/70 bg-muted/20 p-4">
              <AnswerValue value={result.answer} />
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Yahoo Finance data may be delayed or incomplete. AI output can be inaccurate and is not investment advice.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MarketStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 border-l-2 border-primary/50 pl-2">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="truncate text-sm font-semibold tabular-nums">{value}</p>
  </div>;
}