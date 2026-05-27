import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { uploadFile, savePost, fetchPosts, updateLikes } from "./api";
import { getAvatarColor, getInitials, timeAgo } from "./utils";

// ─── Name Screen ────────────────────────────────────────────────────────────

function NameScreen({ onEnter }) {
  const [name, setName] = useState("");

  return (
    <div style={s.nameScreen}>
      <div style={s.nameCard}>
        <div style={s.eventBadge}>✦ EVENTO ✦</div>
        <h1 style={s.nameTitle}>Benvenuto!</h1>
        <p style={s.nameSub}>
          Come ti chiami? Così sappiamo chi ha scattato le foto più belle.
        </p>
        <input
          style={s.nameInput}
          placeholder="Il tuo nome..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && name.trim() && onEnter(name.trim())}
          autoFocus
        />
        <button
          style={{ ...s.enterBtn, opacity: name.trim() ? 1 : 0.4 }}
          onClick={() => name.trim() && onEnter(name.trim())}
        >
          Entra nella galleria →
        </button>
      </div>
      <div style={s.bgDots} />
    </div>
  );
}

// ─── Upload Panel ────────────────────────────────────────────────────────────

function UploadPanel({ guestName, initials, onPublished }) {
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [previewType, setPreviewType] = useState("image");
  const [caption, setCaption]     = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState(null);
  const [shake, setShake]         = useState(false);
  const fileRef = useRef();

  const handleFile = f => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPreviewType(f.type.startsWith("video") ? "video" : "image");
  };

  const handleDrop = useCallback(e => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handlePost = async () => {
    if (!file) { setShake(true); setTimeout(() => setShake(false), 600); return; }
    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const ticker = setInterval(() => setProgress(p => Math.min(p + 12, 85)), 300);
      const publicUrl = await uploadFile(file);
      clearInterval(ticker);
      setProgress(92);

      const saved = await savePost({
        author:  guestName,
        avatar:  initials,
        color:   getAvatarColor(initials),
        type:    previewType,
        url:     publicUrl,
        caption: caption.trim(),
      });

      setProgress(100);
      onPublished(saved);
      setFile(null);
      setPreview(null);
      setCaption("");
    } catch (err) {
      setError("Errore durante il caricamento. Controlla la connessione e riprova.");
      console.error(err);
    } finally {
      setTimeout(() => { setUploading(false); setProgress(0); }, 400);
    }
  };

  return (
    <div style={s.uploadPanel}>
      {error && <div style={s.errorBanner}>⚠ {error}</div>}

      <div
        style={{
          ...s.dropzone,
          ...(shake ? s.dropzoneShake : {}),
          borderColor: preview ? "#f0c040" : "#3a3a3a",
          background:  preview ? "#141410" : "#0f0f0f",
        }}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !preview && fileRef.current.click()}
      >
        {preview ? (
          previewType === "video"
            ? <video src={preview} style={s.previewMedia} controls />
            : <img src={preview} alt="anteprima" style={s.previewMedia} />
        ) : (
          <div style={s.dropzoneInner}>
            <div style={s.dropIcon}>📸</div>
            <div style={s.dropText}>Trascina una foto o video qui</div>
            <div style={s.dropSub}>oppure clicca per scegliere</div>
          </div>
        )}
        <input
          ref={fileRef} type="file" accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])}
        />
      </div>

      {preview && (
        <button style={s.clearBtn} onClick={() => { setFile(null); setPreview(null); }}>
          ✕ Rimuovi
        </button>
      )}

      {uploading && (
        <div style={s.progressWrap}>
          <div style={{ ...s.progressBar, width: `${progress}%` }} />
        </div>
      )}

      <textarea
        style={s.captionInput}
        placeholder="Aggiungi una didascalia... (opzionale)"
        value={caption}
        onChange={e => setCaption(e.target.value)}
        rows={2}
      />

      <button
        style={{ ...s.postBtn, opacity: uploading ? 0.65 : 1 }}
        onClick={handlePost}
        disabled={uploading}
      >
        {uploading ? `⟳ Caricamento ${progress}%...` : "✦ Pubblica nella galleria"}
      </button>
    </div>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────

