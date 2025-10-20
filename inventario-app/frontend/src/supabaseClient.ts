import { createClient } from "@supabase/supabase-js";

// ⚠️ OJO: Usa las credenciales que encuentras en Supabase
// (Settings → API → Project URL y anon/public key)
const supabaseUrl = "https://yhizsimwkdtssulpelsp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloaXpzaW13a2R0c3N1bHBlbHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODY3NzMsImV4cCI6MjA3MTc2Mjc3M30.MuXoe619VlJ4ytYVT5N9n9mQK6Wohnc_9be-wftlbO4";

export const supabase = createClient(supabaseUrl, supabaseKey);