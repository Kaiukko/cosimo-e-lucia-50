import { supabase } from "./supabaseClient";
import config from "./config";

/** Carica un singolo file nello Storage e restituisce l'URL pubblico */
export async function uploadFile(file, onProgress) {
  const ext  = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Controlla dimensione
  if (file.size > config.maxFileSizeMB * 1024 * 1024) {
    throw new Error(`Il file supera il limite di ${config.maxFileSizeMB}MB`);
  }

  const { error } = await supabase.storage
    .from("event-media")
    .upload(path, file);

  if (error) throw error;
  if (onProgress) onProgress(100);

  const { data } = supabase.storage.from("event-media").getPublicUrl(path);
  return data.publicUrl;
}

/** Carica più file in parallelo, con callback di progresso per ciascuno */
export async function uploadFiles(files, onFileProgress) {
  const results = await Promise.allSettled(
    files.map((file, i) =>
      uploadFile(file, (pct) => onFileProgress?.(i, pct))
    )
  );

  const urls   = [];
  const errors = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled") urls.push({ file: files[i], url: r.value });
    else errors.push({ file: files[i], error: r.reason?.message || "Errore" });
  });

  return { urls, errors };
}

/** Salva un post nel database */
export async function savePost(post) {
  const { data, error } = await supabase
    .from("posts")
    .insert(post)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Salva più post in una sola chiamata */
export async function savePosts(posts) {
  const { data, error } = await supabase
    .from("posts")
    .insert(posts)
    .select();
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

/** Aggiorna il contatore like */
export async function updateLikes(id, likes) {
  const { error } = await supabase
    .from("posts")
    .update({ likes })
    .eq("id", id);
  if (error) console.error("Errore like:", error);
}
