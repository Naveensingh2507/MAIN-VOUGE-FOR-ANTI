import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { ItemDrawer } from "./ItemDrawer";
import { AssetEditorModal } from "./AssetEditorModal";
import { AuthGateModal } from "./AuthGateModal";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto max-w-screen-md px-5 pb-32 pt-8">{children}</main>
      <BottomNav />
      <ItemDrawer />
      <AssetEditorModal />
      <AuthGateModal />
    </div>
  );
}