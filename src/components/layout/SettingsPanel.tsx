"use client";

import { X, Bell, RefreshCw, LogOut, Shield, Info, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

interface User {
  name: string;
  email: string;
  role: string;
}

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  refreshInterval: number;
  onRefreshIntervalChange: (ms: number) => void;
}

const REFRESH_OPTIONS = [
  { label: "5 seconds",  value: 5_000  },
  { label: "10 seconds", value: 10_000 },
  { label: "30 seconds", value: 30_000 },
  { label: "1 minute",   value: 60_000 },
];

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-[var(--text)]">{label}</p>
        {sub && <p className="text-xs text-[var(--subtle)] mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsPanel({ open, onClose, user, onLogout, refreshInterval, onRefreshIntervalChange }: SettingsPanelProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      )}

      <div className={`fixed top-0 right-0 h-full w-full sm:w-80 bg-[var(--surface)] border-l border-[var(--border)] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}>

        {/* Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-[var(--border-sub)] shrink-0">
          <p className="text-sm font-bold text-[var(--text)]">Settings</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--subtle)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Profile */}
          <div className="px-5 py-4 border-b border-[var(--border-sub)]">
            <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--subtle)] font-semibold mb-3">Account</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-orange-500">{user.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text)] truncate">{user.name}</p>
                <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
              </div>
              <span className="ml-auto shrink-0 text-[10px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">
                {user.role}
              </span>
            </div>
          </div>

          {/* Appearance */}
          <div className="px-5 py-4 border-b border-[var(--border-sub)]">
            <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--subtle)] font-semibold mb-1">Appearance</p>
            <Row label="Theme" sub={isDark ? "Dark mode active" : "Light mode active"}>
              <button
                onClick={toggleTheme}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${isDark ? "bg-orange-500" : "bg-[var(--border)]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full flex items-center justify-center bg-white shadow transition-transform duration-300 ${isDark ? "translate-x-6" : "translate-x-0"}`}>
                  {isDark ? <Moon className="w-3 h-3 text-orange-500" /> : <Sun className="w-3 h-3 text-yellow-500" />}
                </span>
              </button>
            </Row>
          </div>

          {/* Preferences */}
          <div className="px-5 py-4 border-b border-[var(--border-sub)]">
            <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--subtle)] font-semibold mb-1">Preferences</p>
            <div className="divide-y divide-[var(--border-sub)]">
              <Row label="Auto-Refresh" sub="How often fleet data updates">
                <select
                  value={refreshInterval}
                  onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
                  className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text)] outline-none focus:border-orange-400 transition-colors"
                >
                  {REFRESH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Row>
              <Row label="Notifications" sub="Alert banners for fleet events">
                <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 font-medium">On</span>
              </Row>
            </div>
          </div>

          {/* System */}
          <div className="px-5 py-4 border-b border-[var(--border-sub)]">
            <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--subtle)] font-semibold mb-1">System</p>
            <div className="divide-y divide-[var(--border-sub)]">
              <Row label="GPS Tracker" sub="Teltonika FMB920">
                <span className="text-xs text-[var(--muted)] font-mono">Webhook</span>
              </Row>
              <Row label="Supabase" sub="Database & Auth">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </Row>
              <Row label="App Version" sub="TrackIQ Fleet Intelligence">
                <span className="text-xs text-[var(--subtle)] font-mono">1.0.0</span>
              </Row>
            </div>
          </div>

          {/* Links */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-mono tracking-widest uppercase text-[var(--subtle)] font-semibold mb-3">More</p>
            <div className="space-y-1">
              {[
                { icon: Shield, label: "Privacy & Security" },
                { icon: Info,   label: "About TrackIQ"      },
              ].map(({ icon: Icon, label }) => (
                <button key={label} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors text-left">
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sign out */}
        <div className="px-5 py-4 border-t border-[var(--border-sub)] shrink-0">
          <Button
            onClick={() => { onClose(); onLogout(); }}
            variant="outline"
            className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 font-semibold"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    </>
  );
}
