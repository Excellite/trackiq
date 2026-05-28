import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { supabase } from "@/lib/supabase";
import { LoginScreen } from "@/screens/LoginScreen";
import { AppNavigator } from "@/navigation";

interface User { name: string; email: string; role: string }

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Restore an existing session in the background — non-blocking
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          const u = session.user;
          setUser({
            name:  (u.user_metadata?.name as string) ?? u.email?.split("@")[0] ?? "User",
            email: u.email ?? "",
            role:  (u.user_metadata?.role as string) ?? "Admin",
          });
        }
      })
      .catch(() => { /* no stored session — stay on login */ });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // No loading gate — show login immediately, switch to app once user is set
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {user ? <AppNavigator /> : <LoginScreen onLogin={setUser} />}
    </SafeAreaProvider>
  );
}
