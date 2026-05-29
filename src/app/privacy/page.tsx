export const metadata = {
  title: "Privacy Policy — TrackIQ",
  description: "TrackIQ privacy policy for fleet tracking application.",
};

export default function PrivacyPage() {
  const updated = "29 May 2026";
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", color: "#1a1a1a", lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Last updated: {updated}</p>

      <p>TrackIQ ("we", "our", or "us") operates the TrackIQ mobile application and web platform (the "Service"). This policy explains how we collect, use, and protect your information.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>1. Information We Collect</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li><strong>Location data:</strong> GPS coordinates are collected while the app is in use to track vehicle positions for fleet management purposes.</li>
        <li><strong>Account information:</strong> Email address and name provided at registration.</li>
        <li><strong>Vehicle telemetry:</strong> Speed, fuel level, and odometer data transmitted by connected vehicle trackers.</li>
        <li><strong>Usage data:</strong> App interaction logs used to improve the service.</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>2. How We Use Your Information</h2>
      <ul style={{ paddingLeft: 20 }}>
        <li>To provide real-time fleet tracking and management features.</li>
        <li>To generate trip history, fuel reports, and performance analytics.</li>
        <li>To send operational alerts (low fuel, geofence breaches, maintenance reminders).</li>
        <li>To improve and maintain the Service.</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>3. Location Data</h2>
      <p>Location data is collected only for users who are assigned as drivers with an active tracking session. Location is used exclusively for fleet management and is never sold to third parties. You may disable location tracking at any time through the app settings.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>4. Data Storage and Security</h2>
      <p>All data is stored securely using Supabase (PostgreSQL) with row-level security. Data is transmitted over HTTPS/TLS. We retain vehicle position data for 12 months. Account data is retained until account deletion.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>5. Data Sharing</h2>
      <p>We do not sell your data. Data is shared only with:</p>
      <ul style={{ paddingLeft: 20 }}>
        <li><strong>Your organisation:</strong> Fleet managers and dispatchers within your company.</li>
        <li><strong>Service providers:</strong> Supabase (database), Vercel (hosting), Expo (mobile delivery) — all under data processing agreements.</li>
      </ul>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>6. Your Rights</h2>
      <p>You have the right to access, correct, or delete your personal data. To exercise these rights, contact us at the email below. Account deletion removes all personal data within 30 days.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>7. Children</h2>
      <p>TrackIQ is intended for professional fleet operators. We do not knowingly collect data from persons under 18.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>8. Changes to This Policy</h2>
      <p>We may update this policy periodically. The "Last updated" date at the top reflects the most recent revision. Continued use of the Service after changes constitutes acceptance.</p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>9. Contact</h2>
      <p>For privacy questions or data requests:</p>
      <p style={{ marginTop: 8 }}>
        <strong>TrackIQ by Excellite</strong><br />
        Email: <a href="mailto:emmanuelokpanachi1@gmail.com" style={{ color: "#f97316" }}>emmanuelokpanachi1@gmail.com</a><br />
        Web: <a href="https://trackiq-five.vercel.app" style={{ color: "#f97316" }}>trackiq-five.vercel.app</a>
      </p>
    </main>
  );
}
