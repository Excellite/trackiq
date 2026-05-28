"use client";

import {
  LayoutDashboard,
  MapPin,
  Truck,
  Fuel,
  BarChart3,
  Wrench,
  Users,
  ShieldCheck,
  ClipboardPlus,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";

interface User { name: string; email: string; role: string }

const NAV_GROUPS = [
  {
    label: "Monitor",
    items: [
      { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { id: "map",       icon: MapPin,          label: "Live Map"  },
    ],
  },
  {
    label: "Fleet",
    items: [
      { id: "trucks",      icon: Truck,    label: "Fleet"       },
      { id: "drivers",     icon: Users,    label: "Drivers"     },
      { id: "fuel",        icon: Fuel,     label: "Fuel"        },
      { id: "reports",     icon: BarChart3, label: "Reports"    },
      { id: "maintenance", icon: Wrench,      label: "Maintenance" },
      { id: "documents",   icon: ShieldCheck, label: "Compliance"  },
    ],
  },
  {
    label: "Settings",
    items: [
      { id: "register", icon: ClipboardPlus, label: "Add Vehicle" },
    ],
  },
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
    <aside className="hidden md:flex w-56 shrink-0 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-bdr)] flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--sidebar-bdr)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white tracking-wide">TrackIQ</p>
            <p className="text-[10px] text-gray-500 tracking-wide uppercase">Fleet Intelligence</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNav(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left group",
                      active
                        ? "bg-orange-500/10 text-orange-400 border-l-2 border-orange-500 pl-[10px]"
                        : "text-gray-400 hover:bg-white/5 hover:text-gray-100 border-l-2 border-transparent pl-[10px]"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", active ? "text-orange-400" : "text-gray-500 group-hover:text-gray-300")} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="w-3 h-3 text-orange-400/60" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-[var(--sidebar-bdr)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-orange-400">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-gray-500 truncate">{user.role}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
