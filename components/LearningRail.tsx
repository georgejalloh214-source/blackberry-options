import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CircleHelp, ShieldCheck } from "lucide-react";

const lessons = [
  {
    title: "Greeks in plain English",
    body: "Delta estimates directional sensitivity. Theta measures the option's daily time decay. Vega shows how much price can move when implied volatility changes.",
    icon: CircleHelp,
  },
  {
    title: "Why the bot exits",
    body: "An exit is a risk decision, not a prediction. Profit targets lock in gains while delta, stop-loss, and DTE rules limit exposure when the trade changes shape.",
    icon: ShieldCheck,
  },
  {
    title: "Margin is not max loss",
    body: "Margin is capital reserved by the simulator. Review assignment risk and the strategy's maximum loss before treating buying power as available cash.",
    icon: BookOpen,
  },
];

export function LearningRail() {
  return (
    <Card className="card-3d border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="headline flex items-center gap-2 text-sm">
          <BookOpen className="h-4 w-4 text-primary" />
          Learning Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {lessons.map(({ title, body, icon: Icon }) => (
          <div key={title} className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
              <Icon className="h-3.5 w-3.5" /> {title}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
