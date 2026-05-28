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

const STATUS_COLOR: Record<string, string> = {
  moving: "#10B981", idle: "#6B7280", offline: "#EF4444", alert: "#F97316",
};

function KPI({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <View style={[styles.kpi, warn && styles.kpiWarn]}>
      <Text style={[styles.kpiVal, warn && styles.kpiValWarn]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function TruckRow({ truck, onPress }: { truck: Truck; onPress: () => void }) {
  const dot = STATUS_COLOR[truck.status] ?? "#6B7280";
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <View style={styles.rowMid}>
        <Text style={styles.rowName}>{truck.name}</Text>
        <Text style={styles.rowSub}>{truck.plate} · {truck.driver || "—"}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.fuelVal}>{truck.fuel}%</Text>
        <Text style={styles.rowSub}>{truck.speed > 0 ? `${truck.speed} km/h` : truck.status}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function DashboardScreen() {
  const nav = useNavigation<Nav>();

  const [trucks,      setTrucks]      = useState<Truck[]>([]);
  const [alerts,      setAlerts]      = useState<Alert[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);

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
    const interval = setInterval(() => load(true), 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const goToTruck = (id: string) => nav.navigate("TruckDetail", { truckId: id });

  const moving    = trucks.filter((t) => t.status === "moving").length;
  const offline   = trucks.filter((t) => t.status === "offline").length;
  const avgFuel   = trucks.length ? Math.round(trucks.reduce((s, t) => s + t.fuel, 0) / trucks.length) : 0;
  const criticals = alerts.filter((a) => a.severity === "critical");

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
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
      <Text style={styles.heading}>Fleet Overview</Text>
      <Text style={styles.sub}>{trucks.length} vehicles · auto-refreshes every 30s</Text>

      <View style={styles.kpiRow}>
        <KPI label="Moving"   value={`${moving}/${trucks.length}`} warn={moving > 0} />
        <KPI label="Offline"  value={offline}    warn={offline > 0} />
        <KPI label="Avg Fuel" value={`${avgFuel}%`} warn={avgFuel < 30} />
        <KPI label="Alerts"   value={criticals.length} warn={criticals.length > 0} />
      </View>

      {criticals.map((a) => (
        <TouchableOpacity key={a.id} style={styles.alertCard} onPress={() => goToTruck(a.truck_id)}>
          <Text style={styles.alertDot}>●</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{a.title}</Text>
            <Text style={styles.alertMsg} numberOfLines={1}>{a.message}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}

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
  root:        { flex: 1, backgroundColor: "#111827" },
  content:     { padding: 16, paddingBottom: 32, gap: 12 },
  center:      { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111827", gap: 10 },
  heading:     { fontSize: 22, fontWeight: "800", color: "#fff" },
  sub:         { fontSize: 13, color: "#6B7280", marginTop: 2 },
  errIcon:     { fontSize: 32 },
  errTitle:    { color: "#fff", fontWeight: "700", fontSize: 16 },
  errSub:      { color: "#9CA3AF", fontSize: 13, textAlign: "center", paddingHorizontal: 24 },
  retryBtn:    { backgroundColor: "#F97316", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  kpiRow:      { flexDirection: "row", gap: 10 },
  kpi:         { flex: 1, backgroundColor: "#1F2937", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#374151" },
  kpiWarn:     { borderColor: "#F97316" },
  kpiVal:      { fontSize: 18, fontWeight: "800", color: "#fff" },
  kpiValWarn:  { color: "#F97316" },
  kpiLabel:    { fontSize: 10, color: "#6B7280", marginTop: 2, textAlign: "center" },
  alertCard:   { backgroundColor: "#1F2937", borderRadius: 12, borderWidth: 1, borderColor: "#FCA5A5", padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  alertDot:    { color: "#EF4444", fontSize: 10 },
  alertTitle:  { color: "#FCA5A5", fontWeight: "700", fontSize: 13 },
  alertMsg:    { color: "#9CA3AF", fontSize: 12, marginTop: 1 },
  chevron:     { color: "#6B7280", fontSize: 20, lineHeight: 22 },
  sectionHead: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4 },
  card:        { backgroundColor: "#1F2937", borderRadius: 14, borderWidth: 1, borderColor: "#374151", overflow: "hidden" },
  row:         { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  dot:         { width: 9, height: 9, borderRadius: 5 },
  rowMid:      { flex: 1 },
  rowName:     { color: "#fff", fontWeight: "600", fontSize: 14 },
  rowSub:      { color: "#6B7280", fontSize: 11, marginTop: 1 },
  rowRight:    { alignItems: "flex-end" },
  fuelVal:     { color: "#fff", fontWeight: "700", fontSize: 13 },
  divider:     { height: 1, backgroundColor: "#374151", marginLeft: 14 },
});
