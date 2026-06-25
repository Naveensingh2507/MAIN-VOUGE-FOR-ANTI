import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import {
  Camera, ChevronDown, ArrowLeft, Sparkles, LogOut, RefreshCw, Pencil,
  UserRound, Ruler, Mail, Phone, Check,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/state/AppState";
import { calculateShape, inferBuildType } from "@/utils/shapeCalculator";
import { signOut } from "@/utils/authClient";
import { detectSkinTone, fileToBase64 } from "@/utils/apiClient";

const SKIN_TONES = [
  "#f6e1cb", "#f3d6b6", "#e6b893", "#d6a374", "#b07d51",
  "#8b5a36", "#6b3f23", "#4a2c1a", "#321a0e",
];
const BUILDS = ["Skinny", "Lean", "Athletic", "Heavy"];

const MEASUREMENT_FIELDS = [
  { key: "shoulders", label: "Shoulder Width", hint: "Tip to tip across the back", min: 30, max: 60, fallback: 42 },
  { key: "waist", label: "Waist Size", hint: "Around your natural waistline", min: 50, max: 130 , fallback: 80 },
  { key: "legs", label: "Leg Length", hint: "Hip joint to ankle", min: 60, max: 120, fallback: 90 },
] as const;

type Tab = "personal" | "appearance";

export default function ProfilePage() {
  const { userProfile, setUserProfile, setUIState, setCurrentUser } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Support both location.state.tab AND ?tab= query param
  const initialTab: Tab = (() => {
    const fromQuery = searchParams.get("tab");
    if (fromQuery === "appearance") return "appearance";
    if ((location.state as any)?.tab === "appearance") return "appearance";
    return "personal";
  })();
  const [tab, setTab] = useState<Tab>(initialTab);

  const [openBuild, setOpenBuild] = useState(false);
  const [showEditMetrics, setShowEditMetrics] = useState(false);
  const [detectingSkin, setDetectingSkin] = useState(false);
  const [savedPersonal, setSavedPersonal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Local draft for personal info
  const [draftName, setDraftName] = useState(userProfile.name);
  const [draftPhone, setDraftPhone] = useState(userProfile.phone);
  const [draftBio, setDraftBio] = useState(userProfile.bio);

  // Local draft for measurements, skin tone, and build to prevent autosave glitches
  const [draftMeasurements, setDraftMeasurements] = useState(() => ({
    shoulders: userProfile.measurements.shoulders || 42,
    waist: userProfile.measurements.waist || 80,
    legs: userProfile.measurements.legs || 90,
  }));
  const [draftSkinToneHex, setDraftSkinToneHex] = useState(userProfile.skinToneHex || "#d6a374");
  const [draftBuildType, setDraftBuildType] = useState(() => {
    if (userProfile.buildType && userProfile.buildType !== "Unspecified") {
      return userProfile.buildType;
    }
    return inferBuildType({
      shoulders: userProfile.measurements.shoulders || 42,
      waist: userProfile.measurements.waist || 80,
      legs: userProfile.measurements.legs || 90,
    });
  });

  // Keep drafts in sync if userProfile updates externally (e.g., loaded from database / login)
  useEffect(() => {
    setDraftName(userProfile.name);
    setDraftPhone(userProfile.phone);
    setDraftBio(userProfile.bio);
    setDraftMeasurements({
      shoulders: userProfile.measurements.shoulders || 42,
      waist: userProfile.measurements.waist || 80,
      legs: userProfile.measurements.legs || 90,
    });
    setDraftSkinToneHex(userProfile.skinToneHex || "#d6a374");
    setDraftBuildType(
      userProfile.buildType && userProfile.buildType !== "Unspecified"
        ? userProfile.buildType
        : inferBuildType({
            shoulders: userProfile.measurements.shoulders || 42,
            waist: userProfile.measurements.waist || 80,
            legs: userProfile.measurements.legs || 90,
          })
    );
  }, [userProfile]);

  // Calculate a live preview shape from draft measurements
  const liveShape = calculateShape(draftMeasurements);
  const liveBuild = draftBuildType;

  const profileReady =
    userProfile.measurements.shoulders > 0 &&
    userProfile.measurements.waist > 0 &&
    userProfile.measurements.legs > 0;

  const personalReady = userProfile.name.trim().length > 0;

  const handleSkinToneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setDetectingSkin(true);
    try {
      const b64 = await fileToBase64(f);
      const res = await detectSkinTone({ image_base64: b64 });
      setDraftSkinToneHex(res.skin_tone_hex);
    } finally {
      setDetectingSkin(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
    navigate("/");
  };

  const savePersonal = () => {
    setUserProfile({ name: draftName.trim(), phone: draftPhone.trim(), bio: draftBio.trim() });
    setSavedPersonal(true);
    setTimeout(() => setSavedPersonal(false), 2000);
  };

  const handleMeasurementChange = (key: "shoulders" | "waist" | "legs", value: number) => {
    setDraftMeasurements((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "shoulders") {
        setDraftBuildType(inferBuildType(next));
      }
      return next;
    });
  };

  const commitAppearance = () => {
    setUserProfile({
      measurements: draftMeasurements,
      skinToneHex: draftSkinToneHex,
      buildType: draftBuildType,
    });
  };

  return (
    <AppShell>
      <section className="mb-6 animate-fade-up">
        <Link to="/" className="mb-3 inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to closet
        </Link>
        <h1 className="text-[34px] font-black leading-tight tracking-tight text-foreground">
          Profile
        </h1>
        <p className="label-caps mt-2 text-primary font-bold">
          {personalReady ? userProfile.name : "Precision is the foundation of style."}
        </p>
      </section>

      {/* Tabs */}
      <div className="mb-8 flex border-b border-outline-variant/30 animate-fade-up">
        <button
          onClick={() => setTab("personal")}
          className={[
            "flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all border-b-2",
            tab === "personal" 
              ? "border-primary text-primary" 
              : "border-transparent text-on-surface-variant hover:text-foreground",
          ].join(" ")}
        >
          <UserRound className="h-4 w-4" strokeWidth={1.8} /> Personal
        </button>
        <button
          onClick={() => setTab("appearance")}
          className={[
            "flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all border-b-2",
            tab === "appearance" 
              ? "border-primary text-primary" 
              : "border-transparent text-on-surface-variant hover:text-foreground",
          ].join(" ")}
        >
          <Ruler className="h-4 w-4" strokeWidth={1.8} /> Appearance
        </button>
      </div>

      {tab === "personal" ? (
        /* ---------- Personal Info ---------- */
        <section className="mb-8 animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="label-caps mb-1 text-primary">Personal information</h2>
          <p className="mb-5 text-xs text-on-surface-variant leading-relaxed">
            This info remains private to your account and details your preferred style profile metadata.
          </p>

          <div className="space-y-4">
            <div>
              <label className="label-caps mb-1.5 block text-on-surface-variant" htmlFor="full-name">
                Full name
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
                <input
                  id="full-name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-outline-variant/60 bg-background py-3 pl-11 pr-5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-on-surface-variant" htmlFor="email-readonly">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
                <input
                  id="email-readonly"
                  value={userProfile.email || "Not signed in"}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-outline-variant/40 bg-surface-container-low py-3 pl-11 pr-5 text-sm text-on-surface-variant outline-none"
                />
              </div>
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-on-surface-variant" htmlFor="phone">
                Phone <span className="normal-case text-on-surface-variant/70">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" strokeWidth={1.5} />
                <input
                  id="phone"
                  value={draftPhone}
                  onChange={(e) => setDraftPhone(e.target.value)}
                  placeholder="+91 00000 00000"
                  className="w-full rounded-xl border border-outline-variant/60 bg-background py-3 pl-11 pr-5 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            <div>
              <label className="label-caps mb-1.5 block text-on-surface-variant" htmlFor="bio">
                About you <span className="normal-case text-on-surface-variant/70">(optional)</span>
              </label>
              <textarea
                id="bio"
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                placeholder="A line about your style, your taste, anything you'd like AI to keep in mind..."
                rows={3}
                className="w-full rounded-xl border border-outline-variant/60 bg-background px-5 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
              />
            </div>
          </div>

          <button
            onClick={savePersonal}
            className="label-caps mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-primary-foreground font-bold transition-all hover:bg-primary/95 active:scale-[0.98] shadow-sm hover:shadow"
          >
            {savedPersonal ? <Check className="h-4 w-4 animate-scale-in" strokeWidth={2.5} /> : null}
            {savedPersonal ? "Saved" : "Save Personal Info"}
          </button>
        </section>
      ) : profileReady ? (
        /* ---------- Ready: collapsible metrics summary ---------- */
        <section className="mb-6 animate-fade-up">
          {!showEditMetrics ? (
            <div className="rounded-2xl border border-border bg-card p-6 relative shadow-md hover:shadow-lg transition-all animate-fade-up">
              <button
                onClick={() => setShowEditMetrics(true)}
                className="absolute top-6 right-6 inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3.5 py-2 text-xs font-semibold transition-all hover:bg-surface-container-high border border-outline-variant/20 hover:scale-[1.03] active:scale-[0.98]"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit Fit
              </button>
              <p className="label-caps mb-5 text-primary">Appearance Profile</p>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 shrink-0 rounded-full border-4 border-background shadow-md ring-2 ring-primary/10" style={{ backgroundColor: userProfile.skinToneHex }} />
                <div>
                  <p className="text-lg font-black tracking-tight text-foreground">{userProfile.calculatedShape}</p>
                  <p className="text-xs text-on-surface-variant font-semibold">{userProfile.buildType} Build</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 border-t border-outline-variant/20 pt-5">
                <div className="bg-surface-container-low/40 p-3 rounded-xl border border-border/40 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/80">Shoulders</p>
                  <p className="font-mono text-base font-black text-primary mt-1">{userProfile.measurements.shoulders} <span className="text-xs font-normal">cm</span></p>
                </div>
                <div className="bg-surface-container-low/40 p-3 rounded-xl border border-border/40 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/80">Waist</p>
                  <p className="font-mono text-base font-black text-primary mt-1">{userProfile.measurements.waist} <span className="text-xs font-normal">cm</span></p>
                </div>
                <div className="bg-surface-container-low/40 p-3 rounded-xl border border-border/40 text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/80">Legs</p>
                  <p className="font-mono text-base font-black text-primary mt-1">{userProfile.measurements.legs} <span className="text-xs font-normal">cm</span></p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-md relative">
              <div className="mb-6 flex items-center justify-between border-b border-border/30 pb-3">
                <p className="label-caps text-primary font-bold">Edit Appearance</p>
                <button 
                  onClick={() => { commitAppearance(); setShowEditMetrics(false); }}
                  className="text-xs font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-full hover:bg-primary/10 transition-colors"
                >
                  Done
                </button>
              </div>
              {/* Inline the form instead of using a sub-component to avoid remounting */}
              <AppearanceContent
                draftSkinToneHex={draftSkinToneHex}
                setDraftSkinToneHex={setDraftSkinToneHex}
                draftMeasurements={draftMeasurements}
                onMeasurementChange={handleMeasurementChange}
                liveShape={liveShape}
                liveBuild={liveBuild}
                setDraftBuildType={setDraftBuildType}
                openBuild={openBuild}
                setOpenBuild={setOpenBuild}
                detectingSkin={detectingSkin}
                fileRef={fileRef}
                handleSkinToneUpload={handleSkinToneUpload}
              />
            </div>
          )}
        </section>
      ) : (
        /* ---------- Not ready: Full setup ---------- */
        <>
          <AppearanceContent
            draftSkinToneHex={draftSkinToneHex}
            setDraftSkinToneHex={setDraftSkinToneHex}
            draftMeasurements={draftMeasurements}
            onMeasurementChange={handleMeasurementChange}
            liveShape={liveShape}
            liveBuild={liveBuild}
            setDraftBuildType={setDraftBuildType}
            openBuild={openBuild}
            setOpenBuild={setOpenBuild}
            detectingSkin={detectingSkin}
            fileRef={fileRef}
            handleSkinToneUpload={handleSkinToneUpload}
          />
          <button
            onClick={() => {
              commitAppearance();
              setUIState({ showProfileSetupToast: true });
              navigate("/");
            }}
            className="label-caps mb-8 flex w-full items-center justify-center rounded-xl bg-primary py-4 text-primary-foreground font-bold transition-all hover:bg-primary/95 active:scale-[0.98] shadow-md"
          >
            Initialize Profile
          </button>
        </>
      )}

      {/* Logout — always visible at the bottom */}
      <button
        onClick={handleSignOut}
        className="label-caps mb-8 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 py-3.5 text-red-500 font-bold transition-all hover:bg-red-500/5 active:scale-[0.98]"
      >
        <LogOut className="h-4 w-4" strokeWidth={1.8} />
        Sign Out
      </button>
    </AppShell>
  );
}

/* ================================================================
   AppearanceContent — extracted as a real component so it doesn't
   remount on every parent re-render (which was causing the glitchy
   slider / state loss bug).
   ================================================================ */
interface AppearanceContentProps {
  draftSkinToneHex: string;
  setDraftSkinToneHex: (hex: string) => void;
  draftMeasurements: { shoulders: number; waist: number; legs: number };
  onMeasurementChange: (key: "shoulders" | "waist" | "legs", value: number) => void;
  liveShape: string;
  liveBuild: string;
  setDraftBuildType: (b: string) => void;
  openBuild: boolean;
  setOpenBuild: (v: boolean | ((prev: boolean) => boolean)) => void;
  detectingSkin: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  handleSkinToneUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function AppearanceContent({
  draftSkinToneHex, setDraftSkinToneHex,
  draftMeasurements, onMeasurementChange,
  liveShape, liveBuild, setDraftBuildType,
  openBuild, setOpenBuild,
  detectingSkin,
  fileRef, handleSkinToneUpload,
}: AppearanceContentProps) {
  return (
    <>
      {/* Skin tone detection */}
      <section className="mb-6 animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="label-caps text-primary">Skin tone</h2>
          <input type="file" accept="image/*" className="hidden" ref={fileRef} onChange={handleSkinToneUpload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={detectingSkin}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary transition-all hover:bg-primary/10 disabled:opacity-50 font-semibold"
          >
            {detectingSkin ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" strokeWidth={1.8} />}
            {detectingSkin ? "AI Sampling..." : "Detect via AI"}
          </button>
        </div>
        <p className="mb-5 text-xs text-on-surface-variant leading-relaxed">
          Pick from the spectrum or upload a portrait — AI will sample your undertone for high-accuracy match advice.
        </p>
        <div className="flex flex-wrap gap-3">
          {SKIN_TONES.map((hex) => (
            <button
              key={hex}
              onClick={() => setDraftSkinToneHex(hex)}
              className={[
                "relative h-11 w-11 rounded-full border transition-all duration-300 hover:scale-105 flex items-center justify-center",
                draftSkinToneHex === hex 
                  ? "scale-110 border-primary ring-4 ring-primary/20 shadow-md" 
                  : "border-outline-variant/40 hover:border-outline-variant",
              ].join(" ")}
              style={{ backgroundColor: hex }}
              aria-label={hex}
            >
              {draftSkinToneHex === hex && (
                <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] animate-scale-in" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Measurements */}
      <section className="mb-6 animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="label-caps mb-1 text-primary">Physical Metrics</h2>
        <p className="mb-5 text-xs text-on-surface-variant leading-relaxed">
          Measure relaxed in centimetres. These metrics guide the calculated recommendations for your silhouette.
        </p>
        <div className="space-y-6">
          {MEASUREMENT_FIELDS.map(({ key, label, hint, min, max }) => {
            const current = draftMeasurements[key];
            return (
              <div key={key}>
                <div className="mb-2 flex items-baseline justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{label}</p>
                    <p className="text-[11px] text-on-surface-variant">{hint}</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">{current} cm</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={1}
                  value={current}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    onMeasurementChange(key, value);
                  }}
                  className="w-full h-1.5 bg-outline-variant/40 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                />
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary to-clay/90 p-5 text-white shadow-md">
          <div>
            <p className="label-caps text-white/80">Calculated Shape</p>
            <p className="mt-1 text-2xl font-black tracking-tight">{liveShape}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <Sparkles className="h-6 w-6 text-white" strokeWidth={1.8} />
          </div>
        </div>
      </section>

      {/* Build type dropdown */}
      <section className="mb-8 animate-fade-up rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="label-caps mb-3 text-primary">Build Type</h2>
        <div className="relative">
          <button
            onClick={() => setOpenBuild((v: boolean) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-outline-variant/60 bg-background px-4 py-3.5 text-left text-sm font-semibold transition-all hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/10"
          >
            <span>{liveBuild} Build</span>
            <ChevronDown className={`h-4 w-4 text-on-surface-variant transition-transform duration-300 ${openBuild ? "rotate-180" : ""}`} />
          </button>
          {openBuild && (
            <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-scale-in">
              {BUILDS.map((b) => (
                <li key={b}>
                  <button
                    onClick={() => { setDraftBuildType(b); setOpenBuild(false); }}
                    className={[
                      "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-primary/5",
                      liveBuild === b ? "bg-primary-container/30 text-primary" : "text-foreground",
                    ].join(" ")}
                  >
                    <span>{b}</span>
                    {liveBuild === b && <Check className="h-4 w-4 text-primary" strokeWidth={2.5} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
