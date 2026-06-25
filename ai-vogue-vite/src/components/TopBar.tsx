import { Link } from "react-router-dom";
import { Menu, UserCircle, LogOut } from "lucide-react";
import { useAppState } from "@/state/AppState";
import { signOut } from "@/utils/authClient";

export function TopBar() {
  const { isAuthenticated, currentUser, setCurrentUser } = useAppState();

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-outline-variant/30 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-md items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <button aria-label="Menu" className="text-primary transition-opacity hover:opacity-70">
            <Menu className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <Link to="/" className="label-caps text-primary">AI Vogue</Link>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                aria-label="Profile"
                className="flex items-center gap-2 text-sm text-foreground transition-opacity hover:opacity-70"
              >
                <UserCircle className="h-7 w-7" strokeWidth={1.4} />
                <span className="hidden sm:inline text-xs text-on-surface-variant">
                  {currentUser?.email}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="text-on-surface-variant transition-opacity hover:text-foreground hover:opacity-70"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.6} />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="label-caps rounded-full bg-primary px-4 py-2 text-primary-foreground transition-transform active:scale-[0.97]"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}