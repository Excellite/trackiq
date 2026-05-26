"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

interface User {
  name: string;
  email: string;
  role: string;
}

const NAV = [
  { id: "dashboard", icon: "⬛", label: "Dashboard" },
  { id: "map", icon: "🗺️", label: "Live Map" },
  { id: "trucks", icon: "🚛", label: "Trucks" },
  { id: "fuel", icon: "⛽", label: "Fuel" },
  { id: "reports", icon: "📋", label: "Reports" },
  { id: "setup", icon: "⚙️", label: "Setup" },
];

export function Sidebar({
  activeNav,
  onNav,
  user,
  onLogout,
}: {
  activeNav: string;
  onNav: (id: string) => void;
  user: User;
  onLogout: () => void;
}) {
  return (
    <aside className="hidden md:flex w-52 shrink-0 bg-slate-900 border-r border-slate-700/50 flex-col">
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-xl">
            🚛
          </div>
          <div>
            <p className="text-base font-extrabold tracking-wide text-white">TrackIQ</p>
            <p className="text-[10px] text-slate-500">Fleet Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2.5 space-y-0.5">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => onNav(n.id)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
              activeNav === n.id
                ? "bg-amber-500/20 text-amber-400"
                : "text-slate-400 hover:bg-slate-700/40 hover:text-white"
            )}
          >
            <span className="text-base">{n.icon}</span> {n.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700/50">
        <p className="text-sm font-semibold text-white">{user.name}</p>
        <p className="text-xs text-slate-400 mb-3">{user.role}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="w-full border-slate-600 text-slate-400 hover:bg-slate-700 text-xs"
        >
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
