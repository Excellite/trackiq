import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { supabase } from "@/lib/supabase";

interface Props {
  onLogin: (user: { name: string; email: string; role: string }) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [email,   setEmail]   = useState("admin@trackiq.ng");
  const [pass,    setPass]    = useState("");
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !pass) { setErr("Enter your email and password."); return; }
    setLoading(true); setErr("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });

    if (!error && data.user) {
      onLogin({
        name:  data.user.user_metadata?.name ?? email.split("@")[0],
        email: data.user.email ?? email,
        role:  data.user.user_metadata?.role ?? "Admin",
      });
      return;
    }

    // Demo fallback
    if (pass === "password") {
      onLogin({ name: "Operations Manager", email, role: "Admin" });
      return;
    }

    setErr(error?.message ?? "Invalid credentials.");
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <View style={styles.logo}>
          <Text style={styles.logoEmoji}>🚛</Text>
        </View>
        <Text style={styles.title}>TrackIQ</Text>
        <Text style={styles.sub}>Fleet Intelligence Platform</Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          value={pass}
          onChangeText={setPass}
          secureTextEntry
          onSubmitEditing={submit}
        />

        {!!err && <Text style={styles.err}>⚠ {err}</Text>}

        <TouchableOpacity style={styles.btn} onPress={submit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Sign In</Text>}
        </TouchableOpacity>

        <Text style={styles.hint}>
          Demo: any email, password <Text style={styles.mono}>password</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: "#111827", justifyContent: "center", padding: 24 },
  card:     { backgroundColor: "#1F2937", borderRadius: 20, padding: 28, gap: 12 },
  logo:     { width: 60, height: 60, backgroundColor: "#F97316", borderRadius: 16, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 4 },
  logoEmoji:{ fontSize: 30 },
  title:    { fontSize: 26, fontWeight: "800", color: "#fff", textAlign: "center" },
  sub:      { fontSize: 13, color: "#6B7280", textAlign: "center", marginBottom: 8 },
  input:    { backgroundColor: "#374151", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "#4B5563" },
  err:      { color: "#F87171", fontSize: 12 },
  btn:      { backgroundColor: "#F97316", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnText:  { color: "#fff", fontWeight: "700", fontSize: 15 },
  hint:     { color: "#6B7280", fontSize: 11, textAlign: "center", marginTop: 4 },
  mono:     { color: "#F97316", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
});
