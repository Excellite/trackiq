"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import type { Truck } from "@/data/trucks";

const VEHICLE_ICONS: Record<string, string> = { truck: "🚛", bus: "🚌", car: "🚗", trailer: "🚚" };

const DOC_TYPES = [
  { value: "insurance",       label: "Insurance"                   },
  { value: "roadworthiness",  label: "Roadworthiness Certificate"  },
  { value: "vehicle_license", label: "Vehicle Licence"             },
  { value: "hackney_permit",  label: "Hackney Permit"              },
];

interface VehicleDocument {
  id: string;
  truck_id: string;
  doc_type: string;
  doc_number: string | null;
  issued_date: string | null;
  expiry_date: string;
  notes: string | null;
  created_at: string;
}

function docStatus(expiry: string): "expired" | "critical" | "warning" | "ok" {
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0)  return "expired";
  if (days < 14) return "critical";
  if (days < 30) return "warning";
  return "ok";
}

function daysLabel(expiry: string) {
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0)  return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Expires today";
  return `${days}d left`;
}

const STATUS_STYLE = {
  expired:  { chip: "bg-red-100 text-red-600 border-red-200",      dot: "bg-red-500"    },
  critical: { chip: "bg-red-50 text-red-500 border-red-200",       dot: "bg-red-400"    },
  warning:  { chip: "bg-orange-50 text-orange-600 border-orange-200", dot: "bg-orange-500" },
  ok:       { chip: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
};

function worstStatus(docs: VehicleDocument[]): keyof typeof STATUS_STYLE {
  if (!docs.length) return "ok";
  const order: (keyof typeof STATUS_STYLE)[] = ["expired","critical","warning","ok"];
  const statuses = docs.map((d) => docStatus(d.expiry_date));
  for (const s of order) if (statuses.includes(s)) return s;
  return "ok";
}

function AddDocForm({ truckId, onAdded }: { truckId: string; onAdded: (d: VehicleDocument) => void }) {
  const [form, setForm] = useState({ doc_type: "insurance", doc_number: "", issued_date: "", expiry_date: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.expiry_date) { setErr("Expiry date is required."); return; }
    setSaving(true); setErr("");
    const res = await fetch("/api/documents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ truck_id: truckId, ...form }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(json.error ?? "Failed to save."); return; }
    onAdded(json.data);
    setForm({ doc_type: "insurance", doc_number: "", issued_date: "", expiry_date: "", notes: "" });
  };

  const inputCls = "w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-orange-400 transition-colors";

  return (
    <form onSubmit={submit} className="space-y-3 pt-4 border-t border-[var(--border-sub)]">
      <p className="text-xs font-semibold text-[var(--text)]">Add Document</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-[var(--subtle)] mb-1">Type</label>
          <select name="doc_type" value={form.doc_type} onChange={onChange} className={inputCls}>
            {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-[var(--subtle)] mb-1">Doc Number</label>
          <input name="doc_number" value={form.doc_number} onChange={onChange} placeholder="INS-2025-001" className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] text-[var(--subtle)] mb-1">Issued</label>
          <input name="issued_date" type="date" value={form.issued_date} onChange={onChange} className={inputCls} />
        </div>
        <div>
          <label className="block text-[11px] text-[var(--subtle)] mb-1">Expires <span className="text-red-500">*</span></label>
          <input name="expiry_date" type="date" value={form.expiry_date} onChange={onChange} required className={inputCls} />
        </div>
      </div>
      {err && <p className="text-xs text-red-500">⚠ {err}</p>}
      <button type="submit" disabled={saving}
        className="w-full bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold py-2 rounded-lg transition-colors">
        {saving ? "Saving…" : "Add Document"}
      </button>
    </form>
  );
}

export function DocumentsPage({ trucks }: { trucks: Truck[] }) {
  const [docs,      setDocs]      = useState<VehicleDocument[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [filter,    setFilter]    = useState<"all" | "expired" | "warning" | "ok">("all");

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((j) => setDocs(j.data ?? []))
      .catch((err: unknown) => setLoadError((err as Error).message ?? "Failed to load documents"))
      .finally(() => setLoading(false));
  }, []);

  const docsByTruck = useMemo(() => {
    const map: Record<string, VehicleDocument[]> = {};
    for (const d of docs) {
      if (!map[d.truck_id]) map[d.truck_id] = [];
      map[d.truck_id].push(d);
    }
    return map;
  }, [docs]);

  const truckList = useMemo(() => {
    return trucks
      .map((t) => ({ ...t, truckDocs: docsByTruck[t.id] ?? [], worst: worstStatus(docsByTruck[t.id] ?? []) }))
      .filter((t) => {
        if (filter === "all") return true;
        if (filter === "expired") return t.worst === "expired" || t.worst === "critical";
        if (filter === "warning") return t.worst === "warning";
        if (filter === "ok")      return t.worst === "ok" && t.truckDocs.length > 0;
        return true;
      })
      .sort((a, b) => {
        const o = { expired: 0, critical: 1, warning: 2, ok: 3 };
        return o[a.worst] - o[b.worst];
      });
  }, [trucks, docsByTruck, filter]);

  const selectedDocs  = selected ? (docsByTruck[selected] ?? []) : [];
  const selectedTruck = trucks.find((t) => t.id === selected);

  const expired = trucks.filter((t) => ["expired","critical"].includes(worstStatus(docsByTruck[t.id] ?? []))).length;
  const warn    = trucks.filter((t) => worstStatus(docsByTruck[t.id] ?? []) === "warning").length;

  const deleteDoc = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    setDocs((p) => p.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Compliance Documents</h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          {trucks.length} vehicles · {expired} with expired/critical docs · {warn} expiring soon
        </p>
      </div>

      {loadError && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          ⚠ Failed to load documents: {loadError}
        </p>
      )}

      {/* Summary chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all",     label: "All Vehicles", count: trucks.length,    cls: "border-[var(--border)] text-[var(--muted)]" },
          { key: "expired", label: "Expired / Critical", count: expired,    cls: "border-red-200 text-red-600"                },
          { key: "warning", label: "Expiring Soon", count: warn,            cls: "border-orange-200 text-orange-500"          },
          { key: "ok",      label: "Up to Date",    count: trucks.length - expired - warn, cls: "border-emerald-200 text-emerald-600" },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key as typeof filter)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all",
              filter === f.key ? "bg-orange-500 border-orange-500 text-white" : `bg-[var(--surface)] ${f.cls} hover:border-orange-300`
            )}>
            {f.label}
            <span className={cn("font-mono text-[11px] rounded-full px-1.5", filter === f.key ? "bg-white/20 text-white" : "bg-[var(--surface-2)]")}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
        {/* Left — vehicle list */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-y-auto max-h-[50vh] lg:max-h-[calc(100vh-280px)]">
            {loading && (
              <div className="flex items-center justify-center h-20">
                <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {!loading && truckList.length === 0 && (
              <p className="text-sm text-[var(--subtle)] p-5 text-center">No vehicles match filter.</p>
            )}
            {truckList.map((t) => {
              const ws = STATUS_STYLE[t.worst];
              return (
                <button key={t.id} onClick={() => setSelected(t.id)}
                  className={cn(
                    "w-full text-left flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-sub)] transition-colors",
                    selected === t.id ? "bg-orange-50 border-l-2 border-l-orange-500" : "hover:bg-[var(--surface-2)]"
                  )}>
                  <span className="text-lg">{VEHICLE_ICONS[t.vehicle_type] ?? "🚘"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)] truncate">{t.name}</p>
                    <p className="text-[11px] font-mono text-[var(--subtle)]">{t.id}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border", ws.chip)}>
                      {t.worst === "ok" ? "✓ valid" : t.worst}
                    </span>
                    <p className="text-[10px] text-[var(--subtle)] mt-0.5">{t.truckDocs.length} docs</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — doc detail */}
        {selected && selectedTruck ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-sub)] flex items-center gap-3">
              <span className="text-xl">{VEHICLE_ICONS[selectedTruck.vehicle_type] ?? "🚘"}</span>
              <div>
                <p className="font-semibold text-sm text-[var(--text)]">{selectedTruck.name}</p>
                <p className="text-xs font-mono text-[var(--subtle)]">{selectedTruck.id} · {selectedTruck.plate}</p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {selectedDocs.length === 0 && (
                <p className="text-sm text-[var(--subtle)] py-4 text-center">No documents on record.</p>
              )}

              {selectedDocs.map((d) => {
                const st = docStatus(d.expiry_date);
                const stStyle = STATUS_STYLE[st];
                const label = DOC_TYPES.find((x) => x.value === d.doc_type)?.label ?? d.doc_type;
                return (
                  <div key={d.id} className={cn("rounded-xl border p-4 flex items-start justify-between gap-3", stStyle.chip)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", stStyle.dot)} />
                        <p className="text-sm font-semibold text-[var(--text)]">{label}</p>
                        <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border", stStyle.chip)}>
                          {daysLabel(d.expiry_date)}
                        </span>
                      </div>
                      {d.doc_number && <p className="text-xs font-mono text-[var(--subtle)] mt-1">{d.doc_number}</p>}
                      <div className="flex gap-4 mt-1 text-[11px] text-[var(--muted)]">
                        {d.issued_date && <span>Issued: {d.issued_date}</span>}
                        <span>Expires: <strong>{d.expiry_date}</strong></span>
                      </div>
                    </div>
                    <button onClick={() => deleteDoc(d.id)}
                      className="shrink-0 text-[10px] text-[var(--subtle)] hover:text-red-500 transition-colors font-mono mt-0.5">
                      Remove
                    </button>
                  </div>
                );
              })}

              <AddDocForm truckId={selected} onAdded={(d) => setDocs((p) => [...p, d])} />
            </div>
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center justify-center h-64 shadow-sm">
            <div className="text-center">
              <p className="text-3xl mb-2">📄</p>
              <p className="text-sm font-semibold text-[var(--text)]">Select a vehicle</p>
              <p className="text-xs text-[var(--subtle)] mt-1">Click any vehicle to view or add documents</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
