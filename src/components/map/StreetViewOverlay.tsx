"use client";

import { useEffect, useRef, useState } from "react";

export function StreetViewOverlay({
  lat,
  lng,
  label,
  onClose,
}: {
  lat: number;
  lng: number;
  label: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "unavailable">("loading");

  useEffect(() => {
    if (!containerRef.current) return;
    const pos = { lat, lng };
    const sv = new google.maps.StreetViewService();

    sv.getPanorama({ location: pos, radius: 150 }, (data, st) => {
      if (st !== google.maps.StreetViewStatus.OK || !containerRef.current) {
        setStatus("unavailable");
        return;
      }
      setStatus("ok");
      new google.maps.StreetViewPanorama(containerRef.current, {
        position: data?.location?.latLng ?? pos,
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        addressControl: true,
        fullscreenControl: false,
        motionTracking: false,
        motionTrackingControl: false,
        enableCloseButton: false,
        panControl: true,
        zoomControl: true,
        // Force light colour scheme regardless of system dark mode
        colorScheme: google.maps.ColorScheme.LIGHT,
      } as google.maps.StreetViewPanoramaOptions);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.85)" }}>
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>Street View</span>
          <span className="text-xs font-semibold text-blue-400 truncate">{label}</span>
          <span className="text-[10px] font-mono hidden sm:block" style={{ color: "var(--subtle)" }}>
            {lat.toFixed(5)}°N &nbsp;{lng.toFixed(5)}°E
          </span>
        </div>
        <button
          onClick={onClose}
          className="ml-4 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Close Street View"
        >
          ✕
        </button>
      </div>

      {/* Panorama area */}
      <div className="flex-1 relative">
        {/* Loading spinner */}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* No coverage */}
        {status === "unavailable" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
            <div className="text-5xl">🗺️</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                No Street View imagery here
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--subtle)" }}>
                Google hasn&apos;t captured this location yet.<br />
                ({lat.toFixed(4)}°N, {lng.toFixed(4)}°E)
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:bg-orange-400 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Panorama div — isolation prevents dark-mode CSS filters bleeding in */}
        <div
          ref={containerRef}
          className="absolute inset-0"
          style={{
            display: status === "unavailable" ? "none" : "block",
            colorScheme: "light",
            isolation: "isolate",
          }}
        />
      </div>
    </div>
  );
}
