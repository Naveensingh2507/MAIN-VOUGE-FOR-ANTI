import { useEffect, useState } from "react";
import { X, Sparkles, Scissors, RefreshCw } from "lucide-react";
import { useAppState, type GarmentCategory } from "@/state/AppState";
import { processAsset } from "@/utils/apiClient";

const CATEGORIES: GarmentCategory[] = ["Topwear", "Bottomwear", "Footwear", "Outerwear"];
const PATTERNS = ["Solid", "Vertical Stripes", "Horizontal Stripes", "Complex Pattern"];
const ARCHETYPES = ["Formal", "Business Casual", "Smart Casual", "Streetwear", "Casual"];

// Premium color spectrum — neutrals, earth tones, jewels, brights.
const COLOR_GRID = [
  "#000000", "#1a1a1a", "#3a3a3a", "#5d6050", "#777871", "#c8c7c0", "#ffffff",
  "#1f2a44", "#0c2340", "#2d4a3e", "#4a7c59", "#87a878", "#cfe1d1", "#e8efe4",
  "#5b2a86", "#6b2a2a", "#a83b3b", "#e85d3a", "#e8a87c", "#f0d78c", "#f3e9c9",
  "#3d2914", "#685c53", "#8b6f5e", "#c8a87a", "#d6a374", "#e8e0d4", "#fbf9f6",
];

