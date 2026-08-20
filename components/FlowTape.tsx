"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FlowFiltersState } from "@/types/features";

export const DEFAULT_FLOW_FILTERS: FlowFiltersState = {
  minPremium: 0,
  sentiment: "ALL",
  orderType: "ALL",
  venue: "ALL",
};

export function FlowFilters({
  value,
  onChange,
  showVenue = false,
}: {
  value: FlowFiltersState;
  onChange: (f: FlowFiltersState) => void;
  showVenue?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Min premium ($)</Label>
        <Input
          type="number"
          className="h-8 w-28 text-xs tabular"
          value={value.minPremium || ""}
          placeholder="0"
          onChange={(e) => onChange({ ...value, minPremium: Number(e.target.value) || 0 })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Strike</Label>
        <Input
          type="number"
          className="h-8 w-24 text-xs tabular"
          value={value.strike ?? ""}
          placeholder="any"
          onChange={(e) =>
            onChange({ ...value, strike: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Expiration</Label>
        <Input
          type="date"
          className="h-8 w-36 text-xs"
          onChange={(e) => onChange({ ...value, expiry: e.target.value || undefined })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Sentiment</Label>
        <Select
          value={value.sentiment ?? "ALL"}
          onValueChange={(v) => onChange({ ...value, sentiment: v as FlowFiltersState["sentiment"] })}
        >
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="BULLISH">Bullish</SelectItem>
            <SelectItem value="NEUTRAL">Neutral</SelectItem>
            <SelectItem value="BEARISH">Bearish</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Order type</Label>
        <Select
          value={value.orderType ?? "ALL"}
          onValueChange={(v) => onChange({ ...value, orderType: v as FlowFiltersState["orderType"] })}
        >
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="SWEEP">Sweeps</SelectItem>
            <SelectItem value="BLOCK">Blocks</SelectItem>
            <SelectItem value="SPLIT">Splits</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {showVenue && (
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Venue</Label>
          <Select
            value={value.venue ?? "ALL"}
            onValueChange={(v) => onChange({ ...value, venue: v as FlowFiltersState["venue"] })}
          >
            <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="LIT">Lit</SelectItem>
              <SelectItem value="DARK">Dark</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
