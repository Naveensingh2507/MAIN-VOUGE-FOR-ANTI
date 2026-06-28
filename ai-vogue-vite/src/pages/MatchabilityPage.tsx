import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, RefreshCw, ChevronRight, X, Footprints, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState, type Garment, type GarmentCategory } from "@/state/AppState";
import { suggestOutfit, analyzeSynergy, type AnalyzeResponse } from "@/utils/apiClient";

export default function MatchabilityPage() {
  const { matchmakerSession, setMatchmakerSession, wardrobeInventory, userProfile, requireAuth } = useAppState();
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  
  // State for the Garment Picker modal
  const [pickerCategory, setPickerCategory] = useState<GarmentCategory | null>(null);

  const handlePick = (g: Garment) => {
    if (!pickerCategory) return;
    if (pickerCategory === "Topwear") setMatchmakerSession({ selectedTop: g });
    if (pickerCategory === "Bottomwear") setMatchmakerSession({ selectedBottom: g });
    if (pickerCategory === "Footwear") setMatchmakerSession({ selectedFootwear: g });
    setPickerCategory(null);
  };

  const autoSuggest = async () => {
    if (!requireAuth("Sign in so AI can fill the rest of your outfit.", "/matchability")) return;
    const locked = matchmakerSession.selectedTop ?? matchmakerSession.selectedBottom ?? matchmakerSession.selectedFootwear;
    if (!locked) return;
    setBusy(true);
    try {
      const r = await suggestOutfit(
        { locked_item_id: locked.id, inventory_ids: wardrobeInventory.map((g) => g.id) },
        wardrobeInventory,
      );
      if (r.status === "failure" || r.status === "error") {
        alert(r.error || r.error_message || "Not enough items in inventory to suggest an outfit.");
        return;
      }
      const bottom = wardrobeInventory.find((g) => g.id === r.suggested_bottom_id) ?? null;
      const foot = wardrobeInventory.find((g) => g.id === r.suggested_footwear_id) ?? null;
      setMatchmakerSession({
        selectedBottom: matchmakerSession.selectedBottom ?? bottom,
        selectedFootwear: matchmakerSession.includeFootwear ? (matchmakerSession.selectedFootwear ?? foot) : matchmakerSession.selectedFootwear,
      });
    } finally {
      setBusy(false);
    }
  };

  const analyze = async () => {
    if (!requireAuth("Sign in to get your AI matchability score.", "/matchability")) return;
    setBusy(true);
    try {
      const r = await analyzeSynergy({
        outfit: {
          top_id: matchmakerSession.selectedTop?.id ?? null,
          bottom_id: matchmakerSession.selectedBottom?.id ?? null,
          footwear_id: matchmakerSession.includeFootwear ? (matchmakerSession.selectedFootwear?.id ?? null) : null,
        },
        user_profile: {
          skin_tone_hex: userProfile.skinToneHex,
          measurements: userProfile.measurements,
          build_type: userProfile.buildType,
        },
        event_context: matchmakerSession.eventContext,
      }, wardrobeInventory); // Handed wardrobeInventory to the updated API engine
      
      if (!r.synergy_score) {
        alert(r.error || r.error_message || "AI could not analyze this combination.");
        return;
      }
      setAnalysis(r);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <section className="mb-6 animate-fade-up">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to="/style" className="mb-2 inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-foreground">
              <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Style Studio
            </Link>
            <p className="label-caps text-primary">Intelligence Report // 042</p>
            <h1 className="mt-1 text-[34px] font-extrabold leading-tight tracking-tight">Matchability</h1>
          </div>
          <Link
            to="/event"
            className="mt-7 flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            Event <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">
          Select a top and bottom — AI fills any gap and scores how well they work together.
        </p>
      </section>

      {/* Side-by-side slots */}
      <div className="grid grid-cols-2 gap-3">
        <Slot 
          label="Top" 
          item={matchmakerSession.selectedTop} 
          onOpenPicker={() => setPickerCategory("Topwear")} 
          onAutoFill={autoSuggest}
          showAutoFill={!!matchmakerSession.selectedBottom} // Can AI choose top? Yes, if bottom is selected
        />
        <Slot 
          label="Bottom" 
          item={matchmakerSession.selectedBottom} 
          onOpenPicker={() => setPickerCategory("Bottomwear")} 
          onAutoFill={autoSuggest}
          showAutoFill={!!matchmakerSession.selectedTop} // Can AI choose bottom? Yes, if top is selected
        />
      </div>

      {/* Optional footwear */}
      <div className="mt-4">
        {matchmakerSession.includeFootwear ? (
          <div className="animate-fade-up">
            <div className="mb-2 flex items-center justify-between">
              <p className="label-caps text-on-surface-variant">Footwear</p>
              <button
                onClick={() => setMatchmakerSession({ includeFootwear: false, selectedFootwear: null })}
                className="text-xs font-semibold text-on-surface-variant hover:text-foreground"
              >
                Remove
              </button>
            </div>
            <Slot 
              label="Footwear" 
              item={matchmakerSession.selectedFootwear} 
              onOpenPicker={() => setPickerCategory("Footwear")} 
              onAutoFill={autoSuggest}
              showAutoFill={!!matchmakerSession.selectedTop || !!matchmakerSession.selectedBottom} 
              wide 
            />
          </div>
        ) : (
          <button
            onClick={() => setMatchmakerSession({ includeFootwear: true })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/30 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            <Footprints className="h-4 w-4" strokeWidth={1.8} />
            Add footwear (optional)
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={analyze}
          disabled={busy || !matchmakerSession.selectedTop || !matchmakerSession.selectedBottom}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
          <span className="label-caps">Analyze Synergy</span>
        </button>
      </div>

      {analysis && (
        <>
          <section className="mt-8 animate-fade-up rounded-2xl border border-border bg-card p-6 text-center shadow-ambient">
            <p className="label-caps text-on-surface-variant">Synergy Score</p>
            <div className="mt-3 inline-flex items-baseline gap-1">
              <span className="text-6xl font-extrabold leading-none text-primary">{analysis.synergy_score.total}</span>
              <span className="text-2xl font-bold text-primary">%</span>
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">{analysis.score_verdict}</p>
            <div className="mx-auto mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
              <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${analysis.synergy_score.total}%` }} />
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 text-left">
              <Metric label="Color Harmony" value={analysis.synergy_score.color_harmony} />
              <Metric label="Formality" value={analysis.synergy_score.formality_match} />
              <Metric label="Pattern Bal." value={analysis.synergy_score.pattern_balance} />
              <Metric label="Context Fit" value={analysis.synergy_score.context_fit} />
            </div>
          </section>

          <section className="mt-4 animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-ambient">
            <p className="label-caps mb-4 text-on-surface-variant">Editor's Take</p>
            <p className="text-lg font-bold italic text-foreground">"{analysis.styling_verdict}"</p>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-bold text-foreground">Color & Formality</p>
                <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{analysis.color_analysis} {analysis.formality_analysis}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Styling Details</p>
                <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{analysis.editorial_feedback}</p>
              </div>
            </div>
          </section>

          {analysis.quick_tips && analysis.quick_tips.length > 0 && (
            <section className="mt-4 animate-fade-up rounded-2xl bg-primary-container/40 p-5 shadow-ambient">
              <p className="label-caps mb-3 text-primary">Quick Tips</p>
              <ul className="flex flex-col gap-2">
                {analysis.quick_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-on-primary-container">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {/* Garment Picker Modal */}
      {pickerCategory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-fade-in">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setPickerCategory(null)} />
          <div className="relative flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card p-6 shadow-ambient animate-slide-up sm:h-[600px] sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between shrink-0">
              <div>
                <p className="label-caps text-primary">Wardrobe</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight">Select {pickerCategory}</h2>
              </div>
              <button onClick={() => setPickerCategory(null)} aria-label="Close" className="text-on-surface-variant hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pb-6">
              <div className="grid grid-cols-2 gap-3">
                {wardrobeInventory.filter((g) => g.category === pickerCategory).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handlePick(g)}
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface-container transition-colors hover:border-primary/50"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                      style={{ backgroundImage: `url(${g.imageUrl})` }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-left">
                      <p className="truncate text-xs font-bold text-white">{g.name}</p>
                    </div>
                  </button>
                ))}
              </div>
              {wardrobeInventory.filter((g) => g.category === pickerCategory).length === 0 && (
                <div className="mt-10 text-center text-sm text-on-surface-variant">
                  <p>You don't have any {pickerCategory} yet.</p>
                  <Link to="/studio" className="mt-2 inline-block text-primary underline">Go to Studio to add some</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Slot({
  label, item, onOpenPicker, onAutoFill, showAutoFill, wide = false,
}: {
  label: string;
  item: Garment | null;
  onOpenPicker: () => void;
  onAutoFill: () => void;
  showAutoFill: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      {!wide && <p className="label-caps mb-2 text-on-surface-variant">{label}</p>}
      <div
        className={[
          "group relative block w-full overflow-hidden rounded-2xl border bg-card text-left transition-all duration-300",
          item ? "border-border hover:border-primary/40 cursor-pointer" : "border-dashed border-primary/30 bg-primary/5",
        ].join(" ")}
        onClick={item ? onOpenPicker : undefined}
      >
        {item ? (
          <div className={`relative w-full ${wide ? "aspect-[21/9]" : "aspect-square"}`}>
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: `url(${item.imageUrl})` }}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
              <p className="truncate text-sm font-bold text-white">{item.name}</p>
            </div>
            <div className="absolute right-2 top-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md transition-colors group-hover:bg-black/70 flex items-center gap-1.5 shadow-sm border border-white/10">
              <RefreshCw className="h-3 w-3 text-white" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-white">Change</span>
            </div>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center gap-3 p-4 text-center ${wide ? "aspect-[21/9]" : "aspect-square"}`}>
            <button
              onClick={onOpenPicker}
              className="w-full rounded-full border border-outline-variant bg-background py-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant transition-colors hover:border-primary/50 hover:text-foreground"
            >
              Select {label}
            </button>
            {showAutoFill && (
              <button
                onClick={onAutoFill}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-3 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="h-3.5 w-3.5" /> Let AI Choose
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-3">
      <p className="label-caps text-on-surface-variant">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-primary">{value}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full bg-primary transition-[width] duration-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}