import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchTrucks, fetchAlerts } from "@/lib/api";
import type { Truck, Alert } from "@/lib/types";
import type { RootStackParams } from "@/navigation";

type Nav = NativeStackNavigationProp<RootStackParams>;

// ── Operational constants ────────────────────────────────────────────────────
const DIESEL_NGN = 1_250;
const TANK_L     = 400;
const BASE_L100: Record<string, number> = { truck: 42, trailer: 52, bus: 28, car: 13 };
const rangeKm    = (t: Truck) => Math.round((t.fuel * TANK_L / 100) * 100 / (BASE_L100[t.vehicle_type] ?? 38));
const fmtNaira   = (n: number) => n >= 1_000_000 ? `₦${(n/1_000_000).toFixed(1)}M` : `₦${Math.round(n/1_000)}k`;

const STATUS_COLOR: Record<string, string> = {
  moving: "#10B981", idle: "#6B7280", offline: "#EF4444", alert: "#F97316",
};

function KPICard({ label, value, sub, warn, accent }:
  { label: string; value: string | number; sub?: string; warn?: boolean; accent?: string }) {
  return (
    <View style={[styles.kpi, warn && styles.kpiWarn, accent ? { borderColor: accent } : null]}>
      <Text style={[styles.kpiVal, warn && styles.kpiValWarn, accent ? { color: accent } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {sub ? <Text style={styles.kpiSub} numberOfLines={1}>{sub}</Text> : null}
    </View>
  );
}

function MetricTile({ label, value, sub, urgent, onPress }:
  { label: string; value: string | number; sub: string; urgent: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.metricTile, urgent && styles.metricTileUrgent]}
      onPress={onPress}
    >
      <Text style={[styles.metricVal, urgent && styles.metricValUrgent]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricSub} numberOfLines={1}>{sub}</Text>
    </TouchableOpacity>
  );
}

function TruckRow({ truck, onPress }: { truck: Truck; onPress: () => void }) {
  const dot   = STATUS_COLOR[truck.status] ?? "#6B7280";
  const range = rangeKm(truck);
  const overdue = truck.nextService && truck.nextService < new Date().toISOString().split("T")[0];
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={styles.rowMid}>
        <Text style={styles.rowName}>{truck.name}</Text>
        <Text style={styles.rowSub}>{truck.plate} · {truck.driver || "—"}</Text>
        <Text style={styles.rowRoute} numberOfLines={1}>{truck.route || "No active route"}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.fuelVal, truck.fuel < 20 && { color: "#EF4444" }]}>{truck.fuel}%</Text>
        <Text style={styles.rowSub}>{truck.speed > 0 ? `${truck.speed} km/h` : truck.status}</Text>
        <Text style={[styles.rowRange, range < 100 && { color: "#F97316" }]}>~{range} km</Text>
        {overdue && <Text style={styles.overdueTag}>SVC DUE</Text>}
      </View>
    </TouchableOpacity>
  );
}

