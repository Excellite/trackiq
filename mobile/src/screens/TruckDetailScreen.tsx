import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, RefreshControl,
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { fetchTruck, fetchTruckTrips, fetchAlerts } from "@/lib/api";
import type { Truck, Trip, Alert } from "@/lib/types";
import type { RootStackParams } from "@/navigation";

const STATUS_COLOR: Record<string, string> = {
  moving: "#10B981", idle: "#F59E0B", offline: "#EF4444", alert: "#F97316",
};

function KPI({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <View style={[styles.kpi, warn && styles.kpiWarn]}>
      <Text style={[styles.kpiVal, warn && styles.kpiValWarn]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (error || !truck) {
    return (
      <View style={styles.center}>
        <Text style={styles.errIcon}>⚠</Text>
        <Text style={styles.errTitle}>Could not load truck</Text>
        <Text style={styles.errSub}>{error ?? "Truck not found"}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dot = STATUS_COLOR[truck.status] ?? "#6B7280";
  const totalKm = trips.reduce((s, t) => s + t.distance_km, 0);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#F97316" />}
    >
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={[styles.statusDot, { backgroundColor: dot }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.truckName}>{truck.name}</Text>
            <Text style={styles.truckSub}>{truck.plate} · {truck.model} {truck.year}</Text>
          </View>
          <View style={[styles.statusChip, { borderColor: dot }]}>
            <Text style={[styles.statusText, { color: dot }]}>{truck.status}</Text>
          </View>
        </View>
        <Text style={styles.driverLabel}>Driver: <Text style={styles.driverName}>{truck.driver || "Unassigned"}</Text></Text>
      </View>

      {/* KPI row */}
      <View style={styles.kpiRow}>
        <KPI label="Fuel"     value={`${truck.fuel}%`}       warn={truck.fuel < 20} />
        <KPI label="Speed"    value={`${truck.speed} km/h`}  warn={truck.speed > 100} />
        <KPI label="Odometer" value={`${truck.odometer.toLocaleString()}`} sub="km" />
      </View>

      <View style={styles.kpiRow}>
        <KPI label="Trips (log)" value={trips.length}             />
        <KPI label="Total km"    value={`${totalKm.toFixed(0)}`} sub="this log" />
        <KPI label="Next service" value={truck.nextService ?? "—"} warn={!!truck.nextService && truck.nextService < new Date().toISOString().split("T")[0]} />
      </View>

      {/* Alerts */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHead}>Active Alerts</Text>
          <View style={styles.card}>
            {alerts.map((a, i) => (
              <View key={a.id}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.alertRow}>
                  <View style={[styles.alertDot, { backgroundColor: a.severity === "critical" ? "#EF4444" : "#F59E0B" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>{a.title}</Text>
                    <Text style={styles.alertMsg}>{a.message}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Trip log */}
      <View style={styles.section}>
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
              const avgSpd = hrs > 0 ? (t.distance_km / hrs).toFixed(0) : "—";
              const fuelUsed = t.fuel_end != null ? (t.fuel_start - t.fuel_end).toFixed(1) : null;
              return (
                <View key={t.id ?? i}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.tripRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tripDate}>{fmtDate(t.started_at)} · {fmtTime(t.started_at)}</Text>
                      <Text style={styles.tripStats}>
                        {t.distance_km.toFixed(1)} km · {avgSpd !== "—" ? `${avgSpd} km/h avg` : "—"}
                        {fuelUsed != null ? ` · −${fuelUsed}% fuel` : ""}
                      </Text>
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
      </View>
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
  headerCard:    { backgroundColor: "#1F2937", borderRadius: 14, borderWidth: 1, borderColor: "#374151", padding: 16, gap: 8 },
  headerTop:     { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot:     { width: 10, height: 10, borderRadius: 5 },
  truckName:     { color: "#fff", fontWeight: "800", fontSize: 18 },
  truckSub:      { color: "#9CA3AF", fontSize: 12, marginTop: 1 },
  statusChip:    { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:    { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  driverLabel:   { color: "#6B7280", fontSize: 13 },
  driverName:    { color: "#fff", fontWeight: "600" },
  kpiRow:        { flexDirection: "row", gap: 10 },
  kpi:           { flex: 1, backgroundColor: "#1F2937", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#374151" },
  kpiWarn:       { borderColor: "#F97316" },
  kpiVal:        { fontSize: 16, fontWeight: "800", color: "#fff" },
  kpiValWarn:    { color: "#F97316" },
  kpiLabel:      { fontSize: 10, color: "#6B7280", marginTop: 2, textAlign: "center" },
  kpiSub:        { fontSize: 9, color: "#4B5563", marginTop: 1 },
  section:       { gap: 8 },
  sectionHead:   { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8 },
  card:          { backgroundColor: "#1F2937", borderRadius: 14, borderWidth: 1, borderColor: "#374151", overflow: "hidden" },
  divider:       { height: 1, backgroundColor: "#374151", marginLeft: 14 },
  alertRow:      { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 },
  alertDot:      { width: 8, height: 8, borderRadius: 4, marginTop: 3, flexShrink: 0 },
  alertTitle:    { color: "#FCA5A5", fontWeight: "700", fontSize: 13 },
  alertMsg:      { color: "#9CA3AF", fontSize: 12, marginTop: 2, lineHeight: 17 },
  tripRow:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  tripDate:      { color: "#fff", fontWeight: "600", fontSize: 13 },
  tripStats:     { color: "#6B7280", fontSize: 12, marginTop: 2 },
  tripBadge:     { backgroundColor: "#374151", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  tripBadgeText: { color: "#10B981", fontWeight: "700", fontSize: 12 },
  empty:         { backgroundColor: "#1F2937", borderRadius: 12, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#374151" },
  emptyText:     { color: "#6B7280", fontSize: 13 },
});
