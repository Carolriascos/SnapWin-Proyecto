import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan variables de entorno: SUPABASE_URL y SUPABASE_ANON_KEY");
}

export const SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
