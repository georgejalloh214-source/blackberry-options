"use client";

import { StockQuote } from "@/types";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PriceChart({ quote }: { quote: StockQuote }) {
  const points = useMemo(() => {
    const range = Math.max(quote.dayHigh - quote.dayLow, quote.price * 0.01);
    return Array.from({ length: 20 }, (_, index) => {
      const progress = index / 19;
      const wave = Math.sin(index * 1.7) * range * 0.12;
      const value = quote.prevClose + (quote.price - quote.prevClose) * progress + wave;
      return { time: `${String(9 + Math.floor(index / 3)).padStart(2, "0")}:${String((index * 20) % 60).padStart(2, "0")}`, value: Math.max(quote.dayLow, Math.min(quote.dayHigh, value)) };
    });
  }, [quote]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="hsl(220 45% 22% / 0.55)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "hsl(220 20% 70%)", fontSize: 9 }} tickLine={false} interval={4} />
          <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "hsl(220 20% 70%)", fontSize: 9 }} tickFormatter={(value) => `$${Number(value).toFixed(0)}`} width={38} />
          <Tooltip contentStyle={{ background: "hsl(220 72% 10%)", border: "1px solid hsl(220 45% 22%)", borderRadius: 8, fontSize: 11 }} formatter={(value) => [`$${Number(value).toFixed(2)}`, quote.symbol]} />
          <Line type="monotone" dataKey="value" stroke="hsl(43 65% 57%)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
