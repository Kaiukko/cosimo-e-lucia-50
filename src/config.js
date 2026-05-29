// ─────────────────────────────────────────────────────────────────────────────
//  CONFIGURAZIONE EVENTO
// ─────────────────────────────────────────────────────────────────────────────

const config = {
  eventName:     "Cosimo & Lucia",
  eventSubtitle: "50° Anniversario di Matrimonio",
  appUrl:        "https://cosimo-e-lucia-50.vercel.app",

  adminPassword: process.env.REACT_APP_ADMIN_PASSWORD || "cambiami123",

  // I colori del nuovo tema sono definiti direttamente in App.js
  // come palette C — modificali lì per personalizzare il look
  colors: {},

  maxFilesPerUpload: 10,
  maxFileSizeMB:     50,
};

export default config;
