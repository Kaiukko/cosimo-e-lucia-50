# 🎉 Event Gallery

Galleria foto e video condivisa per eventi — gli ospiti caricano media in tempo reale.

**Stack:** React · Supabase (Storage + Database + Realtime) · Vercel

---

## Personalizzazione rapida

Apri **`src/config.js`** e modifica:

```js
eventName:     "Cosimo & Lucia",      // nome mostrato ovunque
eventSubtitle: "14 Giugno 2025",      // data o sottotitolo
appUrl:        "https://...",         // URL Vercel — usato per il QR code

adminPassword: "cambiami123",         // ← CAMBIA QUESTA prima del deploy!

colors: {
  accent:     "#f0c040",   // colore bottoni e accenti
  background: "#0d0d0d",   // sfondo app
  card:       "#111111",   // sfondo card
  text:       "#f5f0e8",   // testo principale
  textMuted:  "#666666",   // testo secondario
},

maxFilesPerUpload: 10,
maxFileSizeMB:     50,
```

> **Consiglio sicurezza:** in produzione aggiungi la password come variabile d'ambiente su Vercel:
> `REACT_APP_ADMIN_PASSWORD=latuapassword`
> Il codice la legge automaticamente da lì.

---

## Setup Supabase

### 1. Crea progetto e bucket
**Storage → New bucket** → nome: `event-media` → **Public: ON**

### 2. SQL Editor — esegui tutto questo

```sql
-- Tabella post
create table posts (
  id uuid primary key default gen_random_uuid(),
  author text, avatar text, color text,
  type text, url text, caption text,
  likes int default 0,
  created_at timestamptz default now()
);
alter table posts enable row level security;
create policy "read"   on posts for select using (true);
create policy "insert" on posts for insert with check (true);
create policy "update" on posts for update using (true);
create policy "delete" on posts for delete using (true);

-- Policy Storage
create policy "Chiunque può caricare"
  on storage.objects for insert
  with check (bucket_id = 'event-media');

create policy "Chiunque può leggere"
  on storage.objects for select
  using (bucket_id = 'event-media');

create policy "Chiunque può eliminare"
  on storage.objects for delete
  using (bucket_id = 'event-media');
```

### 3. Crea il file .env

```bash
cp .env.example .env
```

```
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
REACT_APP_ADMIN_PASSWORD=latuapasswordsicura
```

---

## Avvio locale

```bash
npm install
npm start
```

---

## Deploy su Vercel

1. Carica su GitHub
2. Importa su [vercel.com](https://vercel.com)
3. Aggiungi le 3 variabili d'ambiente nel pannello Vercel
4. Deploy

Per aggiornamenti: `git push` → Vercel rideploya automaticamente.

---

## Struttura progetto

```
event-gallery/
├── src/
│   ├── config.js          ← PERSONALIZZA QUI
│   ├── App.js             ← UI completa (galleria + admin)
│   ├── api.js             ← upload, fetch, like, delete
│   ├── supabaseClient.js
│   ├── utils.js
│   └── index.js
├── public/index.html
├── capacitor.config.json
├── android-config/
├── .env.example
├── .gitignore
└── package.json
```

---

## Funzionalità

- 📸 Upload **multiplo** — fino a 10 foto/video, con anteprima e progresso per file
- ⚡ **Realtime** — foto degli altri ospiti appaiono in tempo reale
- ❤️ Like sui post
- 🔍 Lightbox foto a schermo intero
- ⬛ **QR code** con stampa in un click
- 🎨 **Tema personalizzabile** da `config.js`
- ⚙ **Pannello admin** protetto da password per eliminare foto e video
- ⊞ Vista griglia / feed
- 📱 Pronto per Android e iOS con Capacitor
