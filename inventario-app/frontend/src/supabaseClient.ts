// frontend/src/supabaseClient.ts

import { createClient } from "@supabase/supabase-js";

// ✅ Leer las variables de entorno de forma segura
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string; 

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Las variables de entorno de Supabase no están definidas. Revisa tu archivo .env y vite-env.d.ts."
    );
}

export const supabase = createClient(supabaseUrl, supabaseKey);