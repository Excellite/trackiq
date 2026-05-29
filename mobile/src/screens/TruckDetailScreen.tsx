import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, RefreshControl,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { fetchTruck, fetchTruckTrips, fetchAlerts } from "@/lib/api";
import type { Truck, Trip, Alert } from "@/lib/types";
import type { RootStackParams } from "@/navigation";

// ── Operational constants ────────────────────────────────────────────────────
const DIESEL_NGN = 1_250;
const TANK_L     = 400;
const BASE_L100: Record<string, number> = { truck: 42, trailer: 52, bus: 28, car: 13 };
const rangeKm   = (t: Truck) => Math.round((t.fuel * TANK_L / 100) * 100 / (BASE_L100[t.vehicle_type] ?? 38));
const costPer100 = (t: Truck) => Math.round((BASE_L100[t.vehicle_type] ?? 38) * DIESEL_NGN);
const refuelCost = (t: Truck) => Math.round((1 - t.fuel / 100) * TANK_L * DIESEL_NGN);
const litersNow  = (t: Truck) => Math.round(t.fuel * TANK_L / 100);

function maintLabel(t: Truck): { text: string; color: string } {
  const today = new Date().toISOString().split("T")[0];
  if (!t.nextService) return { text: "Unknown", color: "#6B7280" };
  if (t.nextService < today) return { text: "OVERDUE", color: "#EF4444" };
  const days = Math.round((new Date(t.nextService).getTime() - Date.now()) / 86_400_000);
  if (days <= 14) return { text: `Due in ${days} days`, color: "#F59E0B" };
  return { text: t.nextService, color: "#6B7280" };
}

const STATUS_COLOR: Record<string, string> = {
  moving: "#10B981", idle: "#6B7280", offline: "#EF4444", alert: "#F97316",
};

