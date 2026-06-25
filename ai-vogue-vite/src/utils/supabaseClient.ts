import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("DEBUG: VITE_SUPABASE_URL =", supabaseUrl);
console.log("DEBUG: VITE_SUPABASE_ANON_KEY length =", supabaseAnonKey ? supabaseAnonKey.length : 0);

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
