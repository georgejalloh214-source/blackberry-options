export function SectionHeader({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 border-b border-border pb-2">
      <h2 className="headline text-sm text-foreground">{title}</h2>
      {detail && <p className="text-[10px] text-muted-foreground">{detail}</p>}
    </div>
  );
}