function Row({ label, value, valueColor, mono }:
  { label: string; value: string; valueColor?: string; mono?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor ? { color: valueColor } : null, mono ? styles.mono : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function TruckDetailScreen() {
  const nav   = useNavigation();
  const route = useRoute<RouteProp<RootStackParams, "TruckDetail">>();
  const { truckId } = route.params;

  const [truck,      setTruck]      = useState<Truck | null>(null);
  const [trips,      setTrips]      = useState<Trip[]>([]);
  const [alerts,     setAlerts]     = useState<Alert[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [t, tr, al] = await Promise.all([
        fetchTruck(truckId),
        fetchTruckTrips(truckId),
        fetchAlerts(),
      ]);
      setTruck(t);
      setTrips(tr.filter((x) => x.status === "completed").slice(0, 15));
      setAlerts(al.filter((a) => a.truck_id === truckId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [truckId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#F97316" /></View>;
  if (error || !truck) {
    return (
      <View style={styles.center}>
        <Text style={styles.errIcon}>⚠</Text>
        <Text style={styles.errTitle}>Could not load vehicle</Text>
        <Text style={styles.errSub}>{error ?? "Not found"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dot          = STATUS_COLOR[truck.status] ?? "#6B7280";
  const maint        = maintLabel(truck);
  const range        = rangeKm(truck);
  const liters       = litersNow(truck);
  const refuel       = refuelCost(truck);
  const c100         = costPer100(truck);
  const speedOver    = truck.speed > 100;
  const totalKm      = trips.reduce((s, t) => s + t.distance_km, 0);
  const totalTrips   = trips.length;
  const fuelEfficiency = BASE_L100[truck.vehicle_type] ?? 38;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#F97316" />}
    >
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={[styles.statusDot, { backgroundColor: dot }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.truckName}>{truck.name}</Text>
            <Text style={styles.truckSub}>{truck.plate} · {truck.model} {truck.year}</Text>
          </View>
          <View style={[styles.statusChip, { borderColor: dot }]}>
            <Text style={[styles.statusText, { color: dot }]}>{truck.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.driverRow}>
          <Text style={styles.driverLabel}>Driver</Text>
          <Text style={styles.driverName}>{truck.driver || "Unassigned"}</Text>
        </View>
        {truck.route ? (
          <View style={styles.routeRow}>
            <Text style={styles.routeLabel}>Route</Text>
            <Text style={styles.routeValue}>{truck.route}</Text>
          </View>
        ) : null}
      </View>

      {/* Live operational KPIs */}
      <Text style={styles.sectionHead}>Live Status</Text>
      <View style={styles.kpiGrid}>
        <View style={[styles.kpi, truck.fuel < 20 && styles.kpiWarn]}>
          <Text style={[styles.kpiVal, truck.fuel < 20 && styles.kpiValWarn]}>{truck.fuel}%</Text>
          <Text style={styles.kpiLabel}>Fuel Level</Text>
          <Text style={styles.kpiSub}>{liters} / {TANK_L} L</Text>
        </View>
        <View style={[styles.kpi, speedOver && styles.kpiWarn]}>
          <Text style={[styles.kpiVal, speedOver && styles.kpiValWarn]}>{truck.speed}</Text>
          <Text style={styles.kpiLabel}>Speed km/h</Text>
          <Text style={[styles.kpiSub, speedOver && { color: "#EF4444" }]}>
            {speedOver ? "⚠ OVER LIMIT" : truck.status}
          </Text>
        </View>
        <View style={[styles.kpi, range < 100 && styles.kpiWarn]}>
          <Text style={[styles.kpiVal, range < 100 && styles.kpiValWarn]}>~{range}</Text>
          <Text style={styles.kpiLabel}>Range km</Text>
          <Text style={styles.kpiSub}>at current fuel</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiVal}>{truck.odometer.toLocaleString()}</Text>
          <Text style={styles.kpiLabel}>Odometer</Text>
          <Text style={styles.kpiSub}>km total</Text>
        </View>
      </View>

      {/* Cost & efficiency */}
      <Text style={styles.sectionHead}>Cost Intelligence</Text>
      <View style={styles.card}>
        <Row label="Fuel efficiency"    value={`${fuelEfficiency} L/100 km (${truck.vehicle_type})`} />
        <View style={styles.divider} />
        <Row label="Operating cost"     value={`₦${c100.toLocaleString()} / 100 km`} valueColor="#F97316" mono />
        <View style={styles.divider} />
        <Row label="Cost per km"        value={`₦${Math.round(c100/100)}/km`} mono />
        <View style={styles.divider} />
        {truck.fuel < 100 && (
          <>
            <Row
              label="Refuel cost (to full)"
              value={`₦${refuel.toLocaleString()} · ${TANK_L - liters} L needed`}
              valueColor={truck.fuel < 20 ? "#EF4444" : "#F59E0B"}
              mono
            />
            <View style={styles.divider} />
          </>
        )}
        <Row label="GPS position"       value={`${truck.lat.toFixed(4)}°N  ${truck.lng.toFixed(4)}°E`} mono />
      </View>

      {/* Maintenance & compliance */}
      <Text style={styles.sectionHead}>Maintenance & Compliance</Text>
      <View style={styles.card}>
        <Row label="Next service due"   value={maint.text}         valueColor={maint.color} />
        <View style={styles.divider} />
        <Row label="Last service"       value={truck.lastService || "—"} />
        <View style={styles.divider} />
        <Row label="Speed compliance"   value={speedOver ? `⚠ ${truck.speed} km/h — exceeds 100 km/h limit` : `✓ ${truck.speed || 0} km/h — within limit`} valueColor={speedOver ? "#EF4444" : "#10B981"} />
      </View>

      {/* Trip performance */}
      <Text style={styles.sectionHead}>Trip Performance</Text>
      <View style={styles.kpiGrid}>
        <View style={styles.kpi}>
          <Text style={styles.kpiVal}>{totalTrips}</Text>
          <Text style={styles.kpiLabel}>Trips logged</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiVal}>{totalKm.toFixed(0)}</Text>
          <Text style={styles.kpiLabel}>Total km</Text>
          <Text style={styles.kpiSub}>trip log</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiVal}>
            {totalTrips > 0 ? (totalKm / totalTrips).toFixed(0) : "—"}
          </Text>
          <Text style={styles.kpiLabel}>Avg trip km</Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiVal}>
            ₦{totalKm > 0 ? Math.round(totalKm * (c100 / 100) / 1000) : 0}k
          </Text>
          <Text style={styles.kpiLabel}>Est. fuel cost</Text>
          <Text style={styles.kpiSub}>total trips</Text>
        </View>
      </View>

      {/* Active alerts */}
      {alerts.length > 0 && (
        <>
          <Text style={styles.sectionHead}>Active Alerts ({alerts.length})</Text>
          <View style={styles.card}>
            {alerts.map((a, i) => (
              <View key={a.id}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.alertRow}>
                  <View style={[styles.alertDot, { backgroundColor: a.severity === "critical" ? "#EF4444" : "#F59E0B" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>{a.title}</Text>
                    <Text style={styles.alertMsg}>{a.message}</Text>
                    <Text style={styles.alertTime}>{new Date(a.created_at).toLocaleString("en-NG")}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Trip log */}
      <Text style={styles.sectionHead}>Recent Trips</Text>
      {trips.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No completed trips on record</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {trips.map((t, i) => {
            const hrs = t.ended_at
              ? (new Date(t.ended_at).getTime() - new Date(t.started_at).getTime()) / 3_600_000
              : 0;
            const avgSpd  = hrs > 0 ? (t.distance_km / hrs).toFixed(0) : "—";
            const fuelUsed = t.fuel_end != null ? +(t.fuel_start - t.fuel_end).toFixed(1) : null;
            const tripCost = fuelUsed != null ? Math.round((fuelUsed * TANK_L / 100) * DIESEL_NGN) : null;
            return (
              <View key={t.id ?? i}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.tripRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tripDate}>
                      {new Date(t.started_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                      {" · "}
                      {new Date(t.started_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    <Text style={styles.tripStats}>
                      {t.distance_km.toFixed(1)} km
                      {avgSpd !== "—" ? ` · ${avgSpd} km/h avg` : ""}
                      {fuelUsed != null ? ` · −${fuelUsed}% fuel` : ""}
                    </Text>
                    {tripCost != null && (
                      <Text style={styles.tripCost}>Est. fuel cost: ₦{tripCost.toLocaleString()}</Text>
                    )}
                  </View>
                  <View style={styles.tripBadge}>
                    <Text style={styles.tripBadgeText}>{t.distance_km.toFixed(1)} km</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#111827" },
  content:       { padding: 16, paddingBottom: 40, gap: 12 },
  center:        { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111827", gap: 10 },
  errIcon:       { fontSize: 36 },
  errTitle:      { color: "#fff", fontWeight: "700", fontSize: 16 },
  errSub:        { color: "#9CA3AF", fontSize: 13, textAlign: "center", paddingHorizontal: 24 },
  retryBtn:      { backgroundColor: "#F97316", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText:     { color: "#fff", fontWeight: "700", fontSize: 14 },
  sectionHead:   { fontSize: 11, fontWeight: "700", color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase" },
  headerCard:    { backgroundColor: "#1F2937", borderRadius: 14, borderWidth: 1, borderColor: "#374151", padding: 16, gap: 10 },
  headerTop:     { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot:     { width: 10, height: 10, borderRadius: 5 },
  truckName:     { color: "#fff", fontWeight: "800", fontSize: 18 },
  truckSub:      { color: "#9CA3AF", fontSize: 12, marginTop: 1 },
  statusChip:    { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:    { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  driverRow:     { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#374151", paddingTop: 10 },
  driverLabel:   { color: "#6B7280", fontSize: 13 },
  driverName:    { color: "#fff", fontWeight: "600", fontSize: 13 },
  routeRow:      { flexDirection: "row", justifyContent: "space-between" },
  routeLabel:    { color: "#6B7280", fontSize: 12 },
  routeValue:    { color: "#3B82F6", fontSize: 12, fontWeight: "600", flex: 1, textAlign: "right" },
  kpiGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi:           { width: "47%", backgroundColor: "#1F2937", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#374151" },
  kpiWarn:       { borderColor: "#F97316" },
  kpiVal:        { fontSize: 20, fontWeight: "800", color: "#fff" },
  kpiValWarn:    { color: "#F97316" },
  kpiLabel:      { fontSize: 11, color: "#6B7280", marginTop: 3, textAlign: "center" },
  kpiSub:        { fontSize: 10, color: "#4B5563", marginTop: 1, textAlign: "center" },
  card:          { backgroundColor: "#1F2937", borderRadius: 14, borderWidth: 1, borderColor: "#374151", overflow: "hidden" },
  divider:       { height: 1, backgroundColor: "#374151" },
  detailRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, gap: 12 },
  detailLabel:   { color: "#6B7280", fontSize: 12, flexShrink: 0 },
  detailValue:   { color: "#fff", fontSize: 12, fontWeight: "600", textAlign: "right", flex: 1 },
  mono:          { fontVariant: ["tabular-nums"] },
  alertRow:      { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 },
  alertDot:      { width: 8, height: 8, borderRadius: 4, marginTop: 3, flexShrink: 0 },
  alertTitle:    { color: "#FCA5A5", fontWeight: "700", fontSize: 13 },
  alertMsg:      { color: "#9CA3AF", fontSize: 12, marginTop: 2, lineHeight: 17 },
  alertTime:     { color: "#4B5563", fontSize: 10, marginTop: 3 },
  tripRow:       { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  tripDate:      { color: "#fff", fontWeight: "600", fontSize: 13 },
  tripStats:     { color: "#6B7280", fontSize: 12, marginTop: 2 },
  tripCost:      { color: "#F97316", fontSize: 11, marginTop: 3 },
  tripBadge:     { backgroundColor: "#374151", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 2 },
  tripBadgeText: { color: "#10B981", fontWeight: "700", fontSize: 12 },
  empty:         { backgroundColor: "#1F2937", borderRadius: 12, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#374151" },
  emptyText:     { color: "#6B7280", fontSize: 13 },
});
