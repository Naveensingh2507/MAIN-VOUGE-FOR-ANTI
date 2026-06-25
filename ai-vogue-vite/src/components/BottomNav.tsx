import { Link, useLocation } from "react-router-dom";
import { Shirt, Sparkles, User } from "lucide-react";

const TABS = [
  { to: "/", label: "Closet", Icon: Shirt },
  { to: "/style", label: "Style", Icon: Sparkles },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  const path = useLocation().pathname;

  const isActive = (to: string) => {
    if (to === "/") return path === "/";
    if (to === "/style") return path === "/style" || path === "/matchability" || path === "/event";
    return path.startsWith(to);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant/30 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-md items-center justify-around px-6">
        {TABS.map(({ to, label, Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={[
                "flex flex-col items-center gap-1 px-5 py-2 transition-colors duration-200",
                active
                  ? "text-primary"
                  : "text-on-surface-variant/70 hover:text-primary",
              ].join(" ")}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
              <span className="label-caps text-[10px]">{label}</span>
              {active && <span className="mt-0.5 h-0.5 w-6 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
