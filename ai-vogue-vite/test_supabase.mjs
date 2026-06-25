import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log("Key Prefix:", supabaseAnonKey ? supabaseAnonKey.slice(0, 15) : "undefined");

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    const { data, error } = await supabase.from("garments").select("id").limit(1);
    if (error) {
      console.error("Supabase query error:", error);
    } else {
      console.log("Supabase query success, data:", data);
    }
  } catch (err) {
    console.error("Connection failed:", err);
  }
}
check();
