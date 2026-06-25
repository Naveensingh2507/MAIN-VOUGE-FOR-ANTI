import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Sparkles, MapPin, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/state/AppState";
import { suggestOutfit, analyzeSynergy, type AnalyzeResponse } from "@/utils/apiClient";

const PRESETS = ["Social Cafe", "Office", "Date Night", "Weekend", "Formal"];

export default function EventPage() {
  const { matchmakerSession, setMatchmakerSession, wardrobeInventory, userProfile, requireAuth } = useAppState();
  const [customEvent, setCustomEvent] = useState("");
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);

  const activeEvent = matchmakerSession.eventContext;

  const handlePreset = (e: string) => {
    setMatchmakerSession({ eventContext: e });
    setCustomEvent("");
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customEvent.trim()) {
      setMatchmakerSession({ eventContext: customEvent.trim() });
    }
  };

  const generate = async () => {
    if (!requireAuth("Sign in so AI can generate an event-ready outfit for you.", "/event")) return;
    setBusy(true);
    try {
      // 1. Suggest an outfit based on a random starting point if nothing is locked, or just lock the top if it exists.
      let top = matchmakerSession.selectedTop;
      if (!top) {
        const tops = wardrobeInventory.filter(g => g.category === "Topwear");
        if (tops.length > 0) {
          top = tops[Math.floor(Math.random() * tops.length)];
          setMatchmakerSession({ selectedTop: top });
        }
      }

      if (top) {
        const r = await suggestOutfit(
          { locked_item_id: top.id, inventory_ids: wardrobeInventory.map(g => g.id) },
          wardrobeInventory
        );
        const bottom = wardrobeInventory.find(g => g.id === r.suggested_bottom_id) ?? null;
        const foot = wardrobeInventory.find(g => g.id === r.suggested_footwear_id) ?? null;
        setMatchmakerSession({ selectedBottom: bottom, selectedFootwear: foot });
      }

      // 2. Score it
      const a = await analyzeSynergy({
        outfit: {
          top_id: matchmakerSession.selectedTop?.id ?? top?.id ?? null,
          bottom_id: matchmakerSession.selectedBottom?.id ?? null,
          footwear_id: matchmakerSession.selectedFootwear?.id ?? null,
        },
        user_profile: {
          skin_tone_hex: userProfile.skinToneHex,
          measurements: userProfile.measurements,
          build_type: userProfile.buildType,
        },
        event_context: matchmakerSession.eventContext,
      }, wardrobeInventory); // Handed wardrobeInventory to the updated API engine
      setAnalysis(a);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <section className="mb-6 animate-fade-up">
        <div className="flex items-start justify-between">
          <div>
            <Link to="/style" className="mb-3 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-foreground">
              <ChevronLeft className="h-4 w-4" /> Style Studio
            </Link>
            <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Event Context</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-on-surface-variant">Where are you heading? We'll curate a look specifically for the environment.</p>
      </section>

      <section className="mb-8 animate-fade-up">
        <form onSubmit={handleCustomSubmit} className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={customEvent}
            onChange={(e) => setCustomEvent(e.target.value)}
            placeholder="Type a custom event..."
            className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-5 text-sm outline-none transition-colors focus:border-primary/50"
          />
          {customEvent.trim() && (
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Set
            </button>
          )}
        </form>

        <p className="label-caps mb-3 text-on-surface-variant">Or pick a preset</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((e) => (
            <button
              key={e}
              onClick={() => handlePreset(e)}
              className={[
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                activeEvent === e
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/30"
              ].join(" ")}
            >
              <MapPin className="h-3.5 w-3.5" />
              {e}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8 animate-fade-up">
        <button
          onClick={generate}
          disabled={busy || wardrobeInventory.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <Sparkles className={`h-5 w-5 ${busy ? "animate-spin" : ""}`} strokeWidth={1.8} />
          <span className="label-caps font-bold">{busy ? "Synthesizing..." : "Generate Outfit"}</span>
        </button>
        {wardrobeInventory.length === 0 && (
          <p className="mt-2 text-center text-xs text-red-500">Add items to your closet first.</p>
        )}
      </section>

      {analysis && (
        <section className="animate-fade-up space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="label-caps mb-3 text-primary">Recommended Pairing</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                {matchmakerSession.selectedTop ? (
                  <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2">
                    <div className="h-12 w-12 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${matchmakerSession.selectedTop.imageUrl})` }} />
                    <p className="text-sm font-semibold">{matchmakerSession.selectedTop.name}</p>
                  </div>
                ) : <p className="text-sm text-on-surface-variant">No top found</p>}
              </div>
              <span className="text-xl font-bold text-outline-variant">+</span>
              <div className="flex-1">
                {matchmakerSession.selectedBottom ? (
                  <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-2">
                    <div className="h-12 w-12 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${matchmakerSession.selectedBottom.imageUrl})` }} />
                    <p className="text-sm font-semibold">{matchmakerSession.selectedBottom.name}</p>
                  </div>
                ) : <p className="text-sm text-on-surface-variant">No bottom found</p>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="label-caps text-on-surface-variant">Synergy Score for {activeEvent}</p>
            <div className="mt-3 inline-flex items-baseline gap-1">
              <span className="text-6xl font-extrabold leading-none text-primary">{analysis.synergy_score.total}</span>
              <span className="text-2xl font-bold text-primary">%</span>
            </div>
          </div>

          <div className="rounded-2xl bg-primary-container/40 p-5">
            <p className="label-caps mb-2 text-primary">Editorial Feedback</p>
            <p className="text-sm leading-relaxed text-on-primary-container">
              {analysis.editorial_feedback}
            </p>
          </div>
        </section>
      )}
    </AppShell>
  );
}