export function AssetEditorModal() {
  const { uiState, setUIState, addGarment, updateGarment, requireAuth } = useAppState();
  const open = uiState.isEditAssetModalOpen;
  const pending = uiState.pendingAsset;
  const isEditing = !!pending?.id;

  const [name, setName] = useState("");
  const [category, setCategory] = useState<GarmentCategory>("Topwear");
  const [colorHex, setColorHex] = useState("#1a1a1a");
  const [removeBg, setRemoveBg] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [extractedDna, setExtractedDna] = useState<any>(null);
  const [cleanImageUrl, setCleanImageUrl] = useState<string | null>(null);

  // Editable DNA fields
  const [dnaPattern, setDnaPattern] = useState<string>("Solid");
  const [dnaMaterial, setDnaMaterial] = useState<string>("");
  const [dnaFit, setDnaFit] = useState<string>("");
  const [dnaArchetype, setDnaArchetype] = useState<string>("Casual");
  const [dnaFormality, setDnaFormality] = useState<number>(5);

  useEffect(() => {
    if (pending) {
      setName(pending.name ?? "New Item");
      setCategory((pending.category as GarmentCategory) ?? "Topwear");
      setColorHex(pending.colorHex ?? "#1a1a1a");
      setAnalyzed(!!pending.category);
      if (pending.garment_dna) {
        setExtractedDna(pending.garment_dna);
        setDnaPattern(pending.garment_dna.visual_traits?.pattern || "Solid");
        setDnaMaterial(pending.garment_dna.user_overrides?.material || pending.garment_dna.physical_traits?.material || "");
        setDnaFit(pending.garment_dna.user_overrides?.fit || pending.garment_dna.physical_traits?.fit || "");
        setDnaArchetype(pending.garment_dna.style_traits?.style_archetype || "Casual");
        setDnaFormality(pending.garment_dna.user_overrides?.formality_index ?? pending.garment_dna.style_traits?.formality_index ?? 5);
      } else {
        setExtractedDna(null);
        setCleanImageUrl(null);
        setDnaPattern("Solid");
        setDnaMaterial("");
        setDnaFit("");
        setDnaArchetype("Casual");
        setDnaFormality(5);
      }
    }
  }, [pending]);

  const runAnalysis = async () => {
    if (!pending?.imageUrl) return;
    setAnalyzing(true);
    try {
      const result = await processAsset({ image_base64: pending.imageUrl, apply_bg_removal: removeBg });
      setCategory(result.detected_category || "Topwear");
      setColorHex(result.detected_color_hex || "#1a1a1a");
      if (result.garment_dna) {
        setExtractedDna(result.garment_dna);
        setDnaPattern(result.garment_dna.visual_traits?.pattern || "Solid");
        setDnaMaterial(result.garment_dna.physical_traits?.material || "");
        setDnaFit(result.garment_dna.physical_traits?.fit || "");
        setDnaArchetype(result.garment_dna.style_traits?.style_archetype || "Casual");
        setDnaFormality(result.garment_dna.style_traits?.formality_index ?? 5);
      }
      if (result.clean_image_base64) setCleanImageUrl(result.clean_image_base64);
      setAnalyzed(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const close = () => setUIState({ isEditAssetModalOpen: false, pendingAsset: null });

  const save = () => {
    if (!pending) return;
    if (!requireAuth("Sign in to save this garment to your closet.", "/")) {
      close();
      return;
    }

    const finalDna = extractedDna ? {
      ...extractedDna,
      visual_traits: { ...extractedDna.visual_traits, pattern: dnaPattern },
      style_traits: { ...extractedDna.style_traits, style_archetype: dnaArchetype },
      user_overrides: {
        ...(extractedDna.user_overrides || {}),
        material: dnaMaterial || null,
        fit: dnaFit || null,
        formality_index: dnaFormality,
      }
    } : null;

    if (isEditing) {
      updateGarment(pending.id!, {
        name,
        category,
        colorHex,
        tags: [category === "Topwear" ? "Top" : category === "Bottomwear" ? "Bottoms" : category],
        imageUrl: cleanImageUrl || pending.imageUrl || "",
        garment_dna: finalDna || pending.garment_dna,
      });
    } else {
      addGarment({
        name,
        category,
        colorHex,
        tags: [category === "Topwear" ? "Top" : category === "Bottomwear" ? "Bottoms" : category],
        imageUrl: cleanImageUrl || pending.imageUrl || "",
        garment_dna: finalDna,
      });
    }
    close();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center animate-fade-in">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={close} />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-6 shadow-ambient animate-slide-up sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="label-caps text-primary">{isEditing ? "Garment Details" : "AI Phenotype Extraction"}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              {isEditing ? "Edit garment" : "Review attributes"}
            </h2>
          </div>
          <button onClick={close} aria-label="Close"><X className="h-5 w-5 text-on-surface-variant" /></button>
        </div>

        {pending?.imageUrl && (
          <div className="relative mb-5">
            <div
              className="aspect-[4/3] w-full rounded-2xl bg-cover bg-center transition-all duration-300"
              style={{ backgroundImage: `url(${cleanImageUrl || pending.imageUrl})`, backgroundColor: removeBg ? "#f0ece4" : undefined }}
            />
            {!isEditing && (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary-container/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-on-primary-container">
                <Sparkles className="h-3 w-3" /> AI detected
              </span>
            )}
          </div>
        )}

        {/* AI background removal toggle */}
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-border bg-surface-container-low p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Scissors className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-sm font-semibold">AI background removal</p>
              <p className="text-xs text-on-surface-variant">
                {isEditing ? "Currently isolated on a clean canvas" : "Isolate the garment on a clean canvas"}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={removeBg}
            onClick={() => setRemoveBg((v) => !v)}
            className={[
              "relative h-6 w-11 shrink-0 rounded-full transition-colors",
              removeBg ? "bg-primary" : "bg-surface-container-high",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                removeBg ? "translate-x-5" : "translate-x-0.5",
              ].join(" ")}
            />
          </button>
        </div>

        {isEditing ? (
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-full border border-primary/30 py-3 text-primary transition-colors hover:bg-primary/5 disabled:opacity-60"
          >
            {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Sparkles className="h-4 w-4" strokeWidth={1.5} />}
            <span className="label-caps">{analyzing ? "Re-analyzing..." : "Re-run AI extraction"}</span>
          </button>
        ) : !analyzed ? (
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Sparkles className="h-4 w-4" strokeWidth={1.5} />}
            <span className="label-caps">{analyzing ? "Extracting..." : "Extract Attributes"}</span>
          </button>
        ) : (
          pending && (
            <p className="mb-5 text-xs italic text-on-surface-variant">
              AI detected this as <span className="font-semibold not-italic text-foreground">{category}</span>{" "}
              in <span className="font-semibold not-italic text-foreground">{colorHex.toUpperCase()}</span>. Override anything below.
            </p>
          )
        )}

        <label className="label-caps mb-2 block text-on-surface-variant">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-5 w-full rounded-full border border-outline-variant bg-background px-5 py-3 text-sm outline-none transition-colors focus:border-foreground"
        />

        <label className="label-caps mb-2 block text-on-surface-variant">Category</label>
        <div className="mb-5 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={[
                "label-caps rounded-full px-4 py-2 transition-colors",
                category === c ? "bg-primary text-primary-foreground" : "bg-tertiary-fixed text-on-tertiary-fixed",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>

        <label className="label-caps mb-2 block text-on-surface-variant">Color spectrum</label>
        <div className="mb-3 grid grid-cols-7 gap-2">
          {COLOR_GRID.map((hex) => (
            <button
              key={hex}
              onClick={() => setColorHex(hex)}
              aria-label={hex}
              className={[
                "aspect-square rounded-md border transition-transform",
                colorHex === hex
                  ? "scale-110 border-primary ring-2 ring-primary/30"
                  : "border-outline-variant/60 hover:scale-105",
              ].join(" ")}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
        <div className="mb-6 flex items-center gap-3 rounded-full border border-border bg-background px-3 py-2">
          <span className="h-5 w-5 rounded-sm border border-outline-variant" style={{ backgroundColor: colorHex }} />
          <input
            type="color"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
            aria-label="Pick custom color"
          />
          <input
            value={colorHex.toUpperCase()}
            onChange={(e) => setColorHex(e.target.value)}
            className="flex-1 bg-transparent font-mono text-xs uppercase tracking-wider outline-none"
          />
        </div>

        {/* --- Garment DNA Editor --- */}
        {extractedDna && (
          <div className="mb-6 rounded-2xl bg-surface-container p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold tracking-tight text-primary">Garment DNA Profile</h3>
            
            <label className="label-caps mb-2 block text-on-surface-variant">Pattern</label>
            <div className="mb-4 flex flex-wrap gap-2">
              {PATTERNS.map((p) => (
                <button
                  key={p}
                  onClick={() => setDnaPattern(p)}
                  className={["px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors", dnaPattern === p ? "bg-primary text-primary-foreground border-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"].join(" ")}
                >
                  {p}
                </button>
              ))}
            </div>

            <label className="label-caps mb-2 block text-on-surface-variant">Style Archetype</label>
            <div className="mb-4 flex flex-wrap gap-2">
              {ARCHETYPES.map((a) => (
                <button
                  key={a}
                  onClick={() => setDnaArchetype(a)}
                  className={["px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors", dnaArchetype === a ? "bg-primary text-primary-foreground border-primary" : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"].join(" ")}
                >
                  {a}
                </button>
              ))}
            </div>

            <div className="mb-4 flex gap-4">
              <div className="flex-1">
                <label className="label-caps mb-2 block text-on-surface-variant">Material (optional)</label>
                <input
                  value={dnaMaterial}
                  onChange={(e) => setDnaMaterial(e.target.value)}
                  placeholder="e.g. Cotton, Denim"
                  className="w-full rounded-xl border border-outline-variant bg-background px-4 py-2 text-sm outline-none transition-colors focus:border-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="label-caps mb-2 block text-on-surface-variant">Fit (optional)</label>
                <input
                  value={dnaFit}
                  onChange={(e) => setDnaFit(e.target.value)}
                  placeholder="e.g. Slim, Oversized"
                  className="w-full rounded-xl border border-outline-variant bg-background px-4 py-2 text-sm outline-none transition-colors focus:border-foreground"
                />
              </div>
            </div>

            <label className="label-caps mb-2 block text-on-surface-variant flex justify-between">
              <span>Formality Index</span>
              <span className="font-mono text-primary">{dnaFormality}/10</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={dnaFormality}
              onChange={(e) => setDnaFormality(parseInt(e.target.value, 10))}
              className="w-full accent-primary"
            />
            <div className="mt-1 flex justify-between text-[10px] uppercase text-on-surface-variant">
              <span>Ultra Casual</span>
              <span>Black Tie</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={close}
            className="label-caps flex-1 rounded-full border border-outline-variant py-3 transition-colors hover:bg-surface-container-low"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="label-caps flex-1 rounded-full bg-primary py-3 text-primary-foreground transition-transform active:scale-[0.98]"
          >
            {isEditing ? "Update garment" : "Save to closet"}
          </button>
        </div>
      </div>
    </div>
  );
}