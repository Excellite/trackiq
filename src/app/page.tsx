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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Card className="bg-slate-800/80 border-slate-700/50 shadow-2xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3">🚛</div>
              <h1 className="text-2xl font-extrabold tracking-wide text-white">TrackIQ</h1>
              <p className="text-xs text-slate-400 mt-1">Fleet Intelligence Platform · Nigeria</p>
            </div>

            <div className="space-y-4">
              {[
                { label: "Email Address", val: email, set: setEmail, type: "email",    ph: "admin@trackiq.ng" },
                { label: "Password",      val: pass,  set: setPass,  type: "password", ph: "••••••••" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs text-slate-400 mb-1.5">{f.label}</label>
                  <input
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    type={f.type}
                    placeholder={f.ph}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/60 transition-colors"
                  />
                </div>
              ))}

              {err && <p className="text-red-400 text-xs">⚠ {err}</p>}

              <Button
                onClick={submit}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm py-5 mt-2"
              >
                {loading ? "Authenticating…" : "Sign In →"}
              </Button>
            </div>

            <p className="text-center text-xs text-slate-600 mt-6">
              Demo · any email · password:{" "}
              <span className="text-amber-500/80 font-mono">password</span>
            </p>
          </CardContent>
        </Card>
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
