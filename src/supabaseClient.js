import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey  = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "⚠️  Variabili Supabase mancanti.\n" +
    "Crea un file .env copiando .env.example e inserisci le tue credenziali."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
