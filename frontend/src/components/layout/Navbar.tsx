import { NavLink } from "react-router-dom";
import { TrendingUp, Search, Star, Briefcase } from "lucide-react";
import clsx from "clsx";

const links = [
  { to: "/", label: "Dashboard", icon: TrendingUp },
  { to: "/search", label: "Search", icon: Search },
  { to: "/watchlist", label: "Watchlist", icon: Star },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
];

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <TrendingUp size={20} />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
            StockPlanner
          </span>
        </NavLink>

        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
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
      </div>
    </nav>
  );
}
