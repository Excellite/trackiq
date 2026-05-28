"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Truck } from "@/data/trucks";
import type { MaintenanceRecord } from "@/lib/store";

// ── Constants ─────────────────────────────────────────────────────────────────

const SERVICE_TYPES: Record<string, { label: string; icon: string; defaultMonths: number }> = {
  oil_change:   { label: "Oil & Filter Change",      icon: "🛢️", defaultMonths: 6  },
  tire:         { label: "Tyre Rotation / Replace",  icon: "🔄", defaultMonths: 12 },
  brakes:       { label: "Brake Inspection",         icon: "🛑", defaultMonths: 6  },
  engine:       { label: "Engine Service",           icon: "⚙️", defaultMonths: 12 },
  full_service: { label: "Full Service",             icon: "🔧", defaultMonths: 6  },
  battery:      { label: "Battery Check",            icon: "🔋", defaultMonths: 12 },
  transmission: { label: "Transmission Service",    icon: "⚡", defaultMonths: 24 },
  cooling:      { label: "Cooling System",           icon: "💧", defaultMonths: 12 },
  other:        { label: "Other",                    icon: "📋", defaultMonths: 6  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function daysUntil(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00`);
  return Math.round((d.getTime() - TODAY.getTime()) / 86400000);
}

function serviceStatus(nextService: string): "overdue" | "due-soon" | "ok" {
  const days = daysUntil(nextService);
  if (days < 0)   return "overdue";
  if (days <= 30) return "due-soon";
  return "ok";
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const STATUS_CONFIG = {
  overdue:  { label: "Overdue",   tw: "bg-red-100 text-red-600 border-red-200",         dot: "bg-red-500",     text: "text-red-600"   },
  "due-soon": { label: "Due Soon", tw: "bg-orange-100 text-orange-600 border-orange-200", dot: "bg-orange-500",  text: "text-orange-500" },
  ok:       { label: "Up to Date", tw: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", text: "text-emerald-600" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children, color = "orange" }: { children: React.ReactNode; color?: "orange" | "blue" | "muted" }) {
  const cls = color === "blue" ? "text-blue-500" : color === "muted" ? "text-[var(--subtle)]" : "text-orange-500";
  return <p className={`text-[10px] font-mono tracking-widest uppercase font-semibold ${cls}`}>{children}</p>;
}

function StatusChip({ status }: { status: "overdue" | "due-soon" | "ok" }) {
  const s = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border", s.tw)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.dot, status === "ok" && "")} />
      {s.label}
    </span>
  );
}

function DaysBadge({ nextService }: { nextService: string }) {
  const days  = daysUntil(nextService);
  const abs   = Math.abs(days);
  const years = Math.floor(abs / 365);
  const months = Math.floor((abs % 365) / 30);

  const label = days < 0
    ? years > 0
      ? `${years}y ${months}m overdue`
      : months > 0 ? `${months}m overdue` : `${abs}d overdue`
    : days === 0 ? "Due today"
    : days <= 30 ? `Due in ${days}d`
    : `Due ${fmtDate(nextService)}`;

  const cls = days < 0 ? "text-red-500" : days <= 30 ? "text-orange-500" : "text-[var(--muted)]";
  return <span className={cn("text-[11px] font-mono", cls)}>{label}</span>;
}

// ── Log form ──────────────────────────────────────────────────────────────────

const INIT_FORM = {
  service_type: "oil_change",
  performed_at: new Date().toISOString().slice(0, 10),
  next_due_at: "",
  odometer_km: "",
  cost_ngn: "",
  technician: "",
  notes: "",
};

function LogForm({ truckId, onSaved }: { truckId: string; onSaved: (r: MaintenanceRecord) => void }) {
  const [form,    setForm]    = useState(INIT_FORM);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fieldCls = "w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--subtle)] outline-none focus:border-orange-400 transition-colors";

  const handleServiceTypeChange = (type: string) => {
    const defaultMonths = SERVICE_TYPES[type]?.defaultMonths ?? 6;
    const nextDue = form.performed_at ? addMonths(form.performed_at, defaultMonths) : "";
    setForm((p) => ({ ...p, service_type: type, next_due_at: nextDue }));
  };

  const handlePerformedChange = (date: string) => {
    const defaultMonths = SERVICE_TYPES[form.service_type]?.defaultMonths ?? 6;
    const nextDue = date ? addMonths(date, defaultMonths) : "";
    setForm((p) => ({ ...p, performed_at: date, next_due_at: nextDue }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        truck_id:    truckId,
        service_type: form.service_type,
        performed_at: form.performed_at,
        next_due_at:  form.next_due_at || null,
        odometer_km:  form.odometer_km  ? Number(form.odometer_km)  : null,
        cost_ngn:     form.cost_ngn     ? Number(form.cost_ngn)     : null,
        technician:   form.technician   || null,
        notes:        form.notes        || null,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error ?? "Failed to save."); return; }
    setForm(INIT_FORM);
    onSaved(json.data);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Service Type</label>
          <select value={form.service_type} onChange={(e) => handleServiceTypeChange(e.target.value)} className={fieldCls}>
            {Object.entries(SERVICE_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Date Performed</label>
          <input type="date" value={form.performed_at} onChange={(e) => handlePerformedChange(e.target.value)} className={fieldCls} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Next Due Date</label>
          <input type="date" value={form.next_due_at} onChange={(e) => setForm((p) => ({ ...p, next_due_at: e.target.value }))} className={fieldCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Odometer (km)</label>
          <input type="number" value={form.odometer_km} onChange={(e) => setForm((p) => ({ ...p, odometer_km: e.target.value }))} placeholder="e.g. 142300" className={fieldCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Cost (₦)</label>
          <input type="number" value={form.cost_ngn} onChange={(e) => setForm((p) => ({ ...p, cost_ngn: e.target.value }))} placeholder="e.g. 35000" className={fieldCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Technician / Workshop</label>
          <input type="text" value={form.technician} onChange={(e) => setForm((p) => ({ ...p, technician: e.target.value }))} placeholder="e.g. Emeka Auto Garage" className={fieldCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Notes (optional)</label>
          <input type="text" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="e.g. Full synthetic 15W-40 oil" className={fieldCls} />
        </div>
      </div>
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-600 py-2">
          <AlertDescription className="text-xs">⚠ {error}</AlertDescription>
        </Alert>
      )}
      <button type="submit" disabled={saving}
        className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-60">
        {saving ? "Saving…" : "Log Service Record"}
      </button>
    </form>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function TruckDetail({ truck }: { truck: Truck }) {
  const [records,    setRecords]    = useState<MaintenanceRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/maintenance?truck_id=${truck.id}`);
    const json = await res.json();
    setRecords(json.data ?? []);
    setLoading(false);
  }, [truck.id]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSaved = (r: MaintenanceRecord) => {
    setRecords((p) => [r, ...p]);
    setShowForm(false);
  };

  const status = serviceStatus(truck.nextService);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-sub)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--text)]">{truck.name}</p>
            <p className="text-xs text-[var(--subtle)] font-mono mt-0.5">{truck.id} · {truck.plate} · {truck.model}</p>
          </div>
          <StatusChip status={status} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div className="bg-[var(--surface-2)] rounded-lg p-2.5">
            <p className="text-[var(--subtle)] text-[10px]">Last Service</p>
            <p className="font-semibold text-[var(--text)] mt-0.5">{fmtDate(truck.lastService)}</p>
          </div>
          <div className="bg-[var(--surface-2)] rounded-lg p-2.5">
            <p className="text-[var(--subtle)] text-[10px]">Next Due</p>
            <p className={cn("font-semibold mt-0.5", STATUS_CONFIG[status].text)}>{fmtDate(truck.nextService)}</p>
          </div>
          <div className="bg-[var(--surface-2)] rounded-lg p-2.5">
            <p className="text-[var(--subtle)] text-[10px]">Odometer</p>
            <p className="font-semibold text-[var(--text)] mt-0.5">{truck.odometer.toLocaleString()} km</p>
          </div>
        </div>
      </div>

      {/* Log toggle */}
      <div className="px-5 py-3 border-b border-[var(--border-sub)]">
        <button
          onClick={() => setShowForm((v) => !v)}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold border transition-colors",
            showForm
              ? "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)]"
              : "bg-orange-500 hover:bg-orange-400 border-orange-500 text-white"
          )}
        >
          {showForm ? "↑ Hide Form" : "+ Log New Service"}
        </button>
        {showForm && (
          <div className="mt-4">
            <LogForm truckId={truck.id} onSaved={handleSaved} />
          </div>
        )}
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-3 border-b border-[var(--border-sub)]">
          <SectionLabel>Service History · {records.length} records</SectionLabel>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-[var(--subtle)]">No service records yet.</p>
            <p className="text-xs text-[var(--subtle)] mt-1">Use the form above to log the first service.</p>
          </div>
        ) : (
          <div>
            {records.map((r) => {
              const svc = SERVICE_TYPES[r.service_type] ?? SERVICE_TYPES.other;
              return (
                <div key={r.id} className="px-5 py-3.5 border-b border-[var(--border-sub)] hover:bg-[var(--surface-2)] transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{svc.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">{svc.label}</p>
                        <p className="text-xs text-[var(--subtle)] mt-0.5">{fmtDate(r.performed_at)}</p>
                      </div>
                    </div>
                    {r.cost_ngn != null && (
                      <span className="text-xs font-mono text-[var(--muted)] shrink-0">
                        ₦{Number(r.cost_ngn).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                    {r.next_due_at && (
                      <span className="bg-[var(--surface-2)] border border-[var(--border-sub)] rounded px-1.5 py-0.5 text-[var(--muted)]">
                        Next: {fmtDate(r.next_due_at)}
                      </span>
                    )}
                    {r.odometer_km != null && (
                      <span className="bg-[var(--surface-2)] border border-[var(--border-sub)] rounded px-1.5 py-0.5 text-[var(--muted)] font-mono">
                        {r.odometer_km.toLocaleString()} km
                      </span>
                    )}
                    {r.technician && (
                      <span className="bg-[var(--surface-2)] border border-[var(--border-sub)] rounded px-1.5 py-0.5 text-[var(--muted)]">
                        {r.technician}
                      </span>
                    )}
                  </div>
                  {r.notes && <p className="mt-1.5 text-xs text-[var(--subtle)] italic">{r.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function MaintenancePage({ trucks }: { trucks: Truck[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(trucks[0]?.id ?? null);
  const [filter,     setFilter]     = useState<"all" | "overdue" | "due-soon" | "ok">("all");

  const withStatus = trucks.map((t) => ({ ...t, svcStatus: serviceStatus(t.nextService) }));
  const overdue  = withStatus.filter((t) => t.svcStatus === "overdue").length;
  const dueSoon  = withStatus.filter((t) => t.svcStatus === "due-soon").length;
  const ok       = withStatus.filter((t) => t.svcStatus === "ok").length;

  const filtered = filter === "all" ? withStatus : withStatus.filter((t) => t.svcStatus === filter);
  const sorted   = [...filtered].sort((a, b) => {
    const order = { overdue: 0, "due-soon": 1, ok: 2 };
    return order[a.svcStatus] - order[b.svcStatus] || daysUntil(a.nextService) - daysUntil(b.nextService);
  });

  const selectedTruck = trucks.find((t) => t.id === selectedId) ?? null;

  const FILTERS: { key: typeof filter; label: string; count: number; cls: string; active: string }[] = [
    { key: "all",      label: "All",       count: trucks.length, cls: "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]",         active: "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)]" },
    { key: "overdue",  label: "Overdue",   count: overdue,       cls: "border-red-200 text-red-500 hover:bg-red-50",                                     active: "bg-red-50 border-red-300 text-red-600"       },
    { key: "due-soon", label: "Due Soon",  count: dueSoon,       cls: "border-orange-200 text-orange-500 hover:bg-orange-50",                            active: "bg-orange-50 border-orange-300 text-orange-600" },
    { key: "ok",       label: "Up to Date", count: ok,           cls: "border-emerald-200 text-emerald-600 hover:bg-emerald-50",                          active: "bg-emerald-50 border-emerald-300 text-emerald-700" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Maintenance</h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">Vehicle service history, due dates, and service logging</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Vehicles", value: trucks.length, color: "text-[var(--text)]",    sub: "in fleet"         },
          { label: "Overdue",        value: overdue,       color: "text-red-500",           sub: "need service now" },
          { label: "Due This Month", value: dueSoon,       color: "text-orange-500",        sub: "within 30 days"   },
          { label: "Up to Date",     value: ok,            color: "text-emerald-600",       sub: "no action needed" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
            <p className="text-xs text-[var(--muted)] mb-1">{label}</p>
            <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
            <p className="text-[10px] text-[var(--subtle)] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdue > 0 && (
        <Alert className="border-red-200 bg-red-50 text-red-600">
          <AlertDescription className="text-sm">
            ⚠ <strong>{overdue} vehicle{overdue > 1 ? "s are" : " is"} overdue</strong> for service.
            {" "}Select a truck on the left to log a service record.
          </AlertDescription>
        </Alert>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4" style={{ minHeight: 560 }}>

        {/* Left — truck list */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-sub)] flex items-center justify-between gap-2 flex-wrap">
            <SectionLabel>Fleet · {sorted.length} vehicles</SectionLabel>
            <div className="flex gap-1 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors",
                    filter === f.key ? f.active : f.cls
                  )}
                >
                  {f.label} {f.count > 0 && <span className="font-mono">({f.count})</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="text-sm text-[var(--subtle)] p-5 text-center">No vehicles match this filter.</p>
            ) : sorted.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "w-full text-left px-4 py-3.5 border-b border-[var(--border-sub)] transition-colors",
                  selectedId === t.id
                    ? "bg-orange-50 dark:bg-orange-500/10 border-l-2 border-l-orange-500"
                    : "hover:bg-[var(--surface-2)]"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">{t.name}</p>
                    <p className="text-[10px] text-[var(--subtle)] font-mono mt-0.5">{t.id} · {t.plate}</p>
                  </div>
                  <StatusChip status={t.svcStatus} />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[var(--subtle)]">
                    Last: {fmtDate(t.lastService)}
                  </span>
                  <DaysBadge nextService={t.nextService} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right — detail */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden flex flex-col">
          {selectedTruck ? (
            <TruckDetail key={selectedTruck.id} truck={selectedTruck} />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-[var(--subtle)]">Select a vehicle to view its maintenance history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
