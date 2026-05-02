import React from "react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-8 pb-28 md:pb-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
