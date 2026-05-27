import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { uploadFiles, savePosts, fetchPosts, updateLikes } from "./api";
import { getAvatarColor, getInitials, timeAgo } from "./utils";
import config from "./config";

const C = config.colors;

// ─── QR Code (via api.qrserver.com, no lib needed) ───────────────────────────

function QRModal({ onClose }) {
  const url = config.appUrl;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&bgcolor=0d0d0d&color=f5f0e8&data=${encodeURIComponent(url)}`;

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>QR Code — ${config.eventName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #fff;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; font-family: 'DM Mono', monospace;
          }
          .card {
            border: 2px solid #111;
            border-radius: 24px;
            padding: 48px 56px;
            text-align: center;
            max-width: 420px;
            width: 90%;
          }
          .badge { font-size: 10px; letter-spacing: 4px; color: #999; margin-bottom: 16px; }
          .title { font-family: 'Instrument Serif', serif; font-size: 40px; font-weight: 400; color: #111; margin-bottom: 6px; }
          .subtitle { font-size: 13px; color: #888; margin-bottom: 32px; }
          .qr { width: 220px; height: 220px; border-radius: 12px; }
          .cta { margin-top: 28px; font-size: 12px; color: #555; line-height: 1.7; }
          .url { font-size: 11px; color: #bbb; margin-top: 12px; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">✦ GALLERIA OSPITI ✦</div>
          <div class="title">${config.eventName}</div>
          ${config.eventSubtitle ? `<div class="subtitle">${config.eventSubtitle}</div>` : ""}
          <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=440x440&bgcolor=ffffff&color=111111&data=${encodeURIComponent(url)}" />
          <div class="cta">Inquadra il QR code con la fotocamera<br>e condividi le tue foto dell'evento!</div>
          <div class="url">${url}</div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 600);
  };

  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modalCard} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <div style={{ ...s.eventBadge, marginBottom: 4 }}>QR CODE</div>
            <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: 22, color: C.text }}>
              {config.eventName}
            </div>
          </div>
          <button style={s.modalClose} onClick={onClose}>✕</button>
        </div>

        <div style={s.qrWrap}>
          <img src={qrSrc} alt="QR Code" style={s.qrImg} />
        </div>

        <p style={s.qrUrl}>{url}</p>
        <p style={s.qrHint}>Gli ospiti inquadrano il codice con la fotocamera e accedono subito alla galleria.</p>

        <button style={s.printBtn} onClick={handlePrint}>
          🖨 Stampa QR code
        </button>
      </div>
    </div>
  );
}

// ─── Name Screen ──────────────────────────────────────────────────────────────

function NameScreen({ onEnter }) {
  const [name, setName] = useState("");
  return (
    <div style={{ ...s.nameScreen, background: C.background }}>
      <div style={{ ...s.nameCard, background: C.card }}>
        <div style={s.eventBadge}>✦ GALLERIA OSPITI ✦</div>
        <h1 style={{ ...s.nameTitle, color: C.text }}>{config.eventName}</h1>
        {config.eventSubtitle && (
          <div style={{ color: C.accent, fontSize: 13, marginBottom: 8, letterSpacing: 1 }}>
            {config.eventSubtitle}
          </div>
        )}
        <p style={{ ...s.nameSub, color: C.textMuted }}>
          Come ti chiami? Così sappiamo chi ha scattato le foto più belle.
        </p>
        <input
          style={{ ...s.nameInput, background: C.background, color: C.text }}
          placeholder="Il tuo nome..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && name.trim() && onEnter(name.trim())}
          autoFocus
        />
        <button
          style={{ ...s.enterBtn, background: C.accent, opacity: name.trim() ? 1 : 0.4 }}
          onClick={() => name.trim() && onEnter(name.trim())}
        >
          Entra nella galleria →
        </button>
      </div>
      <div style={s.bgDots} />
    </div>
  );
}

// ─── Multi-file Upload Panel ──────────────────────────────────────────────────

function UploadPanel({ guestName, initials, onPublished }) {
  const [files, setFiles]       = useState([]);   // { file, preview, type, progress, status }
  const [caption, setCaption]   = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState(null);
  const [shake, setShake]       = useState(false);
  const fileRef = useRef();

  const addFiles = useCallback((incoming) => {
    const valid = Array.from(incoming).slice(0, config.maxFilesPerUpload);
    const items = valid.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      type: f.type.startsWith("video") ? "video" : "image",
      progress: 0,
      status: "pending",   // pending | uploading | done | error
    }));
    setFiles(prev => {
      const combined = [...prev, ...items];
      return combined.slice(0, config.maxFilesPerUpload);
    });
  }, []);

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = useCallback(e => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const updateFileStatus = (idx, patch) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  };

  const handlePost = async () => {
    if (files.length === 0) { setShake(true); setTimeout(() => setShake(false), 600); return; }
    setUploading(true);
    setError(null);

    // Mark all as uploading
    setFiles(prev => prev.map(f => ({ ...f, status: "uploading", progress: 0 })));

    try {
      const rawFiles = files.map(f => f.file);
      const { urls, errors } = await uploadFiles(rawFiles, (idx, pct) => {
        updateFileStatus(idx, { progress: pct, status: pct === 100 ? "done" : "uploading" });
      });

      if (errors.length > 0) {
        errors.forEach(e => {
          const idx = rawFiles.indexOf(e.file);
          if (idx >= 0) updateFileStatus(idx, { status: "error" });
        });
        setError(`${errors.length} file non caricati. Gli altri sono stati pubblicati.`);
      }

      if (urls.length > 0) {
        const posts = urls.map(({ file, url }) => ({
          author:  guestName,
          avatar:  initials,
          color:   getAvatarColor(initials),
          type:    file.type.startsWith("video") ? "video" : "image",
          url,
          caption: caption.trim(),
        }));

        const saved = await savePosts(posts);
        saved.forEach(p => onPublished(p));
      }

      // Reset only successful ones
      setFiles(prev => prev.filter(f => f.status === "error"));
      setCaption("");
    } catch (err) {
      setError("Errore durante il caricamento. Controlla la connessione e riprova.");
      console.error(err);
      setFiles(prev => prev.map(f => ({ ...f, status: "error" })));
    } finally {
      setUploading(false);
    }
  };

  const doneCount = files.filter(f => f.status === "done").length;
  const totalProgress = files.length > 0
    ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length)
    : 0;

  return (
    <div style={s.uploadPanel}>
      {error && <div style={s.errorBanner}>⚠ {error}</div>}

      {/* Drop zone */}
      <div
        style={{
          ...s.dropzone,
          ...(shake ? s.dropzoneShake : {}),
          borderColor: files.length > 0 ? C.accent : "#2e2e2e",
          background: "#0f0f0f",
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current.click()}
      >
        {files.length === 0 ? (
          <div style={s.dropzoneInner}>
            <div style={s.dropIcon}>📸</div>
            <div style={s.dropText}>Trascina foto e video qui</div>
            <div style={s.dropSub}>oppure clicca · max {config.maxFilesPerUpload} file</div>
          </div>
        ) : (
          <div style={s.previewGrid}>
            {files.map((f, i) => (
              <div key={i} style={s.previewThumb}>
                {f.type === "video"
                  ? <video src={f.preview} style={s.thumbMedia} />
                  : <img src={f.preview} alt="" style={s.thumbMedia} />
                }
                {/* Progress overlay */}
                {f.status === "uploading" && (
                  <div style={s.thumbOverlay}>
                    <div style={s.thumbProgress}>{f.progress}%</div>
                  </div>
                )}
                {f.status === "done" && (
                  <div style={{ ...s.thumbOverlay, background: "rgba(0,180,80,.45)" }}>
                    <div style={{ fontSize: 20 }}>✓</div>
                  </div>
                )}
                {f.status === "error" && (
                  <div style={{ ...s.thumbOverlay, background: "rgba(200,40,40,.5)" }}>
                    <div style={{ fontSize: 16 }}>✕</div>
                  </div>
                )}
                {/* Remove button */}
                {!uploading && (
                  <button
                    style={s.thumbRemove}
                    onClick={e => { e.stopPropagation(); removeFile(i); }}
                  >✕</button>
                )}
              </div>
            ))}
            {/* Add more button */}
            {files.length < config.maxFilesPerUpload && !uploading && (
              <div style={s.addMoreThumb} onClick={e => { e.stopPropagation(); fileRef.current.click(); }}>
                <div style={{ fontSize: 24, color: "#555" }}>+</div>
                <div style={{ fontSize: 10, color: "#444", marginTop: 4 }}>aggiungi</div>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          multiple
          style={{ display: "none" }}
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {/* File count badge */}
      {files.length > 0 && (
        <div style={s.fileCount}>
          {uploading
            ? `⟳ Caricamento ${doneCount}/${files.length} file — ${totalProgress}%`
            : `${files.length} file selezionat${files.length === 1 ? "o" : "i"} · clicca + per aggiungerne altri`
          }
        </div>
      )}

      {/* Global progress bar */}
      {uploading && (
        <div style={s.progressWrap}>
          <div style={{ ...s.progressBar, width: `${totalProgress}%` }} />
        </div>
      )}

      <textarea
        style={{ ...s.captionInput, background: C.background, color: C.text }}
        placeholder="Aggiungi una didascalia per tutte le foto... (opzionale)"
        value={caption}
        onChange={e => setCaption(e.target.value)}
        rows={2}
        disabled={uploading}
      />

      <button
        style={{ ...s.postBtn, background: C.accent, opacity: uploading ? 0.65 : 1 }}
        onClick={handlePost}
        disabled={uploading}
      >
        {uploading
          ? `⟳ Pubblicazione ${doneCount}/${files.length}...`
          : files.length > 1
            ? `✦ Pubblica ${files.length} foto nella galleria`
            : "✦ Pubblica nella galleria"
        }
      </button>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, layout, onLike, onExpand }) {
  return (
    <div style={{ ...(layout === "grid" ? s.gridCard : s.feedCard), background: C.card }}>
      <div style={s.mediaWrap} onClick={() => post.type === "image" && onExpand(post.url)}>
        {post.type === "video"
          ? <video src={post.url} style={s.media} controls playsInline />
          : <img src={post.url} alt={post.caption || ""} style={s.media} loading="lazy" />
        }
        {post.type === "image" && <div style={s.expandHint}>🔍</div>}
      </div>
      <div style={s.cardBody}>
        <div style={s.cardTop}>
          <div style={{ ...s.cardAvatar, background: post.color }}>{post.avatar}</div>
          <div>
            <div style={{ ...s.cardAuthor, color: C.text }}>{post.author}</div>
            <div style={s.cardTime}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        {post.caption && <p style={s.cardCaption}>{post.caption}</p>}
        <button
          style={{ ...s.likeBtn, color: post.liked ? C.accent : "#555" }}
          onClick={() => onLike(post.id)}
        >
          {post.liked ? "★" : "☆"} {post.likes}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [guestName, setGuestName] = useState("");
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("grid");
  const [lightbox, setLightbox]   = useState(null);
  const [showQR, setShowQR]       = useState(false);
  const galleryRef = useRef();

  const initials = getInitials(guestName || "?");

  useEffect(() => {
    fetchPosts()
      .then(data => setPosts(data.map(p => ({ ...p, liked: false }))))
      .catch(err => console.error("Errore fetch:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("posts-live")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        payload => {
          setPosts(prev => {
            if (prev.find(p => p.id === payload.new.id)) return prev;
            return [{ ...payload.new, liked: false }, ...prev];
          });
        }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handlePublished = post => {
    setPosts(prev => {
      if (prev.find(p => p.id === post.id)) return prev;
      return [{ ...post, liked: false }, ...prev];
    });
    setTimeout(() => galleryRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
  };

  const toggleLike = id => {
    setPosts(prev => prev.map(post => {
      if (post.id !== id) return post;
      const liked = !post.liked;
      const likes = liked ? post.likes + 1 : post.likes - 1;
      updateLikes(id, likes);
      return { ...post, liked, likes };
    }));
  };

  if (!guestName) return <NameScreen onEnter={setGuestName} />;

  return (
    <div style={{ ...s.app, background: C.background }}>
      {/* Header */}
      <header style={{ ...s.header, background: `${C.background}f0` }}>
        <div style={s.headerInner}>
          <div>
            <div style={{ ...s.eventBadge, color: C.accent }}>GALLERIA OSPITI</div>
            <h1 style={{ ...s.headerTitle, color: C.text }}>{config.eventName}</h1>
            {config.eventSubtitle && (
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{config.eventSubtitle}</div>
            )}
          </div>
          <div style={s.headerRight}>
            {/* QR button */}
            <button style={{ ...s.iconBtn, color: C.accent }} onClick={() => setShowQR(true)} title="QR Code">
              ⬛
            </button>
            <div style={{ ...s.avatar, background: getAvatarColor(initials) }} title={guestName}>
              {initials}
            </div>
            <div style={s.viewToggle}>
              <button style={{ ...s.toggleBtn, ...(view==="grid" ? { ...s.toggleActive, color: C.accent } : {}) }} onClick={() => setView("grid")}>⊞</button>
              <button style={{ ...s.toggleBtn, ...(view==="feed" ? { ...s.toggleActive, color: C.accent } : {}) }} onClick={() => setView("feed")}>☰</button>
            </div>
          </div>
        </div>
      </header>

      <UploadPanel guestName={guestName} initials={initials} onPublished={handlePublished} />

      {/* Gallery */}
      <div ref={galleryRef} style={view === "grid" ? s.grid : s.feed}>
        {loading ? (
          <div style={s.stateMsg}>⟳ Caricamento galleria...</div>
        ) : posts.length === 0 ? (
          <div style={s.stateMsg}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
            Sii il primo a condividere un momento!
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} layout={view} onLike={toggleLike} onExpand={setLightbox} />
          ))
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={s.lightbox} onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" style={s.lightboxImg} onClick={e => e.stopPropagation()} />
          <button style={s.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      {/* QR Modal */}
      {showQR && <QRModal onClose={() => setShowQR(false)} />}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.background}; }
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)} 40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)} 80%{transform:translateX(5px)}
        }
        @keyframes fadeUp {
          from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)}
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  // Name screen
  nameScreen:  { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", position:"relative", overflow:"hidden" },
  nameCard:    { border:"1px solid #252525", borderRadius:20, padding:"52px 44px", maxWidth:420, width:"90%", textAlign:"center", zIndex:1, animation:"fadeUp .6s ease both" },
  eventBadge:  { fontSize:10, letterSpacing:4, marginBottom:16 },
  nameTitle:   { fontFamily:"'Instrument Serif',serif", fontSize:46, marginBottom:8, fontWeight:400 },
  nameSub:     { fontSize:14, lineHeight:1.65, marginBottom:28 },
  nameInput:   { width:"100%", border:"1px solid #2a2a2a", borderRadius:10, padding:"14px 18px", fontSize:16, fontFamily:"'DM Mono',monospace", outline:"none", marginBottom:16 },
  enterBtn:    { width:"100%", border:"none", borderRadius:10, padding:14, fontSize:13, fontFamily:"'DM Mono',monospace", fontWeight:600, cursor:"pointer", letterSpacing:1, color:"#0d0d0d" },
  bgDots:      { position:"absolute", inset:0, backgroundImage:"radial-gradient(#1e1e1e 1px,transparent 1px)", backgroundSize:"28px 28px" },

  // App
  app:          { minHeight:"100vh", fontFamily:"'DM Mono',monospace", paddingBottom:80 },
  header:       { borderBottom:"1px solid #181818", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(14px)" },
  headerInner:  { maxWidth:960, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  headerTitle:  { fontFamily:"'Instrument Serif',serif", fontSize:24, fontWeight:400 },
  headerRight:  { display:"flex", alignItems:"center", gap:12 },
  iconBtn:      { background:"none", border:"none", fontSize:18, cursor:"pointer", padding:"4px 6px", borderRadius:6 },
  avatar:       { width:34, height:34, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:11, color:"#fff", flexShrink:0 },
  viewToggle:   { display:"flex", border:"1px solid #252525", borderRadius:8, overflow:"hidden" },
  toggleBtn:    { background:"transparent", border:"none", color:"#444", padding:"6px 10px", cursor:"pointer", fontSize:14 },
  toggleActive: { background:"#1a1a1a" },

  // Upload
  uploadPanel:  { maxWidth:620, margin:"24px auto 0", padding:"0 20px", animation:"fadeUp .5s ease both" },
  errorBanner:  { background:"#1f0e0e", border:"1px solid #5a1a1a", borderRadius:10, padding:"10px 16px", color:"#e08080", fontSize:12, marginBottom:14 },
  dropzone:     { border:"2px dashed", borderRadius:14, minHeight:160, display:"flex", alignItems:"center", justifyContent:"center", transition:"all .25s", overflow:"hidden", position:"relative", marginBottom:10, cursor:"pointer" },
  dropzoneShake:{ animation:"shake .5s ease" },
  dropzoneInner:{ textAlign:"center", padding:32 },
  dropIcon:     { fontSize:36, marginBottom:10 },
  dropText:     { color:"#888", fontSize:14, marginBottom:5 },
  dropSub:      { color:"#444", fontSize:11 },

  // Preview grid inside dropzone
  previewGrid:  { display:"flex", flexWrap:"wrap", gap:8, padding:14, width:"100%", alignItems:"flex-start" },
  previewThumb: { width:90, height:90, borderRadius:10, overflow:"hidden", position:"relative", flexShrink:0, background:"#1a1a1a" },
  thumbMedia:   { width:"100%", height:"100%", objectFit:"cover", display:"block" },
  thumbOverlay: { position:"absolute", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:700 },
  thumbProgress:{ fontSize:12, fontWeight:700, color:"#fff" },
  thumbRemove:  { position:"absolute", top:3, right:3, background:"rgba(0,0,0,.7)", border:"none", color:"#fff", borderRadius:"50%", width:18, height:18, fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace" },
  addMoreThumb: { width:90, height:90, borderRadius:10, border:"2px dashed #2a2a2a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 },

  fileCount:    { fontSize:11, color:"#555", marginBottom:10, textAlign:"center" },
  progressWrap: { height:3, background:"#1a1a1a", borderRadius:4, marginBottom:12, overflow:"hidden" },
  progressBar:  { height:"100%", borderRadius:4, transition:"width .3s ease", animation:"pulse 1.2s ease infinite", background:"#f0c040" },
  captionInput: { width:"100%", border:"1px solid #1e1e1e", borderRadius:12, padding:"13px 15px", fontSize:13, fontFamily:"'DM Mono',monospace", outline:"none", resize:"none", marginBottom:12, lineHeight:1.5 },
  postBtn:      { width:"100%", border:"none", borderRadius:12, padding:14, fontSize:13, fontFamily:"'DM Mono',monospace", fontWeight:700, cursor:"pointer", letterSpacing:1, color:"#0d0d0d" },

  // Gallery
  grid:     { maxWidth:960, margin:"24px auto 0", padding:"0 20px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))", gap:18 },
  feed:     { maxWidth:540, margin:"24px auto 0", padding:"0 20px", display:"flex", flexDirection:"column", gap:22 },
  stateMsg: { gridColumn:"1/-1", textAlign:"center", color:"#3a3a3a", padding:"70px 20px", fontSize:14, lineHeight:2 },

  // Cards
  gridCard:   { border:"1px solid #1a1a1a", borderRadius:14, overflow:"hidden", animation:"fadeUp .4s ease both" },
  feedCard:   { border:"1px solid #1a1a1a", borderRadius:14, overflow:"hidden", animation:"fadeUp .4s ease both" },
  mediaWrap:  { position:"relative", cursor:"pointer", overflow:"hidden", background:"#0a0a0a" },
  media:      { width:"100%", height:210, objectFit:"cover", display:"block" },
  expandHint: { position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,.65)", borderRadius:6, padding:"3px 7px", fontSize:13 },
  cardBody:   { padding:"13px 15px 11px" },
  cardTop:    { display:"flex", alignItems:"center", gap:9, marginBottom:7 },
  cardAvatar: { width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 },
  cardAuthor: { fontSize:12, fontWeight:600 },
  cardTime:   { fontSize:10, color:"#444" },
  cardCaption:{ fontSize:12, color:"#999", lineHeight:1.55, marginBottom:9 },
  likeBtn:    { background:"none", border:"none", cursor:"pointer", fontSize:13, fontFamily:"'DM Mono',monospace", transition:"color .15s", padding:0 },

  // Lightbox
  lightbox:      { position:"fixed", inset:0, background:"rgba(0,0,0,.93)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, cursor:"zoom-out" },
  lightboxImg:   { maxWidth:"90vw", maxHeight:"90vh", borderRadius:10, objectFit:"contain", cursor:"default" },
  lightboxClose: { position:"absolute", top:18, right:22, background:"none", border:"none", color:"#888", fontSize:20, cursor:"pointer", fontFamily:"'DM Mono',monospace" },

  // QR Modal
  modalOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(6px)" },
  modalCard:    { background:"#141414", border:"1px solid #252525", borderRadius:20, padding:"32px 36px", maxWidth:380, width:"90%", animation:"fadeUp .3s ease both" },
  modalHeader:  { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 },
  modalClose:   { background:"none", border:"none", color:"#555", fontSize:18, cursor:"pointer", fontFamily:"'DM Mono',monospace", marginTop:2 },
  qrWrap:       { background:"#0d0d0d", borderRadius:14, padding:20, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:16 },
  qrImg:        { width:220, height:220, borderRadius:8, display:"block" },
  qrUrl:        { fontSize:11, color:"#444", textAlign:"center", marginBottom:8, wordBreak:"break-all" },
  qrHint:       { fontSize:12, color:"#666", textAlign:"center", lineHeight:1.6, marginBottom:24 },
  printBtn:     { width:"100%", background:"#1e1e1e", border:"1px solid #2a2a2a", color:"#f5f0e8", borderRadius:12, padding:"13px", fontSize:13, fontFamily:"'DM Mono',monospace", cursor:"pointer", letterSpacing:1 },
};
