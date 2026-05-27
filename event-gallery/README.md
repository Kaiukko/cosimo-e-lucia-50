# 🎉 Event Gallery

Galleria foto e video condivisa per eventi — gli ospiti caricano media in tempo reale.

**Stack:** React · Supabase (Storage + Database + Realtime) · Vercel

---

## Personalizzazione rapida

Apri **`src/config.js`** e modifica:

```js
eventName:     "Cosimo & Lucia",      // nome mostrato ovunque
eventSubtitle: "14 Giugno 2025",      // data o sottotitolo (lascia "" per nasconderlo)
appUrl:        "https://...",         // URL Vercel — usato per il QR code

colors: {
  accent:     "#f0c040",   // colore bottoni e accenti (oro di default)
  background: "#0d0d0d",   // sfondo app
  card:       "#111111",   // sfondo card
  text:       "#f5f0e8",   // testo principale
  textMuted:  "#666666",   // testo secondario
},

maxFilesPerUpload: 10,   // quante foto si possono caricare in una volta
maxFileSizeMB:     50,   // limite per singolo file
```

---

## Setup Supabase

### 1. Crea il progetto
Vai su [supabase.com](https://supabase.com), crea un account e un nuovo progetto.

### 2. Crea il bucket Storage
**Storage → New bucket** → nome: `event-media` → **Public: ON**

### 3. Esegui questo SQL (SQL Editor)

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

-- Policy Storage
create policy "Chiunque può caricare"
  on storage.objects for insert
  with check (bucket_id = 'event-media');

create policy "Chiunque può leggere"
  on storage.objects for select
  using (bucket_id = 'event-media');
```

### 4. Copia le credenziali
**Project Settings → API** → copia `Project URL` e `anon public key`.

### 5. Crea il file .env
```bash
cp .env.example .env
```
Incolla le credenziali:
```
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

---

## Avvio locale

```bash
npm install
npm start
```

---

## Deploy su Vercel

1. Carica il progetto su GitHub
2. Vai su [vercel.com](https://vercel.com) → **Add New Project** → importa il repo
3. Aggiungi le variabili d'ambiente nel pannello Vercel:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
4. Clicca **Deploy**

Per aggiornamenti futuri: `git push` → Vercel rideploya automaticamente.

---

## Struttura progetto

```
event-gallery/
├── src/
│   ├── config.js          ← PERSONALIZZA QUI (nome, colori, URL)
│   ├── App.js             ← UI completa
│   ├── api.js             ← upload multiplo, fetch, like
│   ├── supabaseClient.js  ← inizializzazione Supabase
│   ├── utils.js           ← helper
│   └── index.js           ← entry point
├── public/index.html
├── capacitor.config.json  ← config app mobile
├── android-config/        ← snippet per Android Studio
├── .env.example
├── .gitignore
└── package.json
```

---

## Funzionalità

- 📸 Upload **multiplo** — fino a 10 foto/video in una volta, con anteprima griglia e progresso per file
- ⚡ **Realtime** — le foto degli altri ospiti appaiono senza ricaricare
- ❤️ Like sui post
- 🔍 Lightbox foto a schermo intero
- ⬛ **QR code** generato automaticamente — pulsante in alto a destra, con stampa in un click
- 🎨 **Tema personalizzabile** — nome evento, colori, sottotitolo da `config.js`
- ⊞ Vista griglia / feed
- 📱 Pronto per Android e iOS con Capacitor
