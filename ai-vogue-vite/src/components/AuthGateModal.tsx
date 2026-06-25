import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Sparkles, X } from "lucide-react";
import { useAppState } from "@/state/AppState";

export function AuthGateModal() {
  const { uiState, setUIState } = useAppState();
  const navigate = useNavigate();
  const gate = uiState.authGate;
  const open = !!gate;

  const close = () => setUIState({ authGate: null });

  const goAuth = () => {
    const redirect = gate?.redirectTo ?? "/";
    close();
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
            className="relative w-full max-w-md rounded-t-3xl bg-card p-6 shadow-ambient sm:rounded-3xl"
          >
            <button onClick={close} aria-label="Close" className="absolute right-6 top-6 text-on-surface-variant hover:text-foreground">
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <p className="label-caps text-primary">Members only</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Sign in to continue</h2>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              {gate?.reason ?? "Create a free account to unlock this feature."}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={goAuth}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                <span className="label-caps">Sign in or create account</span>
              </button>
              <button
                onClick={close}
                className="flex w-full items-center justify-center rounded-full border border-outline-variant px-6 py-3.5 text-foreground transition-colors hover:bg-surface-container-low"
              >
                <span className="label-caps">Not now</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
