// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURAZIONE EVENTO
//  Modifica questi valori per personalizzare la tua galleria
// ─────────────────────────────────────────────────────────────────────────────

const config = {
  // Nome dell'evento (mostrato nell'header e nel QR code)
  eventName: "Cosimo & Lucia 50 anni insieme!",

  // Sottotitolo (opzionale, lascia "" per nasconderlo)
  eventSubtitle: "07 Giugno 2026",

  // URL pubblico della tua app su Vercel (usato per generare il QR code)
  appUrl: "https://cosimo-e-lucia-50.vercel.app",

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  // Password per accedere al pannello di amministrazione.
  // Cambiala con qualcosa di sicuro prima del deploy!
  // In produzione puoi anche spostarla in .env come REACT_APP_ADMIN_PASSWORD
  adminPassword: process.env.REACT_APP_ADMIN_PASSWORD || "cambiami123",

  // Colori del tema
  colors: {
    accent:     "#f0c040",   // oro — cambia con es. "#e07090" per rosa
    background: "#0d0d0d",
    card:       "#111111",
    text:       "#f5f0e8",
    textMuted:  "#dfdfde",
  },

  // Numero massimo di file selezionabili in una volta
  maxFilesPerUpload: 10,

  // Dimensione massima per file in MB
  maxFileSizeMB: 50,
};

export default config;
