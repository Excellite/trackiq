"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addVehicleSchema, type AddVehicleFormData, FUEL_TYPES, VEHICLE_TYPES } from "@/lib/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Car, Users, ShieldCheck, CheckCircle2, ChevronRight, ChevronLeft,
  Loader2, AlertCircle, Fuel,
} from "lucide-react";
import type { DriverWithStats } from "@/lib/store";

const VEHICLE_ICONS: Record<string, string> = { truck: "🚛", bus: "🚌", car: "🚗", trailer: "🚚" };
const FUEL_LABELS: Record<string, string> = {
  petrol: "Petrol", diesel: "Diesel", electric: "Electric (EV)",
  hybrid: "Hybrid", lpg: "LPG", cng: "CNG",
};
const TYPE_PREFIX: Record<string, string> = { truck: "TRK", bus: "BUS", car: "CAR", trailer: "TRL" };

const STEPS = [
  { id: 1, label: "Vehicle Info",     description: "Type, name, plate & specs",        icon: Car         },
  { id: 2, label: "Assign Driver",    description: "Link a driver — or skip for now",   icon: Users       },
  { id: 3, label: "Documents",        description: "Insurance & compliance — optional", icon: ShieldCheck },
] as const;

type DriverMode = "none" | "existing" | "new";
interface NewDriverForm { name: string; phone: string; license_no: string }
type DocEntry  = { doc_number: string; expiry_date: string };
type DocState  = Record<string, DocEntry>;

const DOC_TYPES = [
  { key: "insurance",       label: "Insurance",                  required: true  },
  { key: "vehicle_license", label: "Vehicle Licence",            required: true  },
  { key: "roadworthiness",  label: "Roadworthiness Certificate", required: false },
  { key: "hackney_permit",  label: "Hackney Permit",             required: false },
];

const INIT_DOCS: DocState = {
  insurance:       { doc_number: "", expiry_date: "" },
  vehicle_license: { doc_number: "", expiry_date: "" },
  roadworthiness:  { doc_number: "", expiry_date: "" },
  hackney_permit:  { doc_number: "", expiry_date: "" },
};

