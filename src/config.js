// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURAZIONE EVENTO
// ─────────────────────────────────────────────────────────────────────────────

const config = {
  eventName:     "Cosimo & Lucia",
  eventSubtitle: "50° Anniversario di Matrimonio",
  appUrl:        "https://cosimo-e-lucia-50.vercel.app",

  adminPassword: process.env.REACT_APP_ADMIN_PASSWORD || "cambiami123",

  // Palette avorio, oro antico e seppia — lusso raffinato
  colors: {
    // Sfondi
    background:  "#faf7f2",   // avorio caldo
    surface:     "#fff9f2",   // pergamena
    card:        "#fffef9",   // bianco caldo

    // Testi
    text:        "#2c2416",   // seppia scuro
    textMuted:   "#7a6a52",   // seppia medio
    textLight:   "#b0a090",   // seppia chiaro

    // Oro
    accent:      "#b8965a",   // oro antico
    accentLight: "#d4b87a",   // oro chiaro
    accentPale:  "#f0e6cc",   // oro pallido

    // Bordi
    border:      "#ddd0b8",   // bordo dorato tenue
  },

  maxFilesPerUpload: 10,
  maxFileSizeMB:     50,
};

export default config;
