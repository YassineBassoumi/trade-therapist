import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Activity, BarChart2, BookOpen, FileText, LogIn, LogOut, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();
  const { isAuthenticated, login, logout, user } = useAuth();

  return (
    <div className="h-screen w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col p-4 flex-shrink-0 sticky top-0 left-0">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Activity className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold tracking-tight">Dr. Trade</span>
      </div>

      <div className="flex-1 space-y-2">
        {isAuthenticated ? (
          <>
            <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === "/dashboard" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50 text-muted-foreground"}`}>
              <BookOpen className="h-4 w-4" />
              Journal
            </Link>
            <Link href="/trades/new" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === "/trades/new" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50 text-muted-foreground"}`}>
              <PlusCircle className="h-4 w-4" />
              New Trade
            </Link>
            <Link href="/insights" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === "/insights" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50 text-muted-foreground"}`}>
              <BarChart2 className="h-4 w-4" />
              Insights
            </Link>
            <Link href="/report" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === "/report" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50 text-muted-foreground"}`}>
              <FileText className="h-4 w-4" />
              Weekly Report
            </Link>
          </>
        ) : (
          <Link href="/" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location === "/" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50 text-muted-foreground"}`}>
            <Activity className="h-4 w-4" />
            Home
          </Link>
        )}
      </div>

      <div className="pt-4 border-t border-sidebar-border mt-auto">
        {isAuthenticated ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center border border-sidebar-border">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-medium">{user?.firstName?.[0] || user?.email?.[0] || "?"}</span>
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{user?.firstName || user?.email?.split('@')[0]}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start gap-2 border-sidebar-border bg-transparent hover:bg-sidebar-accent" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Log out
            </Button>
          </div>
        ) : (
          <Button className="w-full justify-start gap-2" onClick={login}>
            <LogIn className="h-4 w-4" />
            Log in
          </Button>
        )}
      </div>
    </div>
  );
}