function PostCard({ post, layout, onLike, onExpand }) {
  return (
    <div style={layout === "grid" ? s.gridCard : s.feedCard}>
      <div
        style={s.mediaWrap}
        onClick={() => post.type === "image" && onExpand(post.url)}
      >
        {post.type === "video"
          ? <video src={post.url} style={s.media} controls />
          : <img src={post.url} alt={post.caption || ""} style={s.media} loading="lazy" />
        }
        {post.type === "image" && <div style={s.expandHint}>🔍</div>}
      </div>

      <div style={s.cardBody}>
        <div style={s.cardTop}>
          <div style={{ ...s.cardAvatar, background: post.color }}>{post.avatar}</div>
          <div>
            <div style={s.cardAuthor}>{post.author}</div>
            <div style={s.cardTime}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        {post.caption && <p style={s.cardCaption}>{post.caption}</p>}
        <button
          style={{ ...s.likeBtn, color: post.liked ? "#f0c040" : "#555" }}
          onClick={() => onLike(post.id)}
        >
          {post.liked ? "★" : "☆"} {post.likes}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [guestName, setGuestName] = useState("");
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState("grid");
  const [lightbox, setLightbox]   = useState(null);
  const galleryRef = useRef();

  const initials = getInitials(guestName || "?");

  // Carica post all'avvio
  useEffect(() => {
    fetchPosts()
      .then(data => setPosts(data.map(p => ({ ...p, liked: false }))))
      .catch(err => console.error("Errore fetch:", err))
      .finally(() => setLoading(false));
  }, []);

  // Realtime: nuovi post da altri utenti
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
    <div style={s.app}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div>
            <div style={s.headerLabel}>GALLERIA OSPITI</div>
            <h1 style={s.headerTitle}>Condividi il momento</h1>
          </div>
          <div style={s.headerRight}>
            <div
              style={{ ...s.avatar, background: getAvatarColor(initials) }}
              title={guestName}
            >
              {initials}
            </div>
            <div style={s.viewToggle}>
              <button
                style={{ ...s.toggleBtn, ...(view === "grid" ? s.toggleActive : {}) }}
                onClick={() => setView("grid")}
              >⊞</button>
              <button
                style={{ ...s.toggleBtn, ...(view === "feed" ? s.toggleActive : {}) }}
                onClick={() => setView("feed")}
              >☰</button>
            </div>
          </div>
        </div>
      </header>

      {/* Upload */}
      <UploadPanel
        guestName={guestName}
        initials={initials}
        onPublished={handlePublished}
      />

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
            <PostCard
              key={post.id}
              post={post}
              layout={view}
              onLike={toggleLike}
              onExpand={setLightbox}
            />
          ))
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={s.lightbox} onClick={() => setLightbox(null)}>
          <img
            src={lightbox} alt=""
            style={s.lightboxImg}
            onClick={e => e.stopPropagation()}
          />
          <button style={s.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0d0d; }
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = {
  // Name screen
  nameScreen: { minHeight:"100vh", background:"#0d0d0d", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", position:"relative", overflow:"hidden" },
  nameCard:   { background:"#141414", border:"1px solid #252525", borderRadius:20, padding:"52px 44px", maxWidth:420, width:"90%", textAlign:"center", zIndex:1, animation:"fadeUp .6s ease both" },
  eventBadge: { fontSize:10, letterSpacing:4, color:"#f0c040", marginBottom:20 },
  nameTitle:  { fontFamily:"'Instrument Serif',serif", fontSize:48, color:"#f5f0e8", marginBottom:12, fontWeight:400 },
  nameSub:    { color:"#666", fontSize:14, lineHeight:1.65, marginBottom:28 },
  nameInput:  { width:"100%", background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:10, padding:"14px 18px", color:"#f5f0e8", fontSize:16, fontFamily:"'DM Mono',monospace", outline:"none", marginBottom:16 },
  enterBtn:   { width:"100%", background:"#f0c040", color:"#0d0d0d", border:"none", borderRadius:10, padding:14, fontSize:13, fontFamily:"'DM Mono',monospace", fontWeight:600, cursor:"pointer", letterSpacing:1, transition:"opacity .2s" },
  bgDots:     { position:"absolute", inset:0, backgroundImage:"radial-gradient(#1e1e1e 1px,transparent 1px)", backgroundSize:"28px 28px" },

  // App shell
  app:         { minHeight:"100vh", background:"#0d0d0d", fontFamily:"'DM Mono',monospace", color:"#f5f0e8", paddingBottom:80 },
  header:      { borderBottom:"1px solid #181818", background:"rgba(13,13,13,.95)", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(14px)" },
  headerInner: { maxWidth:900, margin:"0 auto", padding:"16px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  headerLabel: { fontSize:10, letterSpacing:3, color:"#f0c040", marginBottom:2 },
  headerTitle: { fontFamily:"'Instrument Serif',serif", fontSize:26, fontWeight:400, color:"#f5f0e8" },
  headerRight: { display:"flex", alignItems:"center", gap:14 },
  avatar:      { width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, color:"#fff", flexShrink:0 },
  viewToggle:  { display:"flex", border:"1px solid #252525", borderRadius:8, overflow:"hidden" },
  toggleBtn:   { background:"transparent", border:"none", color:"#444", padding:"6px 11px", cursor:"pointer", fontSize:15, transition:"all .2s" },
  toggleActive:{ background:"#1a1a1a", color:"#f0c040" },

  // Upload
  uploadPanel: { maxWidth:580, margin:"28px auto 0", padding:"0 20px", animation:"fadeUp .5s ease both" },
  errorBanner: { background:"#1f0e0e", border:"1px solid #5a1a1a", borderRadius:10, padding:"10px 16px", color:"#e08080", fontSize:12, marginBottom:14 },
  dropzone:    { border:"2px dashed", borderRadius:14, minHeight:170, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all .25s", overflow:"hidden", position:"relative", marginBottom:10 },
  dropzoneShake: { animation:"shake .5s ease" },
  dropzoneInner: { textAlign:"center", padding:32 },
  dropIcon:    { fontSize:38, marginBottom:10 },
  dropText:    { color:"#888", fontSize:14, marginBottom:5 },
  dropSub:     { color:"#444", fontSize:11 },
  previewMedia:{ width:"100%", maxHeight:280, objectFit:"cover", display:"block" },
  expandHint:  { position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,.65)", borderRadius:6, padding:"3px 7px", fontSize:13 },
  clearBtn:    { background:"none", border:"1px solid #2a2a2a", color:"#777", borderRadius:8, padding:"5px 12px", fontSize:11, cursor:"pointer", marginBottom:10, fontFamily:"'DM Mono',monospace" },
  progressWrap:{ height:3, background:"#1a1a1a", borderRadius:4, marginBottom:12, overflow:"hidden" },
  progressBar: { height:"100%", background:"#f0c040", borderRadius:4, transition:"width .3s ease", animation:"pulse 1.2s ease infinite" },
  captionInput:{ width:"100%", background:"#0f0f0f", border:"1px solid #1e1e1e", borderRadius:12, padding:"13px 15px", color:"#f5f0e8", fontSize:13, fontFamily:"'DM Mono',monospace", outline:"none", resize:"none", marginBottom:12, lineHeight:1.5 },
  postBtn:     { width:"100%", background:"#f0c040", color:"#0d0d0d", border:"none", borderRadius:12, padding:14, fontSize:13, fontFamily:"'DM Mono',monospace", fontWeight:700, cursor:"pointer", letterSpacing:1, transition:"opacity .2s" },

  // Gallery
  grid:    { maxWidth:900, margin:"28px auto 0", padding:"0 20px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(255px,1fr))", gap:18 },
  feed:    { maxWidth:540, margin:"28px auto 0", padding:"0 20px", display:"flex", flexDirection:"column", gap:22 },
  stateMsg:{ gridColumn:"1/-1", textAlign:"center", color:"#3a3a3a", padding:"70px 20px", fontSize:14, lineHeight:2 },

  // Cards
  gridCard: { background:"#111", border:"1px solid #1a1a1a", borderRadius:14, overflow:"hidden", animation:"fadeUp .4s ease both" },
  feedCard: { background:"#111", border:"1px solid #1a1a1a", borderRadius:14, overflow:"hidden", animation:"fadeUp .4s ease both" },
  mediaWrap:{ position:"relative", cursor:"pointer", overflow:"hidden", background:"#0a0a0a" },
  media:    { width:"100%", height:210, objectFit:"cover", display:"block" },
  cardBody: { padding:"13px 15px 11px" },
  cardTop:  { display:"flex", alignItems:"center", gap:9, marginBottom:7 },
  cardAvatar:{ width:30, height:30, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 },
  cardAuthor:{ fontSize:12, fontWeight:600, color:"#e8e4dc" },
  cardTime:  { fontSize:10, color:"#444" },
  cardCaption:{ fontSize:12, color:"#999", lineHeight:1.55, marginBottom:9 },
  likeBtn:   { background:"none", border:"none", cursor:"pointer", fontSize:13, fontFamily:"'DM Mono',monospace", transition:"color .15s", padding:0 },

  // Lightbox
  lightbox:     { position:"fixed", inset:0, background:"rgba(0,0,0,.93)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, cursor:"zoom-out" },
  lightboxImg:  { maxWidth:"90vw", maxHeight:"90vh", borderRadius:10, objectFit:"contain", cursor:"default" },
  lightboxClose:{ position:"absolute", top:18, right:22, background:"none", border:"none", color:"#888", fontSize:20, cursor:"pointer", fontFamily:"'DM Mono',monospace" },
};
