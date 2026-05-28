import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchAlerts } from "@/lib/api";
import type { Alert } from "@/lib/types";
import type { RootStackParams } from "@/navigation";

type Nav = NativeStackNavigationProp<RootStackParams>;

const SEV_STYLE: Record<string, { border: string; dot: string; text: string; badge: string }> = {
  critical: { border: "#FCA5A5", dot: "#EF4444", text: "#FCA5A5", badge: "#450a0a" },
  warning:  { border: "#FCD34D", dot: "#F59E0B", text: "#FCD34D", badge: "#451a03" },
  info:     { border: "#93C5FD", dot: "#3B82F6", text: "#93C5FD", badge: "#172554" },
};

const SEV_LABEL: Record<string, string> = {
  low_fuel:             "Low Fuel",
  maintenance_overdue:  "Maintenance",
  offline:              "Offline",
  doc_expiry:           "Document",
  speeding:             "Speeding",
};

function AlertRow({ alert, onPress }: { alert: Alert; onPress: () => void }) {
  const s = SEV_STYLE[alert.severity] ?? SEV_STYLE.info;
  const typeLabel = SEV_LABEL[alert.type] ?? alert.type;

  return (
    <TouchableOpacity style={[styles.row, { borderColor: s.border }]} onPress={onPress}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.rowHeader}>
          <Text style={[styles.title, { color: s.text }]}>{alert.title}</Text>
          <View style={[styles.typeBadge, { backgroundColor: s.badge }]}>
            <Text style={[styles.typeText, { color: s.text }]}>{typeLabel}</Text>
          </View>
        </View>
        <Text style={styles.msg}>{alert.message}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function AlertsScreen() {
  const nav = useNavigation<Nav>();

  const [alerts,     setAlerts]     = useState<Alert[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      setAlerts(await fetchAlerts());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const criticals = alerts.filter((a) => a.severity === "critical");
  const warnings  = alerts.filter((a) => a.severity === "warning");
  const infos     = alerts.filter((a) => a.severity === "info");

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#F97316" /></View>;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errIcon}>⚠</Text>
        <Text style={styles.errTitle}>Failed to load alerts</Text>
        <Text style={styles.errSub}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (alerts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyTitle}>Fleet is healthy</Text>
        <Text style={styles.emptySub}>No active alerts right now.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#F97316" />}
      data={[...criticals, ...warnings, ...infos]}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Alerts</Text>
          <View style={styles.summary}>
            {criticals.length > 0 && (
              <View style={[styles.badge, { backgroundColor: "#450a0a", borderColor: "#FCA5A5" }]}>
                <Text style={[styles.badgeText, { color: "#FCA5A5" }]}>{criticals.length} critical</Text>
              </View>
            )}
            {warnings.length > 0 && (
              <View style={[styles.badge, { backgroundColor: "#451a03", borderColor: "#FCD34D" }]}>
                <Text style={[styles.badgeText, { color: "#FCD34D" }]}>{warnings.length} warning</Text>
              </View>
            )}
            {infos.length > 0 && (
              <View style={[styles.badge, { backgroundColor: "#172554", borderColor: "#93C5FD" }]}>
                <Text style={[styles.badgeText, { color: "#93C5FD" }]}>{infos.length} info</Text>
              </View>
            )}
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <AlertRow
          alert={item}
          onPress={() => nav.navigate("TruckDetail", { truckId: item.truck_id })}
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#111827" },
  content:    { padding: 16, paddingBottom: 32, gap: 8 },
  center:     { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111827", gap: 8 },
  heading:    { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 8 },
  summary:    { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  badge:      { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText:  { fontSize: 12, fontWeight: "700" },
  row:        { backgroundColor: "#1F2937", borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  rowHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  dot:        { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
  title:      { fontWeight: "700", fontSize: 14 },
  typeBadge:  { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeText:   { fontSize: 10, fontWeight: "600" },
  msg:        { color: "#9CA3AF", fontSize: 12, lineHeight: 18 },
  errIcon:    { fontSize: 36 },
  errTitle:   { color: "#fff", fontWeight: "700", fontSize: 16 },
  errSub:     { color: "#9CA3AF", fontSize: 13, textAlign: "center", paddingHorizontal: 24 },
  retryBtn:   { backgroundColor: "#F97316", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryText:  { color: "#fff", fontWeight: "700", fontSize: 14 },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { color: "#fff", fontWeight: "700", fontSize: 16, marginTop: 8 },
  emptySub:   { color: "#6B7280", fontSize: 13 },
});
