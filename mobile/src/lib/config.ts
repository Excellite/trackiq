// Point at your live Vercel deployment. Override with .env or EAS secrets.
export const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://trackiq-five.vercel.app";

export const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? "";
export const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON ?? "";

// Interval (ms) between GPS pings when the driver tracker is active
export const TRACKER_INTERVAL_MS = 30_000;
