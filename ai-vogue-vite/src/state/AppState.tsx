import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { calculateShape } from "@/utils/shapeCalculator";
import { fetchGarments, insertGarment, updateGarmentDB, deleteGarmentDB } from "@/utils/wardrobeApi";

// ---------- Types ----------
export type GarmentCategory = "Topwear" | "Bottomwear" | "Footwear" | "Outerwear";

/**
 * Garment DNA — structured visual metadata extracted by the local Python pipeline
 * (scripts/extract_garment_dna.py). This is the text context sent to Groq instead
 * of raw image bytes. Fields marked null are user-fillable in AssetEditorModal.
 */
export interface GarmentDNA {
  item_id: string;
  category: GarmentCategory;
  visual_traits: {
    dominant_color_hex: string;
    dominant_color_name: string;
    secondary_color_hex: string | null;
    secondary_color_name: string | null;
    pattern: "Solid" | "Vertical Stripes" | "Horizontal Stripes" | "Complex Pattern";
    pattern_confidence: number;
  };
  physical_traits: {
    material: string | null;     // null = user must fill in
    fit: string | null;          // null = user must fill in
    sleeve_length: string | null;
    garment_length: string | null;
    neckline: string | null;
    season: string;
  };
  style_traits: {
    formality_index: number;     // 1–10
    style_archetype: "Formal" | "Business Casual" | "Smart Casual" | "Streetwear" | "Casual";
  };
  user_overrides: {
    material: string | null;
    fit: string | null;
    formality_index: number | null;
  };
  final_summary: string;         // Human-readable text sent to Groq
}

export interface Garment {
  id: number;
  name: string;
  category: GarmentCategory;
  colorHex: string;
  tags: string[];
  imageUrl: string;
  garment_dna?: GarmentDNA;      // Optional — populated after DNA pipeline runs
}

export interface UserProfile {
  // Personal info
  name: string;
  email: string;
  phone: string;
  bio: string;
  // Silhouette / style data
  skinToneHex: string;
  measurements: { shoulders: number; waist: number; legs: number };
  calculatedShape: string;
  buildType: string;
}

export interface MatchmakerSession {
  selectedTop: Garment | null;
  selectedBottom: Garment | null;
  selectedFootwear: Garment | null;
  includeFootwear: boolean;
  eventContext: string;
}

export interface UIState {
  activeItemDrawer: Garment | null;
  isEditAssetModalOpen: boolean;
  pendingAsset: Partial<Garment> | null;
  showProfileSetupToast: boolean;
  // Auth gate: when set, shows the login/signup wall modal with a reason + where to go after.
  authGate: { reason: string; redirectTo: string } | null;
}

// ---------- Seed data (placeholder until API wired) ----------
// Removing the default seed template as requested by the user.

// ---------- Context ----------
interface AppStateValue {
  userProfile: UserProfile;
  setUserProfile: (p: Partial<UserProfile>) => void;

  wardrobeInventory: Garment[];
  addGarment: (g: Omit<Garment, "id">) => Garment;
  updateGarment: (id: number, patch: Partial<Garment>) => void;
  removeGarment: (id: number) => void;

  matchmakerSession: MatchmakerSession;
  setMatchmakerSession: (s: Partial<MatchmakerSession>) => void;

  uiState: UIState;
  setUIState: (s: Partial<UIState>) => void;

  currentUser: { id: string; email: string } | null;
  setCurrentUser: (user: { id: string; email: string } | null) => void;
  isAuthenticated: boolean;

  // Call before any gated action. Returns true if allowed to proceed,
  // or opens the login wall + returns false if not authenticated.
  requireAuth: (reason: string, redirectTo?: string) => boolean;
}

const AppStateContext = createContext<AppStateValue | null>(null);

// Sensible non-zero defaults so sliders never silently desync from displayed value.
const DEFAULT_PROFILE: UserProfile = {
  name: "",
  email: "",
  phone: "",
  bio: "",
  skinToneHex: "#d6a374",
  measurements: { shoulders: 0, waist: 0, legs: 0 },
  calculatedShape: "Not yet calculated",
  buildType: "Unspecified",
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [userProfile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [wardrobeInventory, setInventory] = useState<Garment[]>([]);
  const [matchmakerSession, setSession] = useState<MatchmakerSession>({
    selectedTop: null, selectedBottom: null, selectedFootwear: null,
    includeFootwear: false, eventContext: "Social Cafe",
  });
  const [uiState, setUI] = useState<UIState>({
    activeItemDrawer: null, isEditAssetModalOpen: false, pendingAsset: null,
    showProfileSetupToast: false, authGate: null,
  });
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);

  // Load wardrobe when user changes
  useEffect(() => {
    if (currentUser) {
      fetchGarments(currentUser.id).then(setInventory);
    } else {
      const saved = localStorage.getItem("vogue_wardrobe_guest");
      if (saved) {
        try {
          setInventory(JSON.parse(saved));
          return;
        } catch (e) {
          console.error("Failed to parse wardrobe", e);
        }
      }
      setInventory([]);
    }
  }, [currentUser]);

  const value = useMemo<AppStateValue>(() => ({
    userProfile,
    setUserProfile: (p) => setProfile((prev) => {
      const next = { ...prev, ...p, measurements: { ...prev.measurements, ...(p.measurements ?? {}) } };
      next.calculatedShape = calculateShape(next.measurements);
      return next;
    }),
    wardrobeInventory,
    addGarment: (g) => {
      const created: Garment = { ...g, id: Date.now() };
      setInventory((prev) => {
        const next = [created, ...prev];
        if (!currentUser) {
          localStorage.setItem("vogue_wardrobe_guest", JSON.stringify(next));
        }
        return next;
      });

      if (currentUser) {
        insertGarment(currentUser.id, g).then((realGarment) => {
          if (realGarment) {
            setInventory((prev) => prev.map((item) => item.id === created.id ? realGarment : item));
          }
        });
      }
      return created;
    },
    updateGarment: (id, patch) => {
      setInventory((prev) => {
        const next = prev.map((g) => (g.id === id ? { ...g, ...patch } : g));
        if (!currentUser) {
          localStorage.setItem("vogue_wardrobe_guest", JSON.stringify(next));
        }
        return next;
      });
      if (currentUser) {
        updateGarmentDB(currentUser.id, id, patch);
      }
    },
    removeGarment: (id) => {
      setInventory((prev) => {
        const next = prev.filter((g) => g.id !== id);
        if (!currentUser) {
          localStorage.setItem("vogue_wardrobe_guest", JSON.stringify(next));
        }
        return next;
      });
      if (currentUser) {
        deleteGarmentDB(currentUser.id, id);
      }
    },
    matchmakerSession,
    setMatchmakerSession: (s) => setSession((prev) => ({ ...prev, ...s })),
    uiState,
    setUIState: (s) => setUI((prev) => ({ ...prev, ...s })),
    currentUser,
    setCurrentUser,
    isAuthenticated: currentUser !== null,
    requireAuth: (reason, redirectTo = "/") => {
      if (currentUser !== null) return true;
      setUI((prev) => ({ ...prev, authGate: { reason, redirectTo } }));
      return false;
    },
  }), [userProfile, wardrobeInventory, matchmakerSession, uiState, currentUser]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
