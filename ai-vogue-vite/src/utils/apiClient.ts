// API client — calls our own /.netlify/functions/stylist endpoint, which
// talks to Groq server-side. The GROQ_API_KEY never reaches the browser.
//
// Exported names and types are unchanged from the original stub version, so
// AssetEditorModal.tsx, ProfilePage.tsx, MatchabilityPage.tsx, and EventPage.tsx
// don't need to change their imports — only analyzeSynergy gained one extra
// argument (inventory), matching the pattern suggestOutfit already used.
//
// Garment DNA: when a garment has a garment_dna field (populated by the local
// Python pipeline), it is included in API payloads so stylist.ts can give
// Groq rich text context about each garment instead of working blind.

import type { Garment, UserProfile } from "@/state/AppState";

const BASE_URL = "/.netlify/functions/stylist";

async function callStylist(payload: object): Promise<any> {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stylist function error (${res.status}): ${text}`);
  }
  return res.json();
}

/* ---------- Endpoint 1: Upload & Detect Asset ---------- */
export interface ProcessAssetPayload {
  image_base64: string;
  apply_bg_removal: boolean;
}
export interface ProcessAssetResponse {
  status: "success" | "error";
  detected_category: "Topwear" | "Bottomwear" | "Footwear" | "Outerwear";
  detected_color_hex: string;
  confidence: number;
  garment_dna?: any;
  clean_image_base64?: string | null;
}

export async function processAsset(payload: ProcessAssetPayload): Promise<ProcessAssetResponse> {
  try {
    // Use the live Hugging Face Space API by default, unless overridden in .env
    const API_URL = import.meta.env.VITE_API_URL || "https://naveenhujime-ai-vogue.hf.space/extract";
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Local python API error: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    // Fallback to the Groq guessing approach if the Python server isn't running
    console.warn("Local Python Garment DNA server (port 8000) not reachable. Falling back to Groq inference.", err);
    return callStylist({ task: "detect_garment", ...payload });
  }
}

export function wakeUpServer() {
  const API_URL = import.meta.env.VITE_API_URL || "https://naveenhujime-ai-vogue.hf.space/extract";
  const wakeupUrl = API_URL.replace("/extract", "/wakeup");
  fetch(wakeupUrl).catch(() => {});
}

/* ---------- Endpoint 1.5: Detect Skin Tone ---------- */
export interface DetectSkinTonePayload { image_base64: string; }
export interface DetectSkinToneResponse { skin_tone_hex: string; }

export async function detectSkinTone(payload: DetectSkinTonePayload): Promise<DetectSkinToneResponse> {
  return callStylist({ task: "detect_skin_tone", ...payload });
}

/* ---------- Endpoint 2: AI Auto-Suggestions ---------- */
export interface SuggestPayload { locked_item_id: number; inventory_ids: number[]; }
export interface SuggestResponse {
  suggested_bottom_id: number | null;
  suggested_footwear_id: number | null;
  confidence_score: number;
  status?: string;
  error?: string;
  error_message?: string;
}

export async function suggestOutfit(
  payload: SuggestPayload,
  inventory: Garment[],
): Promise<SuggestResponse> {
  // Include garment_dna when available so Groq can use rich visual context
  const lite = (g: Garment) => ({
    id: g.id,
    category: g.category,
    colorHex: g.colorHex,
    tags: g.tags,
    garment_dna: g.garment_dna ?? null,
  });
  const locked = inventory.find((g) => g.id === payload.locked_item_id);
  const rest = inventory.filter((g) => g.id !== payload.locked_item_id);
  return callStylist({
    task: "suggest_outfit",
    locked_item: locked ? lite(locked) : null,
    inventory: rest.map(lite),
  });
}

/* ---------- Endpoint 3: Analyze Synergy ---------- */
export interface AnalyzePayload {
  outfit: { top_id: number | null; bottom_id: number | null; footwear_id: number | null };
  user_profile: {
    skin_tone_hex: string;
    measurements: UserProfile["measurements"];
    build_type: string;
  };
  event_context: string;
}
export interface AnalyzeResponse {
  synergy_score: { total: number; harmony: number; vibe: number };
  editorial_feedback: string;
  status?: string;
  error?: string;
  error_message?: string;
}

export async function analyzeSynergy(
  payload: AnalyzePayload,
  inventory: Garment[],
): Promise<AnalyzeResponse> {
  // Include garment_dna when available so Groq can use rich visual context
  const lite = (g: Garment | undefined) =>
    g ? {
      id: g.id,
      category: g.category,
      colorHex: g.colorHex,
      tags: g.tags,
      garment_dna: g.garment_dna ?? null,
    } : null;

  // Safety check: if id is null/undefined, return undefined safely
  const find = (id: number | null | undefined) =>
    (id == null ? undefined : inventory.find((g) => g.id === id));

  return callStylist({
    task: "analyze_synergy",
    outfit: {
      top: lite(find(payload.outfit?.top_id ?? null)),
      bottom: lite(find(payload.outfit?.bottom_id ?? null)),
      footwear: lite(find(payload.outfit?.footwear_id ?? null)),
    },
    user_profile: payload.user_profile,
    event_context: payload.event_context,
  });
}

/* ---------- Helpers ---------- */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}