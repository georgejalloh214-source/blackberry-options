"use client";

import { AutoExitToggle } from "@/components/AutoExitToggle";
import { Disclaimer } from "@/components/disclaimer";
import { Header } from "@/components/header";
import { PaperAccount } from "@/components/PaperAccount";
import { PaperTradingPanel } from "@/components/paper-trading-panel";
import { TradeJournal } from "@/components/TradeJournal";
import { useState } from "react";

export default function PaperTradingPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <Header asOf={null} />
      <PaperAccount refreshKey={refreshKey} />
      <AutoExitToggle onTradeClosed={bump} />
      <PaperTradingPanel refreshKey={refreshKey} />
      <TradeJournal refreshKey={refreshKey} />
      <Disclaimer />
    </div>
  );
}
