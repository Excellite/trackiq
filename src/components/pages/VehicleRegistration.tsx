"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  vehicleRegistrationSchema,
  type VehicleRegistrationFormData,
  type Vehicle,
  FUEL_TYPES,
} from "@/lib/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Car, FileText, MapPin, CheckCircle2, ChevronRight, ChevronLeft,
  Loader2, AlertCircle, Zap, Fuel, User, Phone, Mail, Hash, Calendar,
} from "lucide-react";

const STEPS = [
  { id: 1, label: "Vehicle Identity",  description: "Make, model, year & VIN",          icon: Car,      fields: ["make","model","year","vin"] as const },
  { id: 2, label: "Registration",      description: "Plate number & fuel type",          icon: FileText, fields: ["licensePlate","fuelType"] as const },
  { id: 3, label: "Location & Owner",  description: "Current location & contact info",   icon: MapPin,   fields: ["locationAddress","locationLat","locationLng","ownerName","ownerEmail","ownerPhone"] as const },
];

const FUEL_LABELS: Record<string, string> = {
  petrol: "Petrol / Gasoline", diesel: "Diesel", electric: "Electric (EV)",
  hybrid: "Hybrid", lpg: "LPG", cng: "CNG",
};

const FUEL_ICONS: Record<string, string> = {
  petrol: "⛽", diesel: "🛢️", electric: "⚡", hybrid: "🔋", lpg: "🔵", cng: "💨",
};

// ── Step progress bar ──────────────────────────────────────────────────────────
function StepBar({ current, completed }: { current: number; completed: Set<number> }) {
  return (
    <div className="flex items-center justify-between mb-7">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done   = completed.has(step.id);
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300
                ${done   ? "bg-amber-500 border-amber-500 text-black" : ""}
                ${active ? "bg-slate-800 border-amber-500 text-amber-400 ring-4 ring-amber-500/20" : ""}
                ${!done && !active ? "bg-slate-800 border-slate-600 text-slate-500" : ""}
              `}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="mt-2 text-center hidden sm:block">
                <p className={`text-xs font-semibold ${active ? "text-amber-400" : done ? "text-amber-400/60" : "text-slate-500"}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">{step.description}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 transition-all duration-500 ${completed.has(step.id) ? "bg-amber-500" : "bg-slate-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── VIN progress dots ──────────────────────────────────────────────────────────
function VinHelper({ value }: { value: string }) {
  const count   = value?.length ?? 0;
  const isValid = count === 17;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 17 }).map((_, i) => (
          <div key={i} className={`w-3 h-1 rounded-full transition-all duration-150 ${
            i < count ? isValid ? "bg-emerald-500" : "bg-amber-500" : "bg-slate-700"
          }`} />
        ))}
      </div>
      <span className={`text-xs font-mono ${isValid ? "text-emerald-400" : "text-slate-500"}`}>{count}/17</span>
    </div>
  );
}

// ── Success screen ─────────────────────────────────────────────────────────────
function SuccessView({ vehicle, onReset }: { vehicle: Vehicle; onReset: () => void }) {
  return (
    <div className="text-center py-8 px-4">
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Vehicle Registered Successfully</h2>
      <p className="text-slate-400 mb-6 text-sm">
        Registration ID <span className="font-mono font-semibold text-amber-400">#{vehicle.id}</span> has been created.
      </p>

      <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-4 text-left mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sm text-white">{vehicle.year} {vehicle.make} {vehicle.model}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><p className="text-slate-500 text-xs">VIN</p><p className="font-mono font-medium text-xs text-white">{vehicle.vin}</p></div>
          <div><p className="text-slate-500 text-xs">Plate</p><p className="font-mono font-medium text-xs text-white">{vehicle.licensePlate}</p></div>
          <div><p className="text-slate-500 text-xs">Fuel Type</p><p className="text-xs text-white capitalize">{FUEL_LABELS[vehicle.fuelType] ?? vehicle.fuelType}</p></div>
          <div><p className="text-slate-500 text-xs">Status</p>
            <Badge variant="outline" className="text-xs capitalize text-amber-400 border-amber-500/30">{vehicle.status}</Badge>
          </div>
        </div>
        <div><p className="text-slate-500 text-xs">Location</p><p className="text-xs text-white">{vehicle.locationAddress}</p></div>
        <div>
          <p className="text-slate-500 text-xs">Owner</p>
          <p className="text-xs font-medium text-white">{vehicle.ownerName}</p>
          <p className="text-xs text-slate-400">{vehicle.ownerEmail} · {vehicle.ownerPhone}</p>
        </div>
      </div>

      <div className="bg-slate-950 rounded-lg border border-slate-700/50 p-4 text-left mb-6 overflow-auto max-h-48">
        <p className="text-xs text-slate-500 mb-2 font-mono">// JSON — ready for DB integration</p>
        <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap break-all">
          {JSON.stringify(vehicle, null, 2)}
        </pre>
      </div>

      <Button onClick={onReset} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold">
        Register Another Vehicle
      </Button>
    </div>
  );
}

