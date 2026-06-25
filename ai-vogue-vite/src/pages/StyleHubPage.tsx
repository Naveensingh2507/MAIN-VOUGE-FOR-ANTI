import { useNavigate } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { Sparkles, MapPin, ArrowUpRight, Shirt, CalendarHeart, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/state/AppState";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.08 * i, duration: 0.55, ease: [0.23, 1, 0.32, 1] as const },
  }),
};

export default function StyleHubPage() {
  const navigate = useNavigate();
  const { matchmakerSession, wardrobeInventory, requireAuth } = useAppState();

  const itemCount = wardrobeInventory.length;
  const lockedCount = [matchmakerSession.selectedTop, matchmakerSession.selectedBottom, matchmakerSession.selectedFootwear]
    .filter(Boolean).length;

  const goMatchability = () => {
    if (!requireAuth("Sign in to run AI matchability scoring on your outfits.", "/matchability")) return;
    navigate("/matchability");
  };

  const goEvent = () => {
    if (!requireAuth("Sign in to let AI build event-ready outfits for you.", "/event")) return;
    navigate("/event");
  };

  return (
    <AppShell>
      <section className="mb-8">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="label-caps text-primary"
        >
          Archive 02
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="mt-2 text-[34px] font-extrabold leading-tight tracking-tight text-foreground"
        >
          Style Studio
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-2 text-sm leading-relaxed text-on-surface-variant"
        >
          Two ways to find your next look — score what's already on your hangers, or let AI
          curate something new for wherever you're headed.
        </motion.p>
      </section>

      <div className="space-y-5">
        {/* Matchability widget */}
        <motion.button
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="show"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={goMatchability}
          className="group relative block w-full overflow-hidden rounded-3xl border border-border bg-card p-6 text-left shadow-sm transition-colors hover:border-primary/40 hover:shadow-ambient"
        >
          <motion.div
            className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/10"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Shirt className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <ArrowUpRight className="h-5 w-5 text-on-surface-variant transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
            </div>
            <p className="label-caps text-primary">Widget 01 · Matchability</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Score Your Outfit</h2>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Pick a top and bottom from your closet — or let AI do it — and get a synergy score
              with editorial-grade feedback on fit, tone and silhouette harmony.
            </p>
            <div className="mt-4 flex items-center gap-4 text-xs text-on-surface-variant">
              <span className="font-mono">{itemCount} items in closet</span>
              {lockedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-container/50 px-2.5 py-1 font-semibold text-on-primary-container">
                  <Sparkles className="h-3 w-3" /> {lockedCount} slot{lockedCount > 1 ? "s" : ""} ready
                </span>
              )}
            </div>
          </div>
        </motion.button>

        {/* Event widget */}
        <motion.button
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="show"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={goEvent}
          className="group relative block w-full overflow-hidden rounded-3xl border border-border bg-card p-6 text-left shadow-sm transition-colors hover:border-primary/40 hover:shadow-ambient"
        >
          <motion.div
            className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-clay/10"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
          />
          <div className="relative">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-clay text-clay-foreground shadow-sm">
                <CalendarHeart className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <ArrowUpRight className="h-5 w-5 text-on-surface-variant transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
            </div>
            <p className="label-caps text-primary">Widget 02 · Event</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Dress For the Occasion</h2>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              Tell us where you're headed — office, date night, a wedding — and AI assembles a
              complete outfit from your wardrobe with a context-aware synergy score.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant">
              <MapPin className="h-3.5 w-3.5" />
              <span>Currently set to <span className="font-semibold text-foreground">{matchmakerSession.eventContext}</span></span>
            </div>
          </div>
        </motion.button>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-8 rounded-2xl bg-primary-container/40 p-5"
      >
        <div className="mb-1.5 flex items-center gap-1.5">
          <Wand2 className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
          <p className="label-caps text-primary">How these connect</p>
        </div>
        <p className="text-sm leading-relaxed text-on-primary-container">
          Matchability and Event are two doors into the same engine — start from either one,
          lock in an item or an occasion, and AI carries that context wherever you go next.
        </p>
      </motion.section>
    </AppShell>
  );
}
