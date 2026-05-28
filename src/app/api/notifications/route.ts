import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export interface Alert {
  id: string;
  type: "low_fuel" | "maintenance_overdue" | "offline" | "doc_expiry" | "speeding";
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  truck_id: string;
  created_at: string;
}

export async function GET() {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [{ data: trucks }, { data: docs }] = await Promise.all([
      supabase.from("trucks").select("id, name, fuel, status, nextService, vehicle_type"),
      supabase.from("vehicle_documents").select("truck_id, doc_type, doc_number, expiry_date"),
    ]);

    const alerts: Alert[] = [];

    for (const t of trucks ?? []) {
      const fuel = Number(t.fuel);
      if (fuel < 20) {
        alerts.push({
          id: `low_fuel_${t.id}`,
          type: "low_fuel",
          severity: fuel < 10 ? "critical" : "warning",
          title: "Low Fuel",
          message: `${t.name} is at ${fuel}% — immediate refuel required.`,
          truck_id: t.id,
          created_at: now.toISOString(),
        });
      }

      if (t.status === "offline") {
        alerts.push({
          id: `offline_${t.id}`,
          type: "offline",
          severity: "warning",
          title: "Vehicle Offline",
          message: `${t.name} is offline — no GPS signal received.`,
          truck_id: t.id,
          created_at: now.toISOString(),
        });
      }

      if (t.nextService && t.nextService < today) {
        alerts.push({
          id: `maint_${t.id}`,
          type: "maintenance_overdue",
          severity: "critical",
          title: "Maintenance Overdue",
          message: `${t.name} service was due ${t.nextService}. Schedule immediately.`,
          truck_id: t.id,
          created_at: now.toISOString(),
        });
      } else if (t.nextService && t.nextService <= in30) {
        alerts.push({
          id: `maint_soon_${t.id}`,
          type: "maintenance_overdue",
          severity: "info",
          title: "Maintenance Due Soon",
          message: `${t.name} service due ${t.nextService}.`,
          truck_id: t.id,
          created_at: now.toISOString(),
        });
      }
    }

    const DOC_LABELS: Record<string, string> = {
      insurance: "Insurance", roadworthiness: "Roadworthiness Certificate",
      vehicle_license: "Vehicle Licence", hackney_permit: "Hackney Permit",
    };

    for (const d of docs ?? []) {
      if (d.expiry_date < today) {
        alerts.push({
          id: `doc_expired_${d.truck_id}_${d.doc_type}`,
          type: "doc_expiry",
          severity: "critical",
          title: "Document Expired",
          message: `${DOC_LABELS[d.doc_type] ?? d.doc_type} for ${d.truck_id} expired on ${d.expiry_date}.`,
          truck_id: d.truck_id,
          created_at: now.toISOString(),
        });
      } else if (d.expiry_date <= in30) {
        alerts.push({
          id: `doc_soon_${d.truck_id}_${d.doc_type}`,
          type: "doc_expiry",
          severity: "warning",
          title: "Document Expiring Soon",
          message: `${DOC_LABELS[d.doc_type] ?? d.doc_type} for ${d.truck_id} expires ${d.expiry_date}.`,
          truck_id: d.truck_id,
          created_at: now.toISOString(),
        });
      }
    }

    // Sort: critical first, then warning, then info
    const order = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity]);

    return NextResponse.json({ data: alerts, count: alerts.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
