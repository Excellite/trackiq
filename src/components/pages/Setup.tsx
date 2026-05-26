"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Vehicle, Driver } from "@/lib/store";

const INIT_VEHICLE = {
  id: "", name: "", plate: "", model: "",
  year: "", route: "", fuel_capacity: "400", status: "idle",
};

const INIT_DRIVER = {
  name: "", phone: "", license_no: "", assigned_truck_id: "",
};

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/60 transition-colors"
      />
    </div>
  );
}

export function Setup() {
  const [vehicles,    setVehicles]    = useState<Vehicle[]>([]);
  const [drivers,     setDrivers]     = useState<Driver[]>([]);
  const [vehicleForm, setVehicleForm] = useState(INIT_VEHICLE);
  const [driverForm,  setDriverForm]  = useState(INIT_DRIVER);
  const [saving,      setSaving]      = useState(false);
  const [message,     setMessage]     = useState<{ text: string; ok: boolean } | null>(null);

  const flash = (text: string, ok = true) => {
    setMessage({ text, ok });
    setTimeout(() => setMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    const [vRes, dRes] = await Promise.all([
      fetch("/api/vehicles"),
      fetch("/api/drivers"),
    ]);
    const [v, d] = await Promise.all([vRes.json(), dRes.json()]);
    if (v.data) setVehicles(v.data);
    if (d.data) setDrivers(d.data);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const assignedIds = useMemo(
    () => new Set(drivers.map((d) => d.assigned_truck_id).filter(Boolean)),
    [drivers]
  );

  const vChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setVehicleForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const dChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDriverForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submitVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.id || !vehicleForm.name || !vehicleForm.plate) {
      flash("Truck ID, Vehicle Name, and Plate Number are required.", false);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/vehicles", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(vehicleForm),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      flash(json.error ?? "Failed to register vehicle.", false);
      return;
    }
    setVehicles((p) => [json.data, ...p]);
    setVehicleForm(INIT_VEHICLE);
    flash("Vehicle registered successfully.");
  };

  const submitDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverForm.name || !driverForm.phone || !driverForm.assigned_truck_id) {
      flash("Driver Name, Phone, and Assigned Truck are required.", false);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/drivers", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(driverForm),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      flash(json.error ?? "Failed to assign driver.", false);
      return;
    }
    setDrivers((p) => [json.data, ...p]);
    setDriverForm(INIT_DRIVER);
    flash("Driver assigned successfully.");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Fleet Setup</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Register vehicles and assign drivers before live tracking begins.
        </p>
      </div>

      {message && (
        <Alert className={message.ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/40 bg-red-500/10 text-red-400"
        }>
          <AlertDescription>{message.ok ? "✓" : "⚠"} {message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Vehicle Registration */}
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pt-4 pb-2 px-5">
            <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Vehicle Registration</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <form onSubmit={submitVehicle} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Truck ID"          name="id"           value={vehicleForm.id}           onChange={vChange} placeholder="TRK-007"         />
                <Field label="Vehicle Name"      name="name"         value={vehicleForm.name}         onChange={vChange} placeholder="Eastern Runner"   />
                <Field label="Plate Number"      name="plate"        value={vehicleForm.plate}        onChange={vChange} placeholder="LND-123-ABC"      />
                <Field label="Model"             name="model"        value={vehicleForm.model}        onChange={vChange} placeholder="Mercedes Actros"  />
                <Field label="Year"              name="year"         value={vehicleForm.year}         onChange={vChange} placeholder="2024"             />
                <Field label="Fuel Capacity (L)" name="fuel_capacity"value={vehicleForm.fuel_capacity}onChange={vChange} placeholder="400"              />
              </div>
              <Field label="Route" name="route" value={vehicleForm.route} onChange={vChange} placeholder="Apapa → Ibadan" />
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Status</label>
                <select name="status" value={vehicleForm.status} onChange={vChange}
                  className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500/60">
                  <option value="idle">Idle</option>
                  <option value="moving">Moving</option>
                  <option value="alert">Alert</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <Button type="submit" disabled={saving}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold w-full">
                {saving ? "Saving…" : "Register Vehicle"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Driver Assignment */}
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pt-4 pb-2 px-5">
            <p className="text-xs text-blue-400 font-mono tracking-widest uppercase">Driver Assignment</p>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <form onSubmit={submitDriver} className="space-y-3">
              <Field label="Driver Name"    name="name"       value={driverForm.name}       onChange={dChange} placeholder="Adeyemi Tunde"   />
              <Field label="Phone Number"   name="phone"      value={driverForm.phone}      onChange={dChange} placeholder="+2348012345678"  />
              <Field label="License Number" name="license_no" value={driverForm.license_no} onChange={dChange} placeholder="DRV-45883-LG"   />
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Assign to Truck</label>
                <select name="assigned_truck_id" value={driverForm.assigned_truck_id} onChange={dChange}
                  className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500/60">
                  <option value="">Select truck…</option>
                  {vehicles.map((t) => (
                    <option key={t.id} value={t.id} disabled={assignedIds.has(t.id)}>
                      {t.id} — {t.name}{assignedIds.has(t.id) ? " (assigned)" : ""}
                    </option>
                  ))}
                </select>
                {vehicles.length === 0 && (
                  <p className="text-[11px] text-slate-500 mt-1">Register a vehicle first.</p>
                )}
              </div>
              <Button type="submit" disabled={saving}
                className="bg-blue-500 hover:bg-blue-400 text-white font-bold w-full">
                {saving ? "Saving…" : "Assign Driver"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Records */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pt-4 pb-2 px-5 border-b border-slate-700/30">
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-400 font-mono tracking-widest uppercase">Registered Vehicles</p>
              <span className="text-xs text-slate-500 font-mono">{vehicles.length} total</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-4 space-y-2">
            {vehicles.length === 0 ? (
              <p className="text-sm text-slate-500">No vehicles registered yet.</p>
            ) : (
              vehicles.map((v) => (
                <div key={v.id} className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{v.name}</p>
                    <span className="text-[10px] font-mono text-slate-400 border border-slate-700/50 rounded px-1.5 py-0.5">{v.id}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {v.plate}{v.model ? ` · ${v.model}` : ""}{v.year ? ` ${v.year}` : ""}{v.route ? ` · ${v.route}` : ""}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardHeader className="pt-4 pb-2 px-5 border-b border-slate-700/30">
            <div className="flex items-center justify-between">
              <p className="text-xs text-blue-400 font-mono tracking-widest uppercase">Driver Assignments</p>
              <span className="text-xs text-slate-500 font-mono">{drivers.length} assigned</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 py-4 space-y-2">
            {drivers.length === 0 ? (
              <p className="text-sm text-slate-500">No drivers assigned yet.</p>
            ) : (
              drivers.map((d) => {
                const truck = vehicles.find((v) => v.id === d.assigned_truck_id);
                return (
                  <div key={d.id} className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{d.name}</p>
                      <span className="text-[10px] font-mono text-blue-400 border border-blue-500/30 rounded px-1.5 py-0.5">
                        {d.assigned_truck_id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {d.phone}{d.license_no ? ` · ${d.license_no}` : ""}
                      {truck ? ` · ${truck.name}` : ""}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
