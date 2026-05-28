import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchTrucks, fetchTruckPositions } from "@/lib/api";
import type { Position } from "@/lib/api";
import { API_BASE } from "@/lib/config";
import type { Truck } from "@/lib/types";
import type { RootStackParams } from "@/navigation";

type Nav = NativeStackNavigationProp<RootStackParams>;

const STATUS_COLOR: Record<string, string> = {
  moving: "#10B981", idle: "#F59E0B", offline: "#EF4444", alert: "#F97316",
};

// ── Static HTML loaded once — never rebuilt ───────────────────────────────────
const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html,body,#map { width:100%;height:100%; background:#e8e8e8; }
    .leaflet-popup-content-wrapper { border-radius:12px; padding:0; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.4); }
    .leaflet-popup-content { margin:0; }
    .leaflet-popup-tip-container { display:none; }
    .pulse { animation: pulse 1.6s ease-in-out infinite; }
    @keyframes pulse {
      0%,100% { transform: scale(1);   opacity:1; }
      50%      { transform: scale(1.5); opacity:0.5; }
    }
    .trail-pulse { animation: tpulse 2s ease-in-out infinite; }
    @keyframes tpulse {
      0%,100% { opacity:0.8; }
      50%      { opacity:0.3; }
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
// ── Map init ──────────────────────────────────────────────────────────────────
var map = L.map('map', { zoomControl:true, attributionControl:false })
           .setView([9.082, 8.675], 6);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  maxZoom: 19, subdomains: 'abcd'
}).addTo(map);

// ── Fleet state ───────────────────────────────────────────────────────────────
var state = {};   // truckId -> { marker, pulse, lat, lng, bearing, raf }