export function DashboardScreen() {
  const nav = useNavigation<Nav>();
  const [trucks,     setTrucks]     = useState<Truck[]>([]);
  const [alerts,     setAlerts]     = useState<Alert[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [t, a] = await Promise.all([fetchTrucks(), fetchAlerts()]);
      setTrucks(t);
      setAlerts(a);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const goToTruck = (id: string) => nav.navigate("TruckDetail", { truckId: id });

  // ── Operational metrics ──────────────────────────────────────────────────
  const today        = new Date().toISOString().split("T")[0];
  const moving       = trucks.filter((t) => t.status === "moving").length;
  const idleCount    = trucks.filter((t) => t.status === "idle").length;
  const offlineCount = trucks.filter((t) => t.status === "offline").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const operational  = trucks.length - offlineCount;
  const utilization  = operational > 0 ? Math.round((moving / operational) * 100) : 0;
  const avgFuel      = trucks.length ? Math.round(trucks.reduce((s, t) => s + t.fuel, 0) / trucks.length) : 0;
  const overdueCount = trucks.filter((t) => t.nextService && t.nextService < today).length;
  const dueSoonCount = trucks.filter((t) => {
    if (!t.nextService || t.nextService < today) return false;
    return (new Date(t.nextService).getTime() - Date.now()) / 86_400_000 <= 14;
  }).length;
  const maintCompliance = trucks.length ? Math.round(((trucks.length - overdueCount) / trucks.length) * 100) : 100;
  const speedViolations = trucks.filter((t) => t.speed > 100).length;
  const critFuelCount   = trucks.filter((t) => t.fuel < 15).length;
  const dailyFuelSpend  = trucks
    .filter((t) => t.status === "moving")
    .reduce((s, t) => s + (BASE_L100[t.vehicle_type] ?? 38) * 200 / 100 * DIESEL_NGN, 0);

  // Fleet health composite score
  const fuelH  = avgFuel >= 50 ? 30 : avgFuel >= 25 ? 18 : 6;
  const alertH = criticalCount === 0 ? 30 : Math.max(0, 30 - criticalCount * 8);
  const maintH = overdueCount === 0 ? (dueSoonCount === 0 ? 20 : 14) : 4;
  const utilH  = utilization >= 70 ? 20 : utilization >= 50 ? 14 : 8;
  const healthScore = fuelH + alertH + maintH + utilH;
  const healthGrade = healthScore >= 90 ? "A" : healthScore >= 75 ? "B" : healthScore >= 60 ? "C" : "D";
  const gradeColor  = healthGrade === "A" ? "#10B981" : healthGrade === "B" ? "#3B82F6"
                    : healthGrade === "C" ? "#F59E0B" : "#EF4444";

  // Priority actions
  const actions: Array<{ level: "critical" | "warning" | "info"; text: string }> = [];
  if (criticalCount > 0)
    actions.push({ level: "critical", text: `${criticalCount} vehicle${criticalCount > 1 ? "s" : ""} in ALERT — immediate action required` });
  if (critFuelCount > 0)
    actions.push({ level: "critical", text: `Critical fuel: ${trucks.filter(t => t.fuel < 15).map(t => t.id).slice(0,2).join(", ")} — dispatch refuel` });
  if (overdueCount > 0)
    actions.push({ level: "critical", text: `${overdueCount} vehicle${overdueCount > 1 ? "s" : ""} overdue for scheduled service` });
  if (speedViolations > 0)
    actions.push({ level: "warning", text: `${speedViolations} vehicle${speedViolations > 1 ? "s" : ""} exceeding 100 km/h highway limit` });
  if (dueSoonCount > 0 && overdueCount === 0)
    actions.push({ level: "info", text: `${dueSoonCount} vehicle${dueSoonCount > 1 ? "s" : ""} due for service within 14 days — schedule now` });
  if (idleCount > 3)
    actions.push({ level: "info", text: `${idleCount} vehicles idle — ₦${Math.round(idleCount * 1.5 * DIESEL_NGN).toLocaleString()}/hr in idle fuel burn` });

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#F97316" /></View>;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errIcon}>⚠</Text>
        <Text style={styles.errTitle}>Failed to load fleet data</Text>
        <Text style={styles.errSub}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#F97316" />}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Fleet Overview</Text>
          <Text style={styles.sub}>{trucks.length} vehicles · refreshes every 30s</Text>
        </View>
        <View style={[styles.gradeBadge, { borderColor: gradeColor }]}>
          <Text style={[styles.gradeText, { color: gradeColor }]}>Grade {healthGrade}</Text>
          <Text style={[styles.gradeSub, { color: gradeColor }]}>{healthScore}/100</Text>
        </View>
      </View>

      {/* 4 Operational KPIs */}
      <View style={styles.kpiRow}>
        <KPICard
          label="Utilisation"
          value={`${utilization}%`}
          sub={`${moving} moving · ${idleCount} idle`}
          accent={utilization >= 70 ? "#10B981" : utilization >= 50 ? "#F59E0B" : "#EF4444"}
        />
        <KPICard
          label="Daily Fuel Cost"
          value={fmtNaira(dailyFuelSpend)}
          sub={`@₦${DIESEL_NGN.toLocaleString()}/L`}
          accent="#F97316"
        />
      </View>
      <View style={styles.kpiRow}>
        <KPICard
          label="Maint. Compliance"
          value={`${maintCompliance}%`}
          sub={overdueCount > 0 ? `${overdueCount} overdue` : dueSoonCount > 0 ? `${dueSoonCount} due soon` : "All current"}
          warn={maintCompliance < 90}
        />
        <KPICard
          label="Active Alerts"
          value={criticalCount}
          sub={criticalCount > 0 ? `${speedViolations} speed viol.` : "All clear"}
          warn={criticalCount > 0}
        />
      </View>

      {/* Operations Command */}
      <Text style={styles.sectionHead}>Operations Command</Text>
      <View style={styles.metricGrid}>
        <MetricTile label="Speed Violations" value={speedViolations}   sub="> 100 km/h limit"         urgent={speedViolations > 0} onPress={() => nav.navigate("Tabs")} />
        <MetricTile label="Offline Vehicles"  value={offlineCount}     sub="No GPS signal"            urgent={offlineCount > 0}    onPress={() => {}} />
        <MetricTile label="Critical Fuel"     value={critFuelCount}    sub="< 15% — refuel now"       urgent={critFuelCount > 0}   onPress={() => {}} />
        <MetricTile label="Overdue Service"   value={overdueCount}     sub="Past due date"            urgent={overdueCount > 0}    onPress={() => {}} />
        <MetricTile label="Idle Burn"         value={fmtNaira(idleCount * 1.5 * DIESEL_NGN)} sub={`${idleCount} idle · est. /hr`} urgent={idleCount > 3} onPress={() => {}} />
        <MetricTile label="Avg Fuel Level"    value={`${avgFuel}%`}   sub="Fleet average"            urgent={avgFuel < 30}        onPress={() => {}} />
      </View>

      {/* Priority Actions */}
      <Text style={styles.sectionHead}>Priority Actions</Text>
      {actions.length === 0 ? (
        <View style={styles.allClearCard}>
          <Text style={styles.allClearIcon}>✓</Text>
          <View>
            <Text style={styles.allClearTitle}>All systems nominal</Text>
            <Text style={styles.allClearSub}>No immediate action required</Text>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          {actions.slice(0, 5).map((a, i) => {
            const borderCol = a.level === "critical" ? "#EF4444" : a.level === "warning" ? "#F59E0B" : "#3B82F6";
            const textCol   = a.level === "critical" ? "#FCA5A5" : a.level === "warning" ? "#FCD34D" : "#93C5FD";
            const labelCol  = a.level === "critical" ? "#EF4444" : a.level === "warning" ? "#F59E0B" : "#3B82F6";
            return (
              <View key={i}>
                {i > 0 && <View style={styles.divider} />}
                <View style={[styles.actionRow, { borderLeftColor: borderCol }]}>
                  <Text style={[styles.actionLevel, { color: labelCol }]}>{a.level.toUpperCase()}</Text>
                  <Text style={[styles.actionText, { color: textCol }]}>{a.text}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Vehicle list */}
      <Text style={styles.sectionHead}>All Vehicles</Text>
      <View style={styles.card}>
        {trucks.map((t, i) => (
          <View key={t.id}>
            {i > 0 && <View style={styles.divider} />}
            <TruckRow truck={t} onPress={() => goToTruck(t.id)} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:              { flex: 1, backgroundColor: "#111827" },
  content:           { padding: 16, paddingBottom: 40, gap: 12 },
  center:            { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111827", gap: 10 },
  headerRow:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heading:           { fontSize: 22, fontWeight: "800", color: "#fff" },
  sub:               { fontSize: 12, color: "#6B7280", marginTop: 2 },
  gradeBadge:        { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: "center" },
  gradeText:         { fontSize: 13, fontWeight: "800" },
  gradeSub:          { fontSize: 10, fontWeight: "600", marginTop: 1 },
  errIcon:           { fontSize: 32 },
  errTitle:          { color: "#fff", fontWeight: "700", fontSize: 16 },
  errSub:            { color: "#9CA3AF", fontSize: 13, textAlign: "center", paddingHorizontal: 24 },
  retryBtn:          { backgroundColor: "#F97316", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText:         { color: "#fff", fontWeight: "700", fontSize: 14 },
  kpiRow:            { flexDirection: "row", gap: 10 },
  kpi:               { flex: 1, backgroundColor: "#1F2937", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#374151" },
  kpiWarn:           { borderColor: "#F97316" },
  kpiVal:            { fontSize: 18, fontWeight: "800", color: "#fff" },
  kpiValWarn:        { color: "#F97316" },
  kpiLabel:          { fontSize: 10, color: "#6B7280", marginTop: 2, textAlign: "center" },
  kpiSub:            { fontSize: 9, color: "#4B5563", marginTop: 1, textAlign: "center" },
  sectionHead:       { fontSize: 11, fontWeight: "700", color: "#9CA3AF", letterSpacing: 1, textTransform: "uppercase" },
  metricGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricTile:        { width: "30.5%", backgroundColor: "#1F2937", borderRadius: 12, padding: 11, borderWidth: 1, borderColor: "#374151" },
  metricTileUrgent:  { borderColor: "#EF4444", backgroundColor: "#1F0808" },
  metricVal:         { fontSize: 20, fontWeight: "800", color: "#fff" },
  metricValUrgent:   { color: "#EF4444" },
  metricLabel:       { fontSize: 9, color: "#6B7280", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  metricSub:         { fontSize: 9, color: "#4B5563", marginTop: 1 },
  card:              { backgroundColor: "#1F2937", borderRadius: 14, borderWidth: 1, borderColor: "#374151", overflow: "hidden" },
  divider:           { height: 1, backgroundColor: "#374151", marginLeft: 14 },
  allClearCard:      { backgroundColor: "#052e16", borderRadius: 12, borderWidth: 1, borderColor: "#166534", padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  allClearIcon:      { fontSize: 22, color: "#10B981" },
  allClearTitle:     { color: "#10B981", fontWeight: "700", fontSize: 14 },
  allClearSub:       { color: "#16a34a", fontSize: 12, marginTop: 1 },
  actionRow:         { paddingHorizontal: 14, paddingVertical: 11, borderLeftWidth: 3, gap: 2 },
  actionLevel:       { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  actionText:        { fontSize: 12, lineHeight: 17 },
  row:               { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  dot:               { width: 9, height: 9, borderRadius: 5, marginTop: 2 },
  rowMid:            { flex: 1 },
  rowName:           { color: "#fff", fontWeight: "600", fontSize: 14 },
  rowSub:            { color: "#6B7280", fontSize: 11, marginTop: 1 },
  rowRoute:          { color: "#3B82F6", fontSize: 10, marginTop: 2 },
  rowRight:          { alignItems: "flex-end", gap: 2 },
  fuelVal:           { color: "#fff", fontWeight: "700", fontSize: 13 },
  rowRange:          { color: "#9CA3AF", fontSize: 10, fontFamily: "monospace" },
  overdueTag:        { backgroundColor: "#7f1d1d", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
});
