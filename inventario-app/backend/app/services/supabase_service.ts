import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
if (!supabase) {
    supabase = createClient(
        process.env.REACT_APP_SUPABASE_URL!,
        process.env.REACT_APP_SUPABASE_ANON_KEY!
        );
    }
    return supabase;
}