// ── Step bar ──────────────────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      {STEPS.map((step, i) => {
        const done   = current > step.id;
        const active = current === step.id;
        const Icon   = step.icon;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all
                ${done   ? "bg-orange-500 border-orange-500 text-white"
                : active ? "bg-[var(--surface)] border-orange-500 text-orange-500 ring-4 ring-orange-500/15"
                : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--subtle)]"}`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <p className={`text-[10px] font-semibold mt-1.5 hidden sm:block text-center
                ${active ? "text-orange-500" : done ? "text-orange-400" : "text-[var(--subtle)]"}`}>
                {step.label}
              </p>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 mx-3 mb-4 transition-all ${done ? "bg-orange-500" : "bg-[var(--border)]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────────
function SuccessView({
  fleetId, vehicleName, plate, vehicleType, driverName, docsCount, onReset, onGoToFleet,
}: {
  fleetId: string; vehicleName: string; plate: string; vehicleType: string;
  driverName?: string; docsCount: number; onReset: () => void; onGoToFleet: () => void;
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-[var(--text)] mb-1">Vehicle Added to Fleet</h2>
      <p className="text-sm text-[var(--muted)] mb-6">
        {VEHICLE_ICONS[vehicleType] ?? "🚘"} {vehicleName} is now live in your fleet.
      </p>

      <div className="bg-[var(--surface-2)] rounded-xl border border-[var(--border-sub)] p-4 text-left mb-6 space-y-2 max-w-sm mx-auto">
        {[
          ["Fleet ID", fleetId],
          ["Plate",    plate],
          ["Driver",   driverName ?? "Not assigned — assign from Drivers page"],
          ["Documents", docsCount > 0 ? `${docsCount} saved` : "None — add from Compliance page"],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-sm py-1 border-b border-[var(--border-sub)] last:border-0">
            <span className="text-[var(--subtle)]">{label}</span>
            <span className={`font-mono text-xs text-right ${label === "Fleet ID" ? "text-orange-500 font-bold" : "text-[var(--text)]"}`}>{value}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 max-w-sm mx-auto">
        <Button variant="outline" onClick={onReset}
          className="flex-1 border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]">
          Add Another
        </Button>
        <Button onClick={onGoToFleet}
          className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-bold">
          Go to Fleet →
        </Button>
      </div>
    </div>
  );
}

// ── Main wizard ────────────────────────────────────────────────────────────────
export function VehicleRegistration({ onNav }: { onNav?: (id: string) => void }) {
  const [step,       setStep]       = useState(1);
  const [saving,     setSaving]     = useState(false);
  const [serverErr,  setServerErr]  = useState<string | null>(null);
  const [saved,      setSaved]      = useState<{ fleetId: string; vehicleName: string; plate: string; vehicleType: string; driverName?: string; docsCount: number } | null>(null);

  // Driver step state
  const [driverMode,    setDriverMode]    = useState<DriverMode>("none");
  const [existDriverId, setExistDriverId] = useState("");
  const [newDriver,     setNewDriver]     = useState<NewDriverForm>({ name: "", phone: "", license_no: "" });
  const [unassigned,    setUnassigned]    = useState<DriverWithStats[]>([]);

  // Documents step state
  const [docs, setDocs] = useState<DocState>(INIT_DOCS);

  const form = useForm<AddVehicleFormData>({
    resolver: zodResolver(addVehicleSchema),
    defaultValues: {
      vehicleType: undefined, vehicleName: "", fleetId: "", plate: "",
      make: "", model: "", year: new Date().getFullYear(),
      fuelType: undefined, route: "", vin: "", locationLat: "", locationLng: "",
    },
    mode: "onChange",
  });

  // Auto-generate fleet ID when type or plate changes
  const watchType  = form.watch("vehicleType");
  const watchPlate = form.watch("plate");
  useEffect(() => {
    if (watchType && watchPlate) {
      const prefix    = TYPE_PREFIX[watchType] ?? "VEH";
      const suggested = `${prefix}-${watchPlate.replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase()}`;
      form.setValue("fleetId", suggested, { shouldValidate: false });
    }
  }, [watchType, watchPlate, form]);

  // Fetch unassigned drivers when entering step 2
  const loadUnassigned = useCallback(async () => {
    try {
      const res  = await fetch("/api/drivers");
      const json = await res.json();
      const all  = (json.data ?? []) as DriverWithStats[];
      setUnassigned(all.filter((d) => !d.assigned_truck_id));
    } catch { /* leave unassigned empty */ }
  }, []);

  useEffect(() => {
    if (step === 2) loadUnassigned();
  }, [step, loadUnassigned]);

  const STEP1_FIELDS = ["vehicleType", "vehicleName", "fleetId", "plate", "make", "model", "year", "fuelType"] as const;

  const handleNext = async () => {
    if (step === 1) {
      const ok = await form.trigger(STEP1_FIELDS as Parameters<typeof form.trigger>[0]);
      if (!ok) return;
    }
    setStep((s) => s + 1);
  };

  const onSubmit = async (data: AddVehicleFormData) => {
    setSaving(true);
    setServerErr(null);

    // Validate driver "new" mode has at least a name
    if (driverMode === "new" && !newDriver.name.trim()) {
      setServerErr("Enter the driver's name or choose 'Skip for now'.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicle: data,
        driver: {
          mode:       driverMode,
          existingId: driverMode === "existing" ? existDriverId : undefined,
          name:       driverMode === "new" ? newDriver.name : undefined,
          phone:      driverMode === "new" ? newDriver.phone : undefined,
          license_no: driverMode === "new" ? newDriver.license_no : undefined,
        },
        docs,
      }),
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setServerErr(json.error ?? "Registration failed.");
      return;
    }

    const v = json.vehicle;
    setSaved({ fleetId: v.fleetId, vehicleName: v.vehicleName, plate: v.plate, vehicleType: v.vehicleType, driverName: v.driverName, docsCount: v.docsCount });
  };

  const handleReset = () => {
    form.reset();
    setStep(1);
    setSaved(null);
    setServerErr(null);
    setDriverMode("none");
    setExistDriverId("");
    setNewDriver({ name: "", phone: "", license_no: "" });
    setDocs(INIT_DOCS);
  };

  if (saved) return (
    <SuccessView
      {...saved}
      onReset={handleReset}
      onGoToFleet={() => onNav?.("trucks")}
    />
  );

  const inputCls = "w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] outline-none focus:border-orange-400 focus:bg-[var(--surface)] transition-colors";

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Add Vehicle to Fleet</h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">3 steps — vehicle info, assign a driver, then attach documents.</p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm p-6">
        <StepBar current={step} total={STEPS.length} />

        {/* Step header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--border-sub)]">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            {(() => { const Icon = STEPS[step - 1].icon; return <Icon className="w-4 h-4 text-orange-500" />; })()}
          </div>
          <div>
            <h2 className="font-semibold text-sm text-[var(--text)]">Step {step} — {STEPS[step - 1].label}</h2>
            <p className="text-xs text-[var(--muted)]">{STEPS[step - 1].description}</p>
          </div>
          <span className="ml-auto text-xs font-mono text-[var(--subtle)] bg-[var(--surface-2)] px-2 py-1 rounded-lg border border-[var(--border-sub)]">{step} / {STEPS.length}</span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* ── Step 1: Vehicle Info ── */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Type selector */}
                <FormField control={form.control} name="vehicleType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Type</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {VEHICLE_TYPES.map((type) => (
                          <button key={type} type="button" onClick={() => field.onChange(type)}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all
                              ${field.value === type
                                ? "bg-orange-50 border-orange-400 text-orange-600"
                                : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:border-orange-300"}`}>
                            <span className="text-xl">{VEHICLE_ICONS[type]}</span>
                            <span className="capitalize">{type}</span>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <FormField control={form.control} name="vehicleName" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Vehicle Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Lagos Hauler 3" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="plate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plate Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. LND-423-XY" className="font-mono tracking-widest uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fleetId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fleet ID <span className="text-[var(--subtle)] font-normal">(auto-generated)</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="TRK-001" className="font-mono tracking-widest uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="make" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Mercedes-Benz" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="model" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Actros 2645" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="year" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" placeholder={String(new Date().getFullYear())}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || "")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fuelType" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Fuel className="w-3 h-3" /> Fuel Type</FormLabel>
                      <FormControl>
                        <select value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value)}
                          className={inputCls}>
                          <option value="">Select…</option>
                          {FUEL_TYPES.map((f) => <option key={f} value={f}>{FUEL_LABELS[f]}</option>)}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="route" render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Route <span className="text-[var(--subtle)] font-normal">(optional)</span></FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Lagos → Abuja" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            {/* ── Step 2: Assign Driver ── */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    ["none",     "Skip for now",     "Assign later from Drivers page"],
                    ["existing", "Pick a driver",    "Choose from your driver list"],
                    ["new",      "Add new driver",   "Register and assign at once"],
                  ] as [DriverMode, string, string][]).map(([mode, label, sub]) => (
                    <button key={mode} type="button" onClick={() => setDriverMode(mode)}
                      className={`text-left p-3.5 rounded-xl border transition-all
                        ${driverMode === mode
                          ? "bg-orange-50 border-orange-400"
                          : "bg-[var(--surface-2)] border-[var(--border)] hover:border-orange-300"}`}>
                      <p className={`text-xs font-semibold ${driverMode === mode ? "text-orange-600" : "text-[var(--text)]"}`}>{label}</p>
                      <p className="text-[10px] text-[var(--subtle)] mt-0.5">{sub}</p>
                    </button>
                  ))}
                </div>

                {/* Existing driver dropdown */}
                {driverMode === "existing" && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">Select Driver</label>
                    <select value={existDriverId} onChange={(e) => setExistDriverId(e.target.value)} className={inputCls}>
                      <option value="">Choose a driver…</option>
                      {unassigned.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} · {d.license_no || "no licence"} · {d.trip_count} trips
                        </option>
                      ))}
                    </select>
                    {unassigned.length === 0 && (
                      <p className="text-xs text-[var(--subtle)] mt-1.5">No unassigned drivers — add a new one instead.</p>
                    )}
                  </div>
                )}

                {/* New driver fields */}
                {driverMode === "new" && (
                  <div className="space-y-3 p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border-sub)]">
                    {[
                      { key: "name",       label: "Full Name*",      ph: "e.g. Adeyemi Tunde"   },
                      { key: "phone",      label: "Phone Number*",   ph: "+234 801 234 5678"     },
                      { key: "license_no", label: "Licence Number",  ph: "e.g. DRV-45883-LG"    },
                    ].map(({ key, label, ph }) => (
                      <div key={key}>
                        <label className="block text-[11px] text-[var(--subtle)] mb-1">{label}</label>
                        <input
                          value={newDriver[key as keyof NewDriverForm]}
                          onChange={(e) => setNewDriver((p) => ({ ...p, [key]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                          placeholder={ph}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {driverMode === "none" && (
                  <p className="text-xs text-[var(--subtle)] bg-[var(--surface-2)] border border-[var(--border-sub)] rounded-xl px-4 py-3">
                    You can assign a driver at any time from the <span className="text-orange-500 font-medium">Drivers</span> page.
                  </p>
                )}
              </div>
            )}

            {/* ── Step 3: Documents ── */}
            {step === 3 && (
              <div className="space-y-3">
                <p className="text-xs text-[var(--muted)]">
                  All fields are optional. Anything left blank can be added later in the <span className="text-orange-500 font-medium">Compliance</span> section.
                </p>
                {DOC_TYPES.map((f) => (
                  <div key={f.key} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                      <span className="text-sm font-semibold text-[var(--text)]">{f.label}</span>
                      {f.required && <span className="text-[10px] text-orange-400 font-mono">(recommended)</span>}
                      {docs[f.key].expiry_date && (
                        <span className="ml-auto text-[10px] text-emerald-600">✓ filled</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-[var(--subtle)] mb-1">Document Number</label>
                        <input
                          value={docs[f.key].doc_number}
                          onChange={(e) => setDocs((p) => ({ ...p, [f.key]: { ...p[f.key], doc_number: e.target.value } }))}
                          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                          placeholder="e.g. INS-2025-001"
                          className={inputCls + " font-mono"}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[var(--subtle)] mb-1">Expiry Date</label>
                        <input
                          type="date"
                          value={docs[f.key].expiry_date}
                          onChange={(e) => setDocs((p) => ({ ...p, [f.key]: { ...p[f.key], expiry_date: e.target.value } }))}
                          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-4 border-t border-[var(--border-sub)]">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={saving}
                  className="flex-1 border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              {step < STEPS.length ? (
                <Button type="button" onClick={handleNext}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-bold">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  {saving
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                    : <><CheckCircle2 className="w-4 h-4 mr-2" />Add to Fleet</>}
                </Button>
              )}
            </div>

            {serverErr && (
              <Alert className="border-red-200 bg-red-50 text-red-600">
                <AlertDescription className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {serverErr}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
