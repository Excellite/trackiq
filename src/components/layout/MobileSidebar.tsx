"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard, MapPin, Truck, Fuel, BarChart3,
  Wrench, Users, ShieldCheck, ClipboardPlus,
  LogOut, ChevronRight, Menu, X,
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
      { id: "trucks",      icon: Truck,       label: "Fleet"       },
      { id: "drivers",     icon: Users,       label: "Drivers"     },
      { id: "fuel",        icon: Fuel,        label: "Fuel"        },
      { id: "reports",     icon: BarChart3,   label: "Reports"     },
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

export function MobileTopBar({
  title,
  user,
  onMenuOpen,
}: {
  title: string;
  user: User;
  onMenuOpen: () => void;
}) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[var(--sidebar-bg)] border-b border-[var(--sidebar-bdr)] flex items-center px-4 gap-3">
      <button
        onClick={onMenuOpen}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2.5 flex-1">
        <div className="w-7 h-7 bg-orange-500 rounded-md flex items-center justify-center shrink-0">
          <Truck className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-white tracking-wide">TrackIQ</span>
        <span className="text-[var(--subtle)] text-xs">·</span>
        <span className="text-xs text-gray-300 capitalize">{title}</span>
      </div>
      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
        <span className="text-xs font-bold text-orange-400">{user.name.charAt(0).toUpperCase()}</span>
      </div>
    </div>
  );
}

export function MobileDrawer({
  open,
  onClose,
  activeNav,
  onNav,
  user,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  activeNav: string;
  onNav: (id: string) => void;
  user: User;
  onLogout: () => void;
}) {
  // Close on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-bdr)] flex flex-col transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--sidebar-bdr)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-wide">TrackIQ</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">Fleet Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
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
                      onClick={() => { onNav(item.id); onClose(); }}
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

        {/* Footer */}
        <div className="p-4 border-t border-[var(--sidebar-bdr)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-orange-400">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-[11px] text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