// ── Follow state ──────────────────────────────────────────────────────────────
var follow = {
  active:    false,
  truckId:   null,
  shadow:    null,   // white glow — bottom layer
  outline:   null,   // dark border — middle layer
  polyline:  null,   // vivid blue fill — top layer
  startDot:  null,
  headDot:   null,
  positions: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
var COLORS = { moving:'#10B981', idle:'#F59E0B', offline:'#EF4444', alert:'#F97316' };

function color(status) { return COLORS[status] || '#6B7280'; }

function bearing(lat1, lng1, lat2, lng2) {
  var dL = (lng2 - lng1) * Math.PI / 180;
  var la = lat1 * Math.PI / 180, lb = lat2 * Math.PI / 180;
  var x = Math.sin(dL) * Math.cos(lb);
  var y = Math.cos(la) * Math.sin(lb) - Math.sin(la) * Math.cos(lb) * Math.cos(dL);
  return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360;
}

function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
function lerp(a, b, t) { return a + (b - a) * t; }

function haversineKm(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
          Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
          Math.sin(dLng/2)*Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function makeIcon(status, deg, isMoving) {
  var c  = color(status);
  var bg = isMoving
    ? '<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:20px solid ' + c + ';filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))"></div>'
    : '<div style="width:13px;height:13px;border-radius:50%;background:' + c + ';border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>';
  return L.divIcon({
    className:'',
    html: '<div style="transform:rotate(' + deg + 'deg);display:flex;align-items:center;justify-content:center;width:20px;height:20px">' + bg + '</div>',
    iconSize:[20,20], iconAnchor:[10,10]
  });
}

function makeNavIcon(status, deg) {
  var c = color(status);
  return L.divIcon({
    className:'',
    html: '<div style="transform:rotate(' + deg + 'deg);display:flex;align-items:center;justify-content:center;width:32px;height:32px">' +
      '<div style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:28px solid ' + c + ';filter:drop-shadow(0 3px 6px rgba(0,0,0,.8))"></div>' +
      '</div>',
    iconSize:[32,32], iconAnchor:[16,16]
  });
}

function buildPopup(t) {
  return '<div style="font-family:sans-serif;background:#fff;color:#111;padding:12px 14px;min-width:160px">' +
    '<div style="font-weight:800;font-size:14px;margin-bottom:4px">' + t.name + '</div>' +
    '<div style="color:#6B7280;font-size:12px;margin-bottom:6px">' + t.plate + ' &middot; ' + t.status + '</div>' +
    '<div style="font-size:12px;margin-bottom:6px">&#9981; ' + t.fuel + '%&nbsp;&nbsp;&#128640; ' + t.speed + ' km/h</div>' +
    '<a href="#" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'follow\\',id:\\''+t.id+'\\'}));return false;" ' +
    'style="display:block;text-align:center;background:#1558D6;color:#fff;font-weight:700;font-size:12px;padding:6px 0;border-radius:8px;text-decoration:none;margin-bottom:6px">&#9660; Follow Route</a>' +
    '<a href="#" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'detail\\',id:\\''+t.id+'\\'}));return false;" ' +
    'style="display:block;text-align:center;background:#F3F4F6;color:#374151;font-weight:600;font-size:12px;padding:6px 0;border-radius:8px;text-decoration:none">View Details ›</a>' +
    '</div>';
}

// ── Smooth animation ──────────────────────────────────────────────────────────
function animateTo(id, toLat, toLng, durationMs) {
  var s = state[id];
  if (!s) return;
  if (s.raf) cancelAnimationFrame(s.raf);
  var fromLat = s.lat, fromLng = s.lng;
  if (Math.abs(toLat - fromLat) < 0.00001 && Math.abs(toLng - fromLng) < 0.00001) return;
  var start = null;
  function step(ts) {
    if (!start) start = ts;
    var t = ease(Math.min((ts - start) / durationMs, 1));
    var lat = lerp(fromLat, toLat, t);
    var lng = lerp(fromLng, toLng, t);
    s.marker.setLatLng([lat, lng]);
    if (t < 1) {
      s.raf = requestAnimationFrame(step);
    } else {
      s.lat = toLat; s.lng = toLng; s.raf = null;
    }
  }
  s.raf = requestAnimationFrame(step);
}

// ── Fleet update (normal mode) ────────────────────────────────────────────────
window.updateTrucks = function(trucks) {
  trucks.forEach(function(t) {
    if (!t.lat || !t.lng) return;
    var c = color(t.status);
    var isMoving = t.status === 'moving' && t.speed > 2;

    if (state[t.id]) {
      var s = state[t.id];
      var newBearing = isMoving
        ? bearing(s.lat, s.lng, t.lat, t.lng)
        : s.bearing;
      if (Math.abs(t.lat - s.lat) > 0.0001 || Math.abs(t.lng - s.lng) > 0.0001) {
        s.bearing = newBearing;
      }
      s.marker.setIcon(makeIcon(t.status, s.bearing, isMoving));
      s.marker.getPopup().setContent(buildPopup(t));
      animateTo(t.id, t.lat, t.lng, 1800);
    } else {
      var m = L.marker([t.lat, t.lng], { icon: makeIcon(t.status, 0, isMoving) })
        .addTo(map)
        .bindPopup(buildPopup(t), { closeButton:false, maxWidth:200 })
        .on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type:'tap', id:t.id }));
        });
      state[t.id] = {
        marker: m,
        lat: t.lat, lng: t.lng, bearing: 0, raf: null,
      };
    }
  });
};

