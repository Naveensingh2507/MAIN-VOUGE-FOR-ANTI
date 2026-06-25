import { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Sparkles, RefreshCw, ChevronRight, X, Footprints, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState, type Garment, type GarmentCategory } from "@/state/AppState";
import { suggestOutfit, analyzeSynergy, type AnalyzeResponse } from "@/utils/apiClient";

export default function MatchabilityPage() {
  const { matchmakerSession, setMatchmakerSession, wardrobeInventory, userProfile, requireAuth } = useAppState();
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const location = useLocation();
  const [forkPrompt, setForkPrompt] = useState<GarmentCategory | null>(location.state?.fork ?? null);

  const cycleSlot = (category: GarmentCategory, current: Garment | null) => {
    const options = wardrobeInventory.filter((g) => g.category === category);
    if (options.length === 0) return;
    const idx = current ? options.findIndex((o) => o.id === current.id) : -1;
    const next = options[(idx + 1) % options.length];
    if (category === "Topwear") setMatchmakerSession({ selectedTop: next });
    if (category === "Bottomwear") setMatchmakerSession({ selectedBottom: next });
    if (category === "Footwear") setMatchmakerSession({ selectedFootwear: next });
  };

  const setSlot = (cat: GarmentCategory, g: Garment) => {
    if (!requireAuth("Sign in to start matching pieces from your closet.", "/matchability")) return;
    if (cat === "Topwear") {
      setMatchmakerSession({ selectedTop: g });
      if (!matchmakerSession.selectedBottom && forkPrompt !== "Bottomwear") setForkPrompt("Bottomwear");
    }
    if (cat === "Bottomwear") {
      setMatchmakerSession({ selectedBottom: g });
      if (!matchmakerSession.selectedTop && forkPrompt !== "Topwear") setForkPrompt("Topwear");
    }
    if (cat === "Footwear") setMatchmakerSession({ selectedFootwear: g });
  };

  const handleForkChoice = async (choice: "ai" | "manual") => {
    const target = forkPrompt;
    setForkPrompt(null);
    if (!target) return;

    if (choice === "ai") {
      await autoSuggest();
    } else {
      cycleSlot(target, target === "Topwear" ? matchmakerSession.selectedTop : matchmakerSession.selectedBottom);
    }
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
        <Slot label="Top" item={matchmakerSession.selectedTop} category="Topwear" onPick={setSlot} inventory={wardrobeInventory} />
        <Slot label="Bottom" item={matchmakerSession.selectedBottom} category="Bottomwear" onPick={setSlot} inventory={wardrobeInventory} />
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
            <Slot label="Footwear" item={matchmakerSession.selectedFootwear} category="Footwear" onPick={setSlot} inventory={wardrobeInventory} wide />
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
          onClick={autoSuggest}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-full border border-primary/30 px-6 py-3 text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} strokeWidth={1.8} />
          <span className="label-caps">Auto-fill alternatives</span>
        </button>
        <button
          onClick={analyze}
          disabled={busy}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
          <span className="label-caps">Analyze Synergy</span>
        </button>
      </div>

      {analysis && (
        <>
          <section className="mt-8 animate-fade-up rounded-2xl border border-border bg-card p-6 text-center">
            <p className="label-caps text-on-surface-variant">Synergy Score</p>
            <div className="mt-3 inline-flex items-baseline gap-1">
              <span className="text-6xl font-extrabold leading-none text-primary">{analysis.synergy_score.total}</span>
              <span className="text-2xl font-bold text-primary">%</span>
            </div>
            <div className="mx-auto mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
              <div className="h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${analysis.synergy_score.total}%` }} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-left">
              <Metric label="Harmony" value={analysis.synergy_score.harmony} />
              <Metric label="Vibe" value={analysis.synergy_score.vibe} />
            </div>
          </section>

          <section className="mt-4 animate-fade-up rounded-2xl border border-border bg-card p-6">
            <p className="label-caps mb-2 text-on-surface-variant">Evaluation Summary</p>
            <p className="text-base font-semibold">Silhouette Harmony <span className="ml-1 text-xs font-medium text-primary">Optimal</span></p>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{analysis.editorial_feedback}</p>
          </section>

          <section className="mt-4 animate-fade-up rounded-2xl bg-primary-container/40 p-5">
            <p className="label-caps mb-2 text-primary">Event Outcome — {matchmakerSession.eventContext}</p>
            <p className="text-sm leading-relaxed text-on-primary-container">
              This composition signals effortless authority in {matchmakerSession.eventContext.toLowerCase()} environments — textural contrast carries the look without overreach.
            </p>
          </section>
        </>
      )}

      {/* AI vs Manual Fork Modal */}
      {forkPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-fade-in">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setForkPrompt(null)} />
          <div className="relative w-full max-w-md rounded-t-3xl bg-card p-6 shadow-ambient animate-slide-up sm:rounded-3xl">
            <button onClick={() => setForkPrompt(null)} aria-label="Close" className="absolute right-6 top-6 text-on-surface-variant hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <p className="label-caps text-primary">Next step</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Complete the look</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Your {forkPrompt === "Topwear" ? "Bottomwear" : "Topwear"} is locked in. How do you want to find a matching {forkPrompt === "Topwear" ? "top" : "bottom"}?
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => handleForkChoice("ai")}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                <span className="label-caps">Let AI do the work</span>
              </button>
              <button
                onClick={() => handleForkChoice("manual")}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant px-6 py-4 text-foreground transition-colors hover:bg-surface-container-low"
              >
                <span className="label-caps">Choose from your wardrobe yourself</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Slot({
  label, item, category, inventory, onPick, wide = false,
}: {
  label: string;
  item: Garment | null;
  category: GarmentCategory;
  inventory: Garment[];
  onPick: (cat: GarmentCategory, g: Garment) => void;
  wide?: boolean;
}) {
  const options = inventory.filter((g) => g.category === category);
  const cycle = () => {
    if (options.length === 0) return;
    const idx = item ? options.findIndex((o) => o.id === item.id) : -1;
    onPick(category, options[(idx + 1) % options.length]);
  };
  return (
    <div className={wide ? "col-span-2" : ""}>
      {!wide && <p className="label-caps mb-2 text-on-surface-variant">{label}</p>}
      <button
        onClick={cycle}
        className={[
          "group block w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-colors hover:border-primary/40",
        ].join(" ")}
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
          </div>
        ) : (
          <div className={`flex items-center justify-center text-center text-xs text-on-surface-variant ${wide ? "aspect-[21/9]" : "aspect-square"} px-3`}>
            Tap to choose {label.toLowerCase()}
          </div>
        )}
      </button>
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