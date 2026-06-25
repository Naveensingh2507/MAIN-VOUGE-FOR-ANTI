import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Sparkles, UserRound, ArrowRight, Plus, X, CheckCircle2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { GarmentCard } from "../components/GarmentCard";
import { useAppState, type GarmentCategory } from "../state/AppState";
import { fileToBase64 } from "../utils/apiClient";

const FILTERS: ("All" | GarmentCategory)[] = [
  "All",
  "Topwear",
  "Bottomwear",
  "Footwear",
  "Outerwear",
];

export default function HomePage() {
  const { wardrobeInventory, setUIState, userProfile, uiState, requireAuth } = useAppState();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(
    () => (filter === "All" ? wardrobeInventory : wardrobeInventory.filter((g) => g.category === filter)),
    [wardrobeInventory, filter],
  );

  const handleFile = async (file: File) => {
    setProcessing(true);
    try {
      const b64 = await fileToBase64(file);
      setUIState({
        isEditAssetModalOpen: true,
        pendingAsset: {
          name: "New Item",
          imageUrl: b64,
        },
      });
    } finally {
      setProcessing(false);
    }
  };

  const openFilePicker = () => {
    if (!requireAuth("Sign in to add garments to your digital closet.", "/")) return;
    fileRef.current?.click();
  };

  const goMatch = () => {
    if (!requireAuth("Sign in to start matching your wardrobe.", "/style")) return;
    navigate("/style");
  };

  const profileReady =
    userProfile.measurements.shoulders > 0 &&
    userProfile.measurements.waist > 0 &&
    userProfile.measurements.legs > 0;

  // Auto-dismiss profile toast after 4 seconds
  useEffect(() => {
    if (uiState.showProfileSetupToast) {
      const timer = setTimeout(() => {
        setUIState({ showProfileSetupToast: false });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [uiState.showProfileSetupToast, setUIState]);

  return (
    <AppShell>
      <section className="mb-8 animate-fade-up">
        <span className="label-caps text-primary">Archive 01</span>
        <h1 className="mt-2 text-[34px] font-extrabold leading-tight tracking-tight text-foreground">
          Digital Closet
        </h1>
      </section>

      {/* Tell us about yourself — anchored hero card (hidden after initialization) */}
      {!profileReady && (
        <section className="mb-8 animate-fade-up">
          <button
            onClick={() => {
              if (requireAuth("Sign in to build your profile", "/profile?tab=appearance")) {
                navigate("/profile?tab=appearance");
              }
            }}
            className="w-full text-left group flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary-container/40 p-5 transition-all hover:bg-primary-container/60 active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UserRound className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="label-caps text-primary">Step 01</p>
              <p className="mt-1 font-semibold text-foreground">Tell us about yourself</p>
              <p className="mt-0.5 text-sm text-on-surface-variant">
                Skin tone, measurements & build — the foundation of every match.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" />
          </button>
        </section>
      )}

      {/* Match Your Clothes — macro CTA */}
      <section className="mb-8 grid grid-cols-2 gap-3 animate-fade-up">
        <button
          onClick={goMatch}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.8} />
          <span className="label-caps">Match Your Clothes</span>
        </button>
        <button
          onClick={openFilePicker}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-primary/30 px-5 py-4 text-primary transition-colors hover:bg-primary/5 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={1.8} />
          <span className="label-caps">Ingest New</span>
        </button>
      </section>

      <section className="mb-8">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={openFilePicker}
          disabled={processing}
          className="group flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-card transition-all hover:bg-primary/5 active:scale-[0.99] disabled:opacity-60"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-high text-primary transition-transform group-hover:scale-105">
            <Camera className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <p className="label-caps text-foreground">Garment Ingestion</p>
          <p className="max-w-[240px] text-center text-sm text-on-surface-variant">
            {processing ? "AI analyzing garment…" : "Upload or drag garment photos for AI phenotype extraction"}
          </p>
        </button>
      </section>

      <section className="mb-6 -mx-5">
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "label-caps whitespace-nowrap rounded-full px-5 py-2.5 transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary/20 text-primary hover:bg-primary/5",
              ].join(" ")}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        {visible.map((g, i) => (
          <GarmentCard key={g.id} garment={g} index={i} />
        ))}
      </div>
      {visible.length === 0 && (
        <div className="mt-12 flex flex-col items-center text-center animate-fade-up">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-8 w-8" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-bold text-foreground">Start building your digital closet</h3>
          <p className="mt-2 max-w-[260px] text-sm text-on-surface-variant">
            {filter === "All"
              ? "Upload your favorite pieces to unlock AI-powered outfit matching and style analytics."
              : `You haven't added any ${filter.toLowerCase()} yet. Upload some pieces to start matching!`}
          </p>
          <button
            onClick={openFilePicker}
            className="mt-6 flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add First Item
          </button>
        </div>
      )}

      {/* Profile initialized toast */}
      {uiState.showProfileSetupToast && (
        <div className="fixed bottom-28 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-lg backdrop-blur-md">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Profile saved</p>
              <p className="text-xs text-on-surface-variant">You can update it anytime from your profile.</p>
            </div>
            <button
              onClick={() => setUIState({ showProfileSetupToast: false })}
              className="shrink-0 text-on-surface-variant transition-colors hover:text-foreground"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {/* Stats panel */}
      <section className="mt-10 rounded-2xl border border-border bg-card p-5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat value={String(wardrobeInventory.length).padStart(2, "0")} label="Total Items" />
          <Stat value="92%" label="Cohesion" />
          <Stat value={String(Math.min(wardrobeInventory.length, 8)).padStart(2, "0")} label="Extractions" />
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-3xl font-bold text-primary">{value}</span>
      <span className="label-caps mt-1 text-on-surface-variant/80">{label}</span>
    </div>
  );
}
