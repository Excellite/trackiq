"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Truck } from "@/data/trucks";
import type { Driver } from "@/lib/store";

const VEHICLE_TYPES = ["truck", "bus", "car", "trailer"] as const;
const VEHICLE_ICONS: Record<string, string> = { truck: "🚛", bus: "🚌", car: "🚗", trailer: "🚚" };

const INIT_TRUCK = {
  id: "", name: "", plate: "", model: "",
  year: String(new Date().getFullYear()), route: "", status: "idle",
  vehicle_type: "truck" as string,
};

const INIT_DRIVER = {
  name: "", phone: "", license_no: "", assigned_truck_id: "",
};

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] placeholder-[#94A3B8] outline-none focus:border-orange-400 focus:bg-[var(--surface)] transition-colors"
      />
    </div>
  );
}

function SectionLabel({ color = "orange", children }: { color?: "orange" | "blue"; children: React.ReactNode }) {
  return (
    <p className={`text-xs font-mono tracking-widest uppercase font-semibold ${color === "blue" ? "text-blue-500" : "text-orange-500"}`}>
      {children}
    </p>
  );
}

const selectCls = "w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-orange-400 focus:bg-[var(--surface)] transition-colors";

export function Setup() {
  const [trucks,     setTrucks]     = useState<Truck[]>([]);
  const [drivers,    setDrivers]    = useState<Driver[]>([]);
  const [truckForm,  setTruckForm]  = useState(INIT_TRUCK);
  const [driverForm, setDriverForm] = useState(INIT_DRIVER);
  const [saving,     setSaving]     = useState(false);
  const [message,    setMessage]    = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok = true) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const [tRes, dRes] = await Promise.all([fetch("/api/trucks"), fetch("/api/drivers")]);
      const [t, d] = await Promise.all([tRes.json(), dRes.json()]);
      if (t.data) setTrucks(t.data);
      if (d.data) setDrivers(d.data);
    } catch {
      setMessage({ text: "Could not load fleet data. Please refresh the page.", ok: false });
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const assignedIds = useMemo(
    () => new Set(drivers.map((d) => d.assigned_truck_id).filter(Boolean)),
    [drivers]
  );

  const tChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setTruckForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const dChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDriverForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const today      = new Date().toISOString().split("T")[0];
  const sixMonths  = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const submitTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!truckForm.id || !truckForm.name || !truckForm.plate) {
      flash("Truck ID, Vehicle Name, and Plate are required.", false);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/trucks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...truckForm,
        year:        Number(truckForm.year) || new Date().getFullYear(),
        driver:      "",
        fuel:        100,
        speed:       0,
        odometer:    0,
        lat:         6.465,
        lng:         3.406,
        lastService:  today,
        nextService:  sixMonths,
        vehicle_type: truckForm.vehicle_type,
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { flash(json.message ?? "Failed to register vehicle.", false); return; }
    setTrucks((p) => [json.data, ...p]);
    setTruckForm(INIT_TRUCK);
    flash("Vehicle added to fleet.");
  };

  const submitDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.name || !driverForm.phone || !driverForm.assigned_truck_id) {
      flash("Driver Name, Phone, and Assigned Vehicle are required.", false);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(driverForm),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { flash(json.error ?? "Failed to assign driver.", false); return; }
    setDrivers((p) => [json.data, ...p]);
    setDriverForm(INIT_DRIVER);
    flash("Driver assigned successfully.");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Fleet Setup</h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          Quickly add vehicles and assign drivers. Use <span className="text-orange-500 font-medium">Register</span> in the sidebar for the full onboarding wizard.
        </p>
      </div>

      {message && (
        <Alert className={message.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-600"
        }>
          <AlertDescription>{message.ok ? "✓" : "⚠"} {message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Vehicle quick-add form */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-[var(--border-sub)]">
            <SectionLabel color="orange">Quick Add Vehicle</SectionLabel>
          </div>
          <div className="px-5 pb-5 pt-4">
            <form onSubmit={submitTruck} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Vehicle ID"   name="id"    value={truckForm.id}    onChange={tChange} placeholder="TRK-007"       />
                <Field label="Vehicle Name" name="name"  value={truckForm.name}  onChange={tChange} placeholder="Eastern Runner" />
                <Field label="Plate"        name="plate" value={truckForm.plate} onChange={tChange} placeholder="LND-123-ABC"    />
                <Field label="Model"        name="model" value={truckForm.model} onChange={tChange} placeholder="Mercedes Actros"/>
                <Field label="Year"         name="year"  value={truckForm.year}  onChange={tChange} placeholder="2024"           />
                <Field label="Route"        name="route" value={truckForm.route} onChange={tChange} placeholder="Apapa → Ibadan" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Type</label>
                  <select name="vehicle_type" value={truckForm.vehicle_type} onChange={tChange} className={selectCls}>
                    {VEHICLE_TYPES.map((t) => (
                      <option key={t} value={t}>{VEHICLE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Status</label>
                  <select name="status" value={truckForm.status} onChange={tChange} className={selectCls}>
                    <option value="idle">Idle</option>
                    <option value="moving">Moving</option>
                    <option value="alert">Alert</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={saving}
                className="bg-orange-500 hover:bg-orange-400 text-white font-bold w-full">
                {saving ? "Saving…" : "Add to Fleet"}
              </Button>
            </form>
          </div>
        </div>

        {/* Driver assignment form */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-[var(--border-sub)]">
            <SectionLabel color="blue">Driver Assignment</SectionLabel>
          </div>
          <div className="px-5 pb-5 pt-4">
            <form onSubmit={submitDriver} className="space-y-3">
              <Field label="Driver Name"    name="name"       value={driverForm.name}       onChange={dChange} placeholder="Adeyemi Tunde"  />
              <Field label="Phone Number"   name="phone"      value={driverForm.phone}      onChange={dChange} placeholder="+2348012345678" />
              <Field label="License Number" name="license_no" value={driverForm.license_no} onChange={dChange} placeholder="DRV-45883-LG"  />
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Assign to Vehicle</label>
                <select name="assigned_truck_id" value={driverForm.assigned_truck_id} onChange={dChange}
                  className={selectCls}>
                  <option value="">Select vehicle…</option>
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id} disabled={assignedIds.has(t.id)}>
                      {VEHICLE_ICONS[t.vehicle_type] ?? "🚘"} {t.id} — {t.name}{assignedIds.has(t.id) ? " (assigned)" : ""}
                    </option>
                  ))}
                </select>
                {trucks.length === 0 && (
                  <p className="text-[11px] text-[var(--subtle)] mt-1">Add a vehicle first.</p>
                )}
              </div>
              <Button type="submit" disabled={saving}
                className="bg-blue-500 hover:bg-blue-400 text-white font-bold w-full">
                {saving ? "Saving…" : "Assign Driver"}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Records */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Fleet log */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-[var(--border-sub)] flex items-center justify-between">
            <SectionLabel color="orange">Registered Fleet</SectionLabel>
            <span className="text-xs text-[var(--subtle)] font-mono">{trucks.length} vehicles</span>
          </div>
          <div className="px-5 py-4 space-y-2 max-h-80 overflow-y-auto">
            {trucks.length === 0 ? (
              <p className="text-sm text-[var(--subtle)]">No vehicles in fleet yet.</p>
            ) : (
              trucks.map((t) => (
                <div key={t.id} className="rounded-lg border border-[var(--border-sub)] bg-[var(--surface-2)] px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span>{VEHICLE_ICONS[t.vehicle_type] ?? "🚘"}</span>
                      <p className="text-sm font-semibold text-[var(--text)]">{t.name}</p>
                    </div>
                    <span className="text-[10px] font-mono text-orange-500 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">{t.id}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {t.plate}{t.model ? ` · ${t.model}` : ""}{t.year ? ` ${t.year}` : ""}{t.route ? ` · ${t.route}` : ""}
                  </p>
                  {t.driver && (
                    <p className="text-[11px] text-[var(--subtle)] mt-0.5">👤 {t.driver}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Driver log */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-[var(--border-sub)] flex items-center justify-between">
            <SectionLabel color="blue">Driver Assignments</SectionLabel>
            <span className="text-xs text-[var(--subtle)] font-mono">{drivers.length} assigned</span>
          </div>
          <div className="px-5 py-4 space-y-2 max-h-80 overflow-y-auto">
            {drivers.length === 0 ? (
              <p className="text-sm text-[var(--subtle)]">No drivers assigned yet.</p>
            ) : (
              drivers.map((d) => {
                const truck = trucks.find((t) => t.id === d.assigned_truck_id);
                return (
                  <div key={d.id} className="rounded-lg border border-[var(--border-sub)] bg-[var(--surface-2)] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--text)]">{d.name}</p>
                      <span className="text-[10px] font-mono text-blue-500 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
                        {d.assigned_truck_id ?? "Unassigned"}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {d.phone}{d.license_no ? ` · ${d.license_no}` : ""}{truck ? ` · ${truck.name}` : ""}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