// ── Draw the Google-Maps-style triple-layer route line ───────────────────────
function drawRoute(latlngs) {
  if (follow.shadow)   { map.removeLayer(follow.shadow);   }
  if (follow.outline)  { map.removeLayer(follow.outline);  }
  if (follow.polyline) { map.removeLayer(follow.polyline); }
  if (follow.startDot) { map.removeLayer(follow.startDot); }
  if (follow.headDot)  { map.removeLayer(follow.headDot);  }

  // Layer 1 — soft white glow (gives the "raised road" depth)
  follow.shadow = L.polyline(latlngs, {
    color: '#ffffff', weight: 22, opacity: 0.18,
    lineCap: 'round', lineJoin: 'round'
  }).addTo(map);

  // Layer 2 — dark border
  follow.outline = L.polyline(latlngs, {
    color: '#0D3080', weight: 16, opacity: 1,
    lineCap: 'round', lineJoin: 'round'
  }).addTo(map);

  // Layer 3 — vivid blue fill (exact Google Maps nav colour)
  follow.polyline = L.polyline(latlngs, {
    color: '#1558D6', weight: 11, opacity: 1,
    lineCap: 'round', lineJoin: 'round'
  }).addTo(map);

  // Origin dot — solid blue circle with white ring
  follow.startDot = L.circleMarker(latlngs[0], {
    radius: 9, fillColor: '#1558D6', color: '#fff',
    weight: 3, fillOpacity: 1, opacity: 1
  }).addTo(map);

  // Head dot — white filled circle with thick blue ring at current position
  var last = latlngs[latlngs.length - 1];
  follow.headDot = L.circleMarker(last, {
    radius: 12, fillColor: '#fff', color: '#1558D6',
    weight: 4, fillOpacity: 1, opacity: 1
  }).addTo(map);
}

// ── Follow mode: start ────────────────────────────────────────────────────────
window.startFollowing = function(truck, positions) {
  follow.active    = true;
  follow.truckId   = truck.id;
  follow.positions = positions;

  if (!positions || positions.length === 0) {
    if (state[truck.id]) {
      map.flyTo([state[truck.id].lat, state[truck.id].lng], 15, { duration:1.5 });
    }
    return;
  }

  var latlngs = positions.map(function(p) { return [p.lat, p.lng]; });
  drawRoute(latlngs);

  // Upgrade truck marker to large nav arrow
  var s = state[truck.id];
  if (s && latlngs.length > 1) {
    var nb = bearing(
      latlngs[latlngs.length-2][0], latlngs[latlngs.length-2][1],
      latlngs[latlngs.length-1][0], latlngs[latlngs.length-1][1]
    );
    s.bearing = nb;
    s.marker.setIcon(makeNavIcon(truck.status, nb));
  }

  var last = latlngs[latlngs.length - 1];
  map.flyTo(last, 15, { duration: 1.8, easeLinearity: 0.2 });
};

// ── Follow mode: extend trail with new positions ──────────────────────────────
window.updateFollow = function(truck, positions) {
  if (!follow.active || follow.truckId !== truck.id) return;
  follow.positions = positions;
  if (!positions || positions.length === 0) return;

  var latlngs = positions.map(function(p) { return [p.lat, p.lng]; });

  // Update all three layers + end dots
  if (follow.shadow)   follow.shadow.setLatLngs(latlngs);
  if (follow.outline)  follow.outline.setLatLngs(latlngs);
  if (follow.polyline) follow.polyline.setLatLngs(latlngs);
  if (follow.headDot)  follow.headDot.setLatLng(latlngs[latlngs.length - 1]);

  // Update nav arrow bearing
  var s = state[truck.id];
  if (s && latlngs.length > 1) {
    var nb = bearing(
      latlngs[latlngs.length-2][0], latlngs[latlngs.length-2][1],
      latlngs[latlngs.length-1][0], latlngs[latlngs.length-1][1]
    );
    s.bearing = nb;
    s.marker.setIcon(makeNavIcon(truck.status, nb));
  }

  var last = latlngs[latlngs.length - 1];
  map.panTo(last, { animate: true, duration: 1.2 });
};

