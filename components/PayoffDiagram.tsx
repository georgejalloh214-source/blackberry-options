"use client";

import { PayoffPoint } from "@/lib/bot/payoff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";

export function PayoffDiagram({ data }: { data: PayoffPoint[] }) {
  return (
    <Card className="card-3d">
      <CardHeader className="pb-2"><CardTitle className="headline flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-primary" /> Risk / Payoff at Expiration</CardTitle></CardHeader>
      <CardContent>
        {!data.length ? <p className="py-8 text-center text-xs text-muted-foreground">A recommendation is needed to plot payoff.</p> : <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}><CartesianGrid stroke="hsl(220 45% 22% / 0.55)" vertical={false} /><XAxis dataKey="price" tick={{ fill: "hsl(220 20% 70%)", fontSize: 9 }} tickFormatter={(value) => `$${value}`} /><YAxis tick={{ fill: "hsl(220 20% 70%)", fontSize: 9 }} tickFormatter={(value) => `$${Math.round(value)}`} width={42} /><Tooltip contentStyle={{ background: "hsl(220 72% 10%)", border: "1px solid hsl(220 45% 22%)", borderRadius: 8, fontSize: 11 }} formatter={(value) => [`$${Number(value).toFixed(0)}`, "P/L"]} labelFormatter={(value) => `Underlying $${value}`} /><ReferenceLine y={0} stroke="hsl(220 20% 70% / 0.6)" /><Area type="monotone" dataKey="payoff" stroke="hsl(43 65% 57%)" fill="hsl(43 65% 57% / 0.16)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>}
      </CardContent>
    </Card>
  );
}