// ── Fuel select ────────────────────────────────────────────────────────────────
function FuelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500/60 transition-colors"
    >
      <option value="">Select fuel type…</option>
      {FUEL_TYPES.map((f) => (
        <option key={f} value={f}>{FUEL_ICONS[f]} {FUEL_LABELS[f]}</option>
      ))}
    </select>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function VehicleRegistration() {
  const [step,      setStep]      = useState(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [saved,     setSaved]     = useState<Vehicle | null>(null);
  const [saving,    setSaving]    = useState(false);
  const [serverErr, setServerErr] = useState<string | null>(null);

  const form = useForm<VehicleRegistrationFormData>({
    resolver: zodResolver(vehicleRegistrationSchema),
    defaultValues: {
      make: "", model: "", year: new Date().getFullYear(), vin: "",
      licensePlate: "", fuelType: undefined,
      locationAddress: "", locationLat: "", locationLng: "",
      ownerName: "", ownerEmail: "", ownerPhone: "",
    },
    mode: "onChange",
  });

  const handleNext = async () => {
    const fields = STEPS[step - 1].fields;
    const ok = await form.trigger(fields as Parameters<typeof form.trigger>[0]);
    if (ok) {
      setCompleted((p) => new Set([...p, step]));
      setStep((s) => Math.min(s + 1, STEPS.length));
    }
  };

  const onSubmit = async (data: VehicleRegistrationFormData) => {
    setSaving(true);
    setServerErr(null);
    const res = await fetch("/api/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setServerErr(json.error ?? "Submission failed."); return; }
    setSaved(json.vehicle);
  };

  const handleReset = () => {
    form.reset();
    setStep(1);
    setCompleted(new Set());
    setSaved(null);
    setServerErr(null);
  };

  if (saved) return <SuccessView vehicle={saved} onReset={handleReset} />;

  const cfg        = STEPS[step - 1];
  const isLastStep = step === STEPS.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Vehicle Registration</h1>
        <p className="text-xs text-slate-400 mt-0.5">Complete all steps to register a new vehicle.</p>
      </div>

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <StepBar current={step} completed={completed} />

        {/* Step header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700/30">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <cfg.icon className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-white">Step {step} — {cfg.label}</h2>
            <p className="text-xs text-slate-500">{cfg.description}</p>
          </div>
          <Badge variant="outline" className="ml-auto text-xs">{step} / {STEPS.length}</Badge>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Step 1 — Vehicle Identity */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="make" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Car className="w-3 h-3" /> Make</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Toyota" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="model" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5"><Car className="w-3 h-3" /> Model</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Camry" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="year" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Year of Manufacture</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder={String(new Date().getFullYear())}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || "")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="vin" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Hash className="w-3 h-3" /> Vehicle Identification Number (VIN)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="17-character VIN (e.g. 1HGBH41JXMN109186)"
                        className="font-mono tracking-wider uppercase" maxLength={17}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <VinHelper value={field.value} />
                    <FormMessage />
                    <p className="text-[10px] text-slate-600 mt-1">Characters I, O, and Q are not valid in a VIN</p>
                  </FormItem>
                )} />
              </div>
            )}

            {/* Step 2 — Registration & Fuel */}
            {step === 2 && (
              <div className="space-y-4">
                <FormField control={form.control} name="licensePlate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> License Plate Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. LAG-1234XY" className="font-mono tracking-widest uppercase"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fuelType" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5"><Fuel className="w-3 h-3" /> Fuel Type</FormLabel>
                    <FormControl>
                      <FuelSelect value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {form.watch("fuelType") === "electric" && (
                  <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                    <Zap className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-300">Electric Vehicle (EV)</p>
                      <p className="text-xs text-blue-400/70 mt-0.5">EVs may qualify for special registration rates and incentives.</p>
                    </div>
                  </div>
                )}
                {form.watch("fuelType") === "hybrid" && (
                  <div className="flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                    <Zap className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-emerald-300">Hybrid Vehicle</p>
                      <p className="text-xs text-emerald-400/70 mt-0.5">Combines petrol and electric power for improved efficiency.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 — Location & Owner */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-amber-400" /> Current Vehicle Location
                  </p>
                  <div className="space-y-3">
                    <FormField control={form.control} name="locationAddress" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. 15 Adeola Odeku Street, Victoria Island, Lagos" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="locationLat" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude (optional)</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. 6.4281" className="font-mono" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="locationLng" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude (optional)</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. 3.4219" className="font-mono" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-700/30 pt-5">
                  <p className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-amber-400" /> Owner Information
                  </p>
                  <div className="space-y-3">
                    <FormField control={form.control} name="ownerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5"><User className="w-3 h-3" /> Full Name</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Emmanuel Okpanachi" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="ownerEmail" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</FormLabel>
                          <FormControl><Input {...field} type="email" placeholder="owner@example.com" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="ownerPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone</FormLabel>
                          <FormControl><Input {...field} type="tel" placeholder="+234 801 234 5678" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {/* Summary preview */}
                <div className="border-t border-slate-700/30 pt-5">
                  <p className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-amber-400" /> Summary Preview
                  </p>
                  <div className="bg-slate-900/60 rounded-lg border border-slate-700/40 p-3 space-y-2 text-xs">
                    {[
                      ["Vehicle",  `${form.watch("year")} ${form.watch("make")} ${form.watch("model") || "—"}`],
                      ["VIN",      form.watch("vin")          || "—"],
                      ["Plate",    form.watch("licensePlate") || "—"],
                      ["Fuel",     FUEL_LABELS[form.watch("fuelType")] ?? "—"],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-mono text-white">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 pt-4 border-t border-slate-700/30">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}
                  disabled={saving} className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-700">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              {!isLastStep ? (
                <Button type="button" onClick={handleNext} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button type="submit" disabled={saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registering…</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Submit Registration</>}
                </Button>
              )}
            </div>

            {serverErr && (
              <Alert className="border-red-500/40 bg-red-500/10 text-red-400">
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
