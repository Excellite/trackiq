/**
 * Driver mode — turns the phone into a GPS tracker.
 * The driver enters their IMEI (or it's pre-configured), grants location permission,
 * and the app pings /api/tracker every 30 s in the foreground.
 *
 * For true background tracking (when the screen is off) you would add
 * expo-task-manager + startLocationUpdatesAsync, which requires a paid
 * EAS build or a custom dev client. The foreground version here works
 * for an initial integration and can be upgraded later.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Switch, Platform, ScrollView,
} from "react-native";
import * as Location from "expo-location";
import { pingTracker } from "@/lib/api";
import { TRACKER_INTERVAL_MS } from "@/lib/config";

interface LogEntry { ts: string; lat: number; lng: number; speed: number; ok: boolean }

export function TrackerScreen() {
  const [imei,     setImei]     = useState("");
  const [active,   setActive]   = useState(false);
  const [status,   setStatus]   = useState("Idle");
  const [log,      setLog]      = useState<LogEntry[]>([]);
  const [errMsg,   setErrMsg]   = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const push = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng, speed } = loc.coords;
      const speedKmh = Math.max(0, Math.round((speed ?? 0) * 3.6));
      await pingTracker({ imei, lat, lng, speed: speedKmh });
      setStatus(`Sent ${lat.toFixed(5)}, ${lng.toFixed(5)} @ ${speedKmh} km/h`);
      setLog((p) => [{ ts: new Date().toLocaleTimeString(), lat, lng, speed: speedKmh, ok: true }, ...p].slice(0, 20));
    } catch (e) {
      setStatus("Error sending ping");
      setLog((p) => [{ ts: new Date().toLocaleTimeString(), lat: 0, lng: 0, speed: 0, ok: false }, ...p].slice(0, 20));
    }
  };

  const start = async () => {
    if (!imei.trim()) { setErrMsg("Enter the truck IMEI first."); return; }
    setErrMsg("");

    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== "granted") { setErrMsg("Location permission denied."); return; }

    setActive(true);
    setStatus("Starting…");
    push();
    intervalRef.current = setInterval(push, TRACKER_INTERVAL_MS);
  };

  const stop = () => {
    setActive(false);
    setStatus("Stopped");
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Driver Tracker</Text>
      <Text style={styles.sub}>Turn this phone into a GPS tracker for a truck.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Truck IMEI</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 123456789012345"
          placeholderTextColor="#6B7280"
          value={imei}
          onChangeText={setImei}
          keyboardType="numeric"
          editable={!active}
        />
        <Text style={styles.hint}>
          Must match the <Text style={styles.mono}>imei</Text> column for your truck in Supabase.
        </Text>
      </View>

      {!!errMsg && <Text style={styles.err}>⚠ {errMsg}</Text>}

      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>{active ? "Tracking active" : "Start tracking"}</Text>
          <Text style={styles.toggleSub}>Pings every {TRACKER_INTERVAL_MS / 1000}s</Text>
        </View>
        <Switch
          value={active}
          onValueChange={(v) => v ? start() : stop()}
          trackColor={{ false: "#374151", true: "#F97316" }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.statusCard}>
        <View style={[styles.statusDot, { backgroundColor: active ? "#10B981" : "#6B7280" }]} />
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {log.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>Recent Pings</Text>
          {log.map((e, i) => (
            <View key={i} style={styles.logRow}>
              <Text style={[styles.logDot, { color: e.ok ? "#10B981" : "#EF4444" }]}>●</Text>
              <Text style={styles.logText}>
                {e.ts}{"  "}{e.ok ? `${e.lat.toFixed(4)}, ${e.lng.toFixed(4)} · ${e.speed} km/h` : "Failed"}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Background tracking</Text>
        <Text style={styles.noteBody}>
          Tracking pauses when the screen locks. For always-on tracking, build with EAS and enable background location in app.json. This is already configured — just needs a native build.
        </Text>
      </View>
    </ScrollView>
  );
}

const mono = Platform.OS === "ios" ? "Courier" : "monospace";

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: "#111827" },
  content:     { padding: 16, paddingBottom: 40, gap: 12 },
  heading:     { fontSize: 22, fontWeight: "800", color: "#fff" },
  sub:         { fontSize: 13, color: "#6B7280" },
  card:        { backgroundColor: "#1F2937", borderRadius: 14, borderWidth: 1, borderColor: "#374151", padding: 14, gap: 8 },
  label:       { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.6 },
  input:       { backgroundColor: "#111827", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "#374151", fontFamily: mono },
  hint:        { fontSize: 11, color: "#6B7280", lineHeight: 16 },
  mono:        { fontFamily: mono, color: "#F97316" },
  err:         { color: "#F87171", fontSize: 12 },
  toggleRow:   { backgroundColor: "#1F2937", borderRadius: 14, borderWidth: 1, borderColor: "#374151", padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLabel: { color: "#fff", fontWeight: "700", fontSize: 15 },
  toggleSub:   { color: "#6B7280", fontSize: 12, marginTop: 2 },
  statusCard:  { backgroundColor: "#1F2937", borderRadius: 12, borderWidth: 1, borderColor: "#374151", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot:   { width: 10, height: 10, borderRadius: 5 },
  statusText:  { color: "#9CA3AF", fontSize: 12, flex: 1, fontFamily: mono },
  logRow:      { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  logDot:      { fontSize: 8, marginTop: 3 },
  logText:     { color: "#9CA3AF", fontSize: 11, flex: 1, fontFamily: mono },
  noteCard:    { backgroundColor: "#172554", borderRadius: 12, padding: 14, gap: 4 },
  noteTitle:   { color: "#93C5FD", fontWeight: "700", fontSize: 13 },
  noteBody:    { color: "#6B7280", fontSize: 12, lineHeight: 18 },
});
