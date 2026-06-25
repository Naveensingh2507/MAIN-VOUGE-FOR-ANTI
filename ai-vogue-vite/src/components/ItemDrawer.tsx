import { useNavigate } from "react-router-dom";
import { X, Sparkles, Trash2, Pencil } from "lucide-react";
import { useAppState, type GarmentCategory } from "@/state/AppState";

const COMPLEMENT: Record<GarmentCategory, { label: string; target: GarmentCategory } | null> = {
  Topwear: { label: "Match with best bottomwear in your closet", target: "Bottomwear" },
  Bottomwear: { label: "Match with Topwear", target: "Topwear" },
  Footwear: { label: "Match with an Outfit", target: "Topwear" },
  Outerwear: { label: "Match with Bottomwear", target: "Bottomwear" },
};

export function ItemDrawer() {
  const { uiState, setUIState, removeGarment, setMatchmakerSession, requireAuth } = useAppState();
  const navigate = useNavigate();
  const item = uiState.activeItemDrawer;
  const open = !!item;

  const close = () => setUIState({ activeItemDrawer: null });

  const matchFromItem = async () => {
    if (!item) return;
    if (!requireAuth("Sign in to match this piece with the rest of your wardrobe.", "/matchability")) return;

    if (item.category === "Topwear") {
      setMatchmakerSession({ selectedTop: item });
      close();
      navigate("/matchability", { state: { fork: "Bottomwear" } });
      return;
    }

    if (item.category === "Bottomwear") {
      setMatchmakerSession({ selectedBottom: item });
      close();
      navigate("/matchability", { state: { fork: "Topwear" } });
      return;
    }

    const slot = item.category === "Footwear" ? { selectedFootwear: item, includeFootwear: true } : { selectedTop: item };
    setMatchmakerSession({ ...slot });
    close();
    navigate("/matchability");
  };

  const editItem = () => {
    if (!item) return;
    if (!requireAuth("Sign in to edit garment details.", "/")) return;
    setUIState({
      activeItemDrawer: null,
      isEditAssetModalOpen: true,
      pendingAsset: { ...item },
    });
  };

  const deleteItem = () => {
    if (!item) return;
    if (!requireAuth("Sign in to remove items from your closet.", "/")) return;
    removeGarment(item.id);
    close();
  };

  const cta = item ? COMPLEMENT[item.category] : null;

  return (
    <div
      className={[
        "fixed inset-0 z-50 transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
      aria-hidden={!open}
    >
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={close} />
      <div
        className={[
          "absolute inset-x-0 bottom-0 rounded-t-3xl bg-card shadow-ambient",
          "transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        {item && (
          <div className="px-6 pb-8 pt-4">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-outline-variant/60" />
            <div className="flex items-start gap-4">
              <div
                className="h-28 w-24 shrink-0 rounded-xl bg-cover bg-center"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              />
              <div className="min-w-0 flex-1">
                <p className="label-caps text-on-surface-variant">{item.category}</p>
                <h3 className="mt-1 truncate font-serif text-2xl text-foreground">{item.name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-outline-variant"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <span className="text-xs text-on-surface-variant">{item.colorHex}</span>
                </div>
              </div>
              <button onClick={close} aria-label="Close" className="p-1 text-on-surface-variant hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={matchFromItem}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-primary-foreground transition-transform active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                <span className="label-caps">{cta?.label ?? "Match this item"}</span>
              </button>
              <button
                onClick={editItem}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant px-6 py-3 text-foreground transition-colors hover:bg-surface-container-low"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.5} />
                <span className="label-caps">Edit details</span>
              </button>
              <button
                onClick={deleteItem}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-outline-variant/60 px-6 py-3 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-foreground"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                <span className="label-caps">Remove from closet</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}