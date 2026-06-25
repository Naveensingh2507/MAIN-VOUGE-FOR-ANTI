import { useAppState, type Garment } from "@/state/AppState";

export function GarmentCard({ garment, index = 0 }: { garment: Garment; index?: number }) {
  const { setUIState } = useAppState();
  return (
    <button
      onClick={() => setUIState({ activeItemDrawer: garment })}
      className="group relative flex flex-col text-left animate-fade-up"
      style={{ animationDelay: `${Math.min(index * 60, 400)}ms` }}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-surface-container">
        <div
          className="h-full w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url(${garment.imageUrl})` }}
        />
        <span className="absolute right-3 top-3 rounded-full bg-primary-container/95 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-widest text-on-primary-container">
          Extracted
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/85 to-transparent p-4 pt-12">
          <h3 className="label-caps truncate text-foreground">{garment.name}</h3>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm border border-outline-variant"
              style={{ backgroundColor: garment.colorHex }}
            />
            <span className="font-mono text-[10px] text-on-surface-variant">{garment.colorHex.toUpperCase()}</span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-on-surface-variant">
              {garment.category}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}