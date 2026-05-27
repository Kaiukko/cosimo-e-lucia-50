# 🎉 Event Gallery

Galleria foto e video condivisa per eventi — ospiti possono caricare media in tempo reale.

**Stack:** React · Supabase (Storage + Database + Realtime) · Vercel

---

## Setup in 5 passi

### 1. Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) e crea un account
2. Crea un nuovo progetto
3. Vai su **Storage** → crea un bucket chiamato `event-media` con **Public: ON**
4. Vai su **SQL Editor** ed esegui:

```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  author text,
  avatar text,
  color text,
  type text,
  url text,
  caption text,
  likes int default 0,
  created_at timestamptz default now()
);

alter table posts enable row level security;

create policy "Tutti possono leggere"   on posts for select using (true);
create policy "Tutti possono inserire"  on posts for insert with check (true);
create policy "Tutti possono aggiornare i like" on posts for update using (true);
```

5. Vai su **Project Settings → API** e copia:
   - `Project URL`
   - `anon public` key

### 2. Configura le variabili d'ambiente

```bash
cp .env.example .env
```

Apri `.env` e incolla le tue credenziali:

```
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Installa e avvia in locale

```bash
npm install
npm start
```

L'app gira su [http://localhost:3000](http://localhost:3000)

---

## Deploy su Vercel (gratuito)

### Prima volta

1. Carica il progetto su GitHub (senza il file `.env`!)
2. Vai su [vercel.com](https://vercel.com) → **Add New Project** → importa il repo
3. Nella sezione **Environment Variables** aggiungi:
   - `REACT_APP_SUPABASE_URL` → il tuo Project URL
   - `REACT_APP_SUPABASE_ANON_KEY` → la tua anon key
4. Clicca **Deploy**

Il sito sarà live su `https://il-tuo-progetto.vercel.app` in circa 2 minuti.

### Aggiornamenti futuri

```bash
git add .
git commit -m "aggiornamento"
git push
```

Vercel rideploya automaticamente ad ogni push.

---

## Struttura del progetto

```
event-gallery/
├── public/
│   └── index.html
├── src/
│   ├── App.js           # Componente principale + UI
│   ├── api.js           # Tutte le chiamate a Supabase
│   ├── supabaseClient.js# Inizializzazione client
│   ├── utils.js         # Helper (colori, initials, timeAgo)
│   └── index.js         # Entry point React
├── .env.example         # Template variabili d'ambiente
├── .gitignore
└── package.json
```

## Funzionalità

- 📸 Upload foto e video drag & drop
- ⚡ Aggiornamenti in tempo reale (Supabase Realtime)
- ❤️ Like sui post
- 🔍 Lightbox per foto a schermo intero
- ⊞ Vista griglia / feed
- 👤 Avatar personalizzati per ogni ospite
