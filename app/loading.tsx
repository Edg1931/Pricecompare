// Default route-transition skeleton. Every page is force-dynamic (DB-backed),
// so without this each navigation freezes on the previous screen with no
// feedback — especially painful on slow store wifi.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-7">
      <div className="h-44 rounded-3xl border border-border bg-surface/50" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 rounded-2xl border border-border bg-surface/50" />
        <div className="h-20 rounded-2xl border border-border bg-surface/50" />
        <div className="h-20 rounded-2xl border border-border bg-surface/50" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl border border-border bg-surface/50" />
        ))}
      </div>
    </div>
  );
}
