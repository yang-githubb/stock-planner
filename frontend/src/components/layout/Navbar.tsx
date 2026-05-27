import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  TrendingUp,
  GitCompareArrows,
  Star,
  Briefcase,
  Users,
  LogIn,
  LogOut,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/Button";

const links = [
  { to: "/", label: "Dashboard", icon: TrendingUp },
  { to: "/compare", label: "Compare", icon: GitCompareArrows },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/insider-feed", label: "Insiders", icon: Users },
];

export function Navbar() {
  const { user, signOut, configured } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <NavLink to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <TrendingUp size={20} />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
              StockPlanner
            </span>
          </NavLink>

          <div className="flex items-center gap-1 overflow-x-auto">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:gap-2 sm:px-3",
                    isActive
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
                  )
                }
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <>
                <span className="hidden max-w-[120px] truncate text-xs text-gray-500 dark:text-gray-400 md:inline">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAuthOpen(true)}
                disabled={!configured}
                title={configured ? "Sign in" : "Configure Supabase in .env"}
              >
                <LogIn size={16} />
                <span className="hidden sm:inline">Sign in</span>
              </Button>
            )}
          </div>
        </div>
      </nav>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
