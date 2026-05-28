"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dashboard } from "@/components/pages/Dashboard";
import { supabase } from "@/lib/supabase";

interface User {
  name: string;
  email: string;
  role: string;
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email,   setEmail]   = useState("admin@trackiq.ng");
  const [pass,    setPass]    = useState("password");
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !pass) { setErr("Enter your email and password."); return; }
    setLoading(true);
    setErr("");

    // Try real Supabase Auth first
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (!error && data.user) {
      onLogin({
        name:  data.user.user_metadata?.name ?? email.split("@")[0],
        email: data.user.email ?? email,
        role:  data.user.user_metadata?.role ?? "Admin",
      });
      return;
    }

    // Demo fallback — works without a Supabase Auth user
    if (pass === "password") {
      onLogin({ name: "Operations Manager", email, role: "Admin" });
      return;
    }

    setErr(error?.message ?? "Invalid credentials.");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[420px] bg-[#1F2937] border-r border-[#374151] flex-col items-center justify-center p-12 gap-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">🚛</div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">TrackIQ</h1>
          <p className="text-sm text-gray-400 mt-2 tracking-wide">Fleet Intelligence Platform</p>
        </div>
        <div className="space-y-4 w-full max-w-xs">
          {[
            { icon: "📍", title: "Real-Time GPS", desc: "Track every truck across Nigeria live" },
            { icon: "⛽", title: "Fuel Monitoring", desc: "Live tank levels and consumption alerts" },
            { icon: "🛣️", title: "Trip History",   desc: "Auto-detected routes with replay" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3 bg-[#111827] rounded-xl p-4">
              <span className="text-xl">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--bg)]">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden text-center">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3">🚛</div>
            <h1 className="text-2xl font-bold text-[var(--text)]">TrackIQ</h1>
          </div>

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-8">
            <h2 className="text-xl font-bold text-[var(--text)] mb-1">Sign in</h2>
            <p className="text-sm text-[var(--subtle)] mb-6">Enter your credentials to continue</p>

            <div className="space-y-4">
              {[
                { label: "Email Address", val: email, set: setEmail, type: "email",    ph: "admin@trackiq.ng" },
                { label: "Password",      val: pass,  set: setPass,  type: "password", ph: "••••••••" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">{f.label}</label>
                  <input
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    type={f.type}
                    placeholder={f.ph}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text)] placeholder-[var(--subtle)] outline-none focus:border-orange-400 focus:bg-[var(--surface)] transition-colors"
                  />
                </div>
              ))}

              {err && <p className="text-red-500 text-xs">⚠ {err}</p>}

              <Button
                onClick={submit}
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm py-5 mt-2"
              >
                {loading ? "Authenticating…" : "Sign In"}
              </Button>
            </div>

            <p className="text-center text-xs text-[var(--subtle)] mt-5">
              Demo — any email, password:{" "}
              <span className="text-orange-500 font-mono">password</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user,     setUser]     = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Restore existing session on page load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user;
        setUser({
          name:  u.user_metadata?.name ?? u.email?.split("@")[0] ?? "User",
          email: u.email ?? "",
          role:  u.user_metadata?.role ?? "Admin",
        });
      }
      setChecking(false);
    });

    // Keep session state in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return user ? (
    <Dashboard user={user} onLogout={handleLogout} />
  ) : (
    <Login onLogin={setUser} />
  );
}
