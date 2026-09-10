"use client";

import { Disclaimer } from "@/components/disclaimer";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Palette, RotateCcw, Save, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

const defaults = { profitTarget: "25", stopLoss: "2", template: "Credit spread", notifications: true, theme: "Midnight" };

export default function SettingsPage() {
  const [settings, setSettings] = useState(defaults);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("bbo:settings");
    if (stored) setSettings({ ...defaults, ...JSON.parse(stored) });
  }, []);

  const update = (patch: Partial<typeof defaults>) => setSettings((current) => ({ ...current, ...patch }));
  const save = () => { window.localStorage.setItem("bbo:settings", JSON.stringify(settings)); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const reset = () => { setSettings(defaults); window.localStorage.removeItem("bbo:settings"); };

  return <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
    <Header asOf={null} />
    <div><p className="text-xs uppercase tracking-[0.2em] text-primary">Workspace controls</p><h2 className="headline text-2xl">Settings</h2></div>
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="card-3d"><CardHeader><CardTitle className="headline flex items-center gap-2 text-sm"><Settings2 className="h-4 w-4 text-primary" />Bot parameters</CardTitle></CardHeader><CardContent className="space-y-4">
        <Field label="Profit target %" value={settings.profitTarget} onChange={(value) => update({ profitTarget: value })} />
        <Field label="Stop loss x premium" value={settings.stopLoss} onChange={(value) => update({ stopLoss: value })} />
        <div className="space-y-2"><Label>Default strategy template</Label><select value={settings.template} onChange={(event) => update({ template: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>Credit spread</option><option>Debit spread</option><option>Iron condor</option><option>Covered call</option></select></div>
      </CardContent></Card>
      <Card className="card-3d"><CardHeader><CardTitle className="headline flex items-center gap-2 text-sm"><Palette className="h-4 w-4 text-primary" />Experience</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border p-3"><div><p className="text-sm font-semibold">Theme</p><p className="text-xs text-muted-foreground">More themes can be added without changing trading data.</p></div><span className="text-xs text-primary">{settings.theme}</span></div>
        <button className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left" onClick={() => update({ notifications: !settings.notifications })}><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /><div><p className="text-sm font-semibold">Notifications</p><p className="text-xs text-muted-foreground">Bot and journal events</p></div></div><span className="text-xs text-primary">{settings.notifications ? "ON" : "OFF"}</span></button>
      </CardContent></Card>
    </div>
    <div className="flex gap-2"><Button onClick={save} className="gap-2"><Save className="h-4 w-4" />{saved ? "Saved" : "Save settings"}</Button><Button variant="outline" onClick={reset} className="gap-2"><RotateCcw className="h-4 w-4" />Reset</Button></div>
    <Disclaimer />
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type="number" value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}
