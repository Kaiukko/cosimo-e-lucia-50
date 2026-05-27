import { supabase } from "./supabaseClient";

/** Carica un file nello Storage e restituisce l'URL pubblico */
export async function uploadFile(file) {
  const ext  = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("event-media")
    .upload(path, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("event-media").getPublicUrl(path);
  return data.publicUrl;
}

/** Salva i metadati del post nel database */
export async function savePost(post) {
  const { data, error } = await supabase
    .from("posts")
    .insert(post)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Recupera tutti i post, dal più recente */
export async function fetchPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Aggiorna il contatore like di un post */
export async function updateLikes(id, likes) {
  const { error } = await supabase
    .from("posts")
    .update({ likes })
    .eq("id", id);
  if (error) console.error("Errore aggiornamento like:", error);
}
