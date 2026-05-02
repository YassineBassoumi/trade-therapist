import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { Activity, BarChart2, BookOpen, FileText, LogIn, PlusCircle } from "lucide-react";

export function BottomNav() {
  const [location] = useLocation();
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-sidebar/95 backdrop-blur-sm">
        <div className="flex items-center justify-center px-4 py-3">
          <button
            onClick={login}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
          >
            <LogIn className="h-4 w-4" />
            Log in
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: "/dashboard", icon: BookOpen, label: "Journal" },
    { href: "/trades/new", icon: PlusCircle, label: "New Trade" },
    { href: "/insights", icon: BarChart2, label: "Insights" },
    { href: "/report", icon: FileText, label: "Report" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-sidebar/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] ${
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] font-medium leading-none ${active ? "text-primary" : ""}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
