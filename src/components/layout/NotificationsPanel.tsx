"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Alert } from "@/app/api/notifications/route";

const SEVERITY_CONFIG = {
  critical: { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-600",    dot: "bg-red-500",    badge: "bg-red-500"    },
  warning:  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-600", dot: "bg-orange-500", badge: "bg-orange-500" },
  info:     { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-600",   dot: "bg-blue-400",   badge: "bg-blue-400"   },
};

const TYPE_ICONS: Record<string, string> = {
  low_fuel:             "⛽",
  offline:              "📡",
  maintenance_overdue:  "🔧",
  doc_expiry:           "📄",
  speeding:             "🚨",
};

export function NotificationsPanel({ onSelectTruck }: { onSelectTruck: (id: string) => void }) {
  const [open,       setOpen]       = useState(false);
  const [alerts,     setAlerts]     = useState<Alert[]>([]);
  const [dismissed,  setDismissed]  = useState<Set<string>>(new Set());
  const [loading,    setLoading]    = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      const j = await r.json();
      setAlerts(j.data ?? []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const visible    = alerts.filter((a) => !dismissed.has(a.id));
  const criticals  = visible.filter((a) => a.severity === "critical").length;
  const unread     = visible.length;

  const dismiss    = (id: string) => setDismissed((p) => new Set([...p, id]));
  const dismissAll = () => setDismissed(new Set(alerts.map((a) => a.id)));

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setOpen(true)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className={cn(
            "absolute -top-0.5 -right-0.5 text-[9px] font-bold text-white rounded-full w-4 h-4 flex items-center justify-center",
            criticals > 0 ? "bg-red-500" : "bg-orange-500"
          )}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />
      )}

      {/* Slide-over panel */}
      <div className={cn(
        "fixed top-0 right-0 h-full w-full sm:w-[400px] bg-[var(--surface)] border-l border-[var(--border)] z-50 flex flex-col shadow-2xl transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            <span className="font-semibold text-sm text-[var(--text)]">Notifications</span>
            {unread > 0 && (
              <span className="text-[10px] font-mono bg-orange-100 text-orange-600 border border-orange-200 rounded-full px-1.5 py-0.5">
                {unread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAlerts} className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors" title="Refresh">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
            {unread > 0 && (
              <button onClick={dismissAll} className="text-[11px] text-[var(--subtle)] hover:text-[var(--muted)] transition-colors">
                Dismiss all
              </button>
            )}
            <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && visible.length === 0 && (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && visible.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <span className="text-3xl">✅</span>
              <p className="text-sm font-semibold text-[var(--text)]">All clear</p>
              <p className="text-xs text-[var(--subtle)]">No active alerts</p>
            </div>
          )}

          {visible.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            return (
              <div key={alert.id} className={cn("flex gap-3 px-4 py-3.5 border-b border-[var(--border-sub)]", cfg.bg)}>
                <span className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[alert.type] ?? "⚠️"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wide", cfg.text)}>{alert.severity}</span>
                    <span className="text-xs font-semibold text-[var(--text)]">{alert.title}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-0.5 leading-relaxed">{alert.message}</p>
                  <button
                    onClick={() => { onSelectTruck(alert.truck_id); setOpen(false); }}
                    className={cn("text-[11px] font-semibold mt-1.5 transition-colors", cfg.text, "hover:underline")}
                  >
                    View {alert.truck_id} →
                  </button>
                </div>
                <button onClick={() => dismiss(alert.id)} className="shrink-0 p-1 rounded hover:bg-black/5 text-[var(--subtle)] transition-colors mt-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] shrink-0">
          <p className="text-[11px] text-[var(--subtle)] text-center">
            Alerts auto-refresh from live fleet data
          </p>
        </div>
      </div>
    </>
  );
}
