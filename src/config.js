// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURAZIONE EVENTO
//  Modifica questi valori per personalizzare la tua galleria
// ─────────────────────────────────────────────────────────────────────────────

const config = {
  // Nome dell'evento (mostrato nell'header e nel QR code)
  eventName: "50° Anniversario<nbsp>Cosimo & Lucia",

  // Sottotitolo (opzionale, lascia "" per nasconderlo)
  eventSubtitle: "07 Giugno 2026",

  // URL pubblico della tua app su Vercel (usato per generare il QR code)
  // Es: "https://cosimo-e-lucia-50.vercel.app"
  appUrl: "https://cosimo-e-lucia-50.vercel.app",

  // Colori del tema
  colors: {
    // Colore principale (bottoni, accenti, badge)
    accent: "#f0c040",        // oro — cambia con es. "#e07090" per rosa

    // Sfondo app
    background: "#0d0d0d",   // quasi nero

    // Sfondo card
    card: "#111111",

    // Testo principale
    text: "#f5f0e8",          // bianco caldo

    // Testo secondario
    textMuted: "#666666",
  },

  // Numero massimo di file selezionabili in una volta
  maxFilesPerUpload: 10,

  // Dimensione massima per file in MB
  maxFileSizeMB: 50,
};

export default config;