// ── Follow mode: stop ─────────────────────────────────────────────────────────
window.stopFollowing = function() {
  if (follow.shadow)   { map.removeLayer(follow.shadow);   follow.shadow   = null; }
  if (follow.outline)  { map.removeLayer(follow.outline);  follow.outline  = null; }
  if (follow.polyline) { map.removeLayer(follow.polyline); follow.polyline = null; }
  if (follow.startDot) { map.removeLayer(follow.startDot); follow.startDot = null; }
  if (follow.headDot)  { map.removeLayer(follow.headDot);  follow.headDot  = null; }

  if (follow.truckId && state[follow.truckId]) {
    var s = state[follow.truckId];
    s.marker.setIcon(makeIcon('moving', s.bearing, true));
  }

  follow.active    = false;
  follow.truckId   = null;
  follow.positions = [];

  map.flyTo([9.082, 8.675], 6, { duration: 1.5 });
};

// ── Focus a single truck without entering follow mode ─────────────────────────
window.focusTruck = function(lat, lng) {
  map.flyTo([lat, lng], 14, { duration: 1.2, easeLinearity: 0.3 });
};
</script>
</body>
</html>`;

// ── Component ─────────────────────────────────────────────────────────────────
export function MapScreen() {
  const nav = useNavigation<Nav>();

  const [trucks,      setTrucks]      = useState<Truck[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [selected,    setSelected]    = useState<string | null>(null);
  const [followMode,  setFollowMode]  = useState(false);
  const [followTruck, setFollowTruck] = useState<Truck | null>(null);
  const [positions,   setPositions]   = useState<Position[]>([]);

  const webRef     = useRef<WebView>(null);
  const webReady   = useRef(false);
  const pendingRef = useRef<Truck[] | null>(null);

  // Total distance of the current route trail
  const routeKm = React.useMemo(() => {
    if (positions.length < 2) return 0;
    let d = 0;
    for (let i = 1; i < positions.length; i++) {
      const a = positions[i - 1], b = positions[i];
      const R = 6371;
      const dLat = (b.lat - a.lat) * Math.PI / 180;
      const dLng = (b.lng - a.lng) * Math.PI / 180;
      const aa = Math.sin(dLat / 2) ** 2 +
        Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      d += R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    }
    return d;
  }, [positions]);

  const inject = useCallback((js: string) => {
    if (webRef.current && webReady.current) {
      webRef.current.injectJavaScript(js + "; true;");
    }
  }, []);

  const injectTrucks = useCallback((data: Truck[]) => {
    if (!webRef.current || !webReady.current) {
      pendingRef.current = data;
      return;
    }
    inject(`window.updateTrucks(${JSON.stringify(data)})`);
  }, [inject]);

  // Fetch OSRM road route from trip origin to current truck position
  const fetchRoadRoute = useCallback(async (truck: Truck): Promise<Array<{ lat: number; lng: number }>> => {
    try {
      // Get GPS history to find trip origin
      const pos = await fetchTruckPositions(truck.id);
      if (pos.length < 1) return [];
      const origin = pos[0];
      const dest   = { lat: truck.lat, lng: truck.lng };
      // Route from trip start → current position along real roads
      const res = await fetch(
        `${API_BASE}/api/route?oLat=${origin.lat}&oLng=${origin.lng}&dLat=${dest.lat}&dLng=${dest.lng}`
      );
      const j = await res.json();
      return j.path ?? [{ lat: origin.lat, lng: origin.lng }, dest];
    } catch {
      return [];
    }
  }, []);

  // Start follow mode: fetch road route then draw
  const startFollow = useCallback(async (truck: Truck) => {
    setFollowMode(true);
    setFollowTruck(truck);
    setSelected(truck.id);
    try {
      const pos = await fetchTruckPositions(truck.id);
      setPositions(pos);
      const path = await fetchRoadRoute(truck);
      inject(`window.startFollowing(${JSON.stringify(truck)}, ${JSON.stringify(path)})`);
    } catch {
      inject(`window.startFollowing(${JSON.stringify(truck)}, [])`);
    }
  }, [inject, fetchRoadRoute]);

  // Refresh route while following
  const refreshFollow = useCallback(async () => {
    if (!followTruck) return;
    try {
      const latest = trucks.find((t) => t.id === followTruck.id) ?? followTruck;
      const pos    = await fetchTruckPositions(followTruck.id);
      setPositions(pos);
      const path = await fetchRoadRoute(latest);
      inject(`window.updateFollow(${JSON.stringify(latest)}, ${JSON.stringify(path)})`);
    } catch { /* silent */ }
  }, [followTruck, trucks, inject, fetchRoadRoute]);

  const stopFollow = useCallback(() => {
    setFollowMode(false);
    setFollowTruck(null);
    setPositions([]);
    inject("window.stopFollowing()");
  }, [inject]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchTrucks();
      setTrucks(data);
      injectTrucks(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [injectTrucks]);

  // Fleet refresh every 10s
  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  // Follow-mode position refresh every 5s
  useEffect(() => {
    if (!followMode) return;
    const id = setInterval(refreshFollow, 5_000);
    return () => clearInterval(id);
  }, [followMode, refreshFollow]);

  const onWebViewLoad = useCallback(() => {
    webReady.current = true;
    if (pendingRef.current) {
      injectTrucks(pendingRef.current);
      pendingRef.current = null;
    }
  }, [injectTrucks]);

  const focusTruck = (truck: Truck) => {
    setSelected(truck.id);
    if (truck.lat && truck.lng) {
      inject(`window.focusTruck(${truck.lat}, ${truck.lng})`);
    }
  };

  const onMapMessage = useCallback((e: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as { type: string; id: string };
      const truck = trucks.find((x) => x.id === msg.id);
      if (!truck) return;
      if (msg.type === "follow") {
        startFollow(truck);
      } else if (msg.type === "detail") {
        nav.navigate("TruckDetail", { truckId: truck.id });
      } else if (msg.type === "tap") {
        focusTruck(truck);
        setSelected(truck.id);
      }
    } catch {
      // legacy plain-string message
      const truck = trucks.find((x) => x.id === e.nativeEvent.data);
      if (truck) focusTruck(truck);
    }
  }, [trucks, startFollow, nav]);

  const selectedTruck = trucks.find((t) => t.id === selected);
  const currentSpeed = followTruck
    ? (trucks.find((t) => t.id === followTruck.id)?.speed ?? followTruck.speed)
    : 0;

  return (
    <View style={styles.root}>
      {loading && (
        <View style={[styles.overlay, StyleSheet.absoluteFillObject]}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadText}>Loading fleet positions…</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠ {error}</Text>
          <TouchableOpacity onPress={load}><Text style={styles.errorRetry}>Retry</Text></TouchableOpacity>
        </View>
      )}

      <WebView
        ref={webRef}
        style={styles.map}
        source={{ html: MAP_HTML }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        onLoad={onWebViewLoad}
        onMessage={onMapMessage}
      />

      {/* Follow-mode navigation overlay */}
      {followMode && followTruck ? (
        <View style={styles.navBar}>
          <View style={styles.navInfo}>
            <Text style={styles.navName}>{followTruck.name}</Text>
            <View style={styles.navStats}>
              <View style={styles.navStat}>
                <Text style={styles.navStatVal}>{currentSpeed}</Text>
                <Text style={styles.navStatLbl}>km/h</Text>
              </View>
              <View style={styles.navDivider} />
              <View style={styles.navStat}>
                <Text style={styles.navStatVal}>{routeKm.toFixed(1)}</Text>
                <Text style={styles.navStatLbl}>km trail</Text>
              </View>
              <View style={styles.navDivider} />
              <View style={styles.navStat}>
                <Text style={styles.navStatVal}>{positions.length}</Text>
                <Text style={styles.navStatLbl}>pings</Text>
              </View>
            </View>
          </View>
          <View style={styles.navActions}>
            <TouchableOpacity
              style={styles.navDetailBtn}
              onPress={() => nav.navigate("TruckDetail", { truckId: followTruck.id })}
            >
              <Text style={styles.navDetailBtnText}>Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navExitBtn} onPress={stopFollow}>
              <Text style={styles.navExitBtnText}>✕ Exit</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Fleet chip strip (normal mode) */
        <View style={styles.strip}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripContent}
          >
            {trucks.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, selected === t.id && styles.chipActive]}
                onPress={() => focusTruck(t)}
              >
                <View style={[styles.chipDot, { backgroundColor: STATUS_COLOR[t.status] ?? "#6B7280" }]} />
                <Text style={styles.chipText} numberOfLines={1}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedTruck && !followMode && (
            <View style={styles.detail}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{selectedTruck.name}</Text>
                <Text style={styles.detailSub}>
                  {selectedTruck.driver || "—"} · {selectedTruck.fuel}% fuel
                  {selectedTruck.speed > 0 ? ` · ${selectedTruck.speed} km/h` : ""}
                </Text>
              </View>
              <TouchableOpacity style={styles.followBtn} onPress={() => startFollow(selectedTruck)}>
                <Text style={styles.followBtnText}>▶ Follow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => nav.navigate("TruckDetail", { truckId: selectedTruck.id })}
              >
                <Text style={styles.detailBtnText}>Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: "#111827" },
  map:             { flex: 1, backgroundColor: "#111827" },
  overlay:         { zIndex: 10, justifyContent: "center", alignItems: "center", backgroundColor: "#111827", gap: 12 },
  loadText:        { color: "#9CA3AF", fontSize: 13 },
  errorBanner:     { position: "absolute", top: 10, left: 16, right: 16, zIndex: 20, backgroundColor: "#450a0a", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#FCA5A5", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  errorText:       { color: "#FCA5A5", fontSize: 12 },
  errorRetry:      { color: "#F97316", fontWeight: "700", fontSize: 12 },

  // Normal strip
  strip:           { backgroundColor: "#1F2937", borderTopWidth: 1, borderTopColor: "#374151", paddingBottom: 8 },
  stripContent:    { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip:            { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#374151", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: "#4B5563", maxWidth: 130 },
  chipActive:      { borderColor: "#F97316", backgroundColor: "#431407" },
  chipDot:         { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  chipText:        { color: "#fff", fontSize: 12, fontWeight: "600" },
  detail:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  detailName:      { color: "#fff", fontWeight: "700", fontSize: 14 },
  detailSub:       { color: "#9CA3AF", fontSize: 12, marginTop: 1 },
  followBtn:       { backgroundColor: "#10B981", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  followBtnText:   { color: "#fff", fontWeight: "700", fontSize: 12 },
  detailBtn:       { backgroundColor: "#374151", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  detailBtnText:   { color: "#fff", fontWeight: "600", fontSize: 12 },

  // Navigation bar (follow mode)
  navBar:          { backgroundColor: "#111827", borderTopWidth: 1, borderTopColor: "#F97316", padding: 12 },
  navInfo:         { marginBottom: 10 },
  navName:         { color: "#F97316", fontWeight: "800", fontSize: 16, marginBottom: 8 },
  navStats:        { flexDirection: "row", alignItems: "center" },
  navStat:         { alignItems: "center", flex: 1 },
  navStatVal:      { color: "#fff", fontSize: 20, fontWeight: "700" },
  navStatLbl:      { color: "#6B7280", fontSize: 11, marginTop: 1 },
  navDivider:      { width: 1, height: 32, backgroundColor: "#374151" },
  navActions:      { flexDirection: "row", gap: 10 },
  navDetailBtn:    { flex: 1, backgroundColor: "#374151", borderRadius: 8, padding: 10, alignItems: "center" },
  navDetailBtnText:{ color: "#fff", fontWeight: "600", fontSize: 13 },
  navExitBtn:      { flex: 1, backgroundColor: "#7F1D1D", borderRadius: 8, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#EF4444" },
  navExitBtnText:  { color: "#FCA5A5", fontWeight: "700", fontSize: 13 },
});
