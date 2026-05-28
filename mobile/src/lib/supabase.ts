import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SUPABASE_URL, SUPABASE_ANON } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:           AsyncStorage,
    autoRefreshToken:  false,   // don't block startup with a token refresh network call
    persistSession:    true,
    detectSessionInUrl:false,
  },
});
