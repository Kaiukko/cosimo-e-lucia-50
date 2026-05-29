import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { uploadFiles, savePosts, fetchPosts, updateLikes, deletePosts } from "./api";
import { getAvatarColor, getInitials, timeAgo } from "./utils";
import config from "./config";

const C = config.colors;

// ─── Ornamental divider SVG ───────────────────────────────────────────────────
const Ornament = ({ size = 120 }) => (
  <svg width={size} height="24" viewBox="0 0 120 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display:"block", margin:"0 auto" }}>
    <line x1="0" y1="12" x2="46" y2="12" stroke={C.accentLight} strokeWidth="0.75"/>
    <path d="M52 12 C54 8, 58 6, 60 12 C62 18, 66 16, 68 12" stroke={C.accent} strokeWidth="1" fill="none"/>
    <circle cx="60" cy="12" r="2.5" fill={C.accent}/>
    <circle cx="52" cy="12" r="1.2" fill={C.accentLight}/>
    <circle cx="68" cy="12" r="1.2" fill={C.accentLight}/>
    <line x1="74" y1="12" x2="120" y2="12" stroke={C.accentLight} strokeWidth="0.75"/>
  </svg>
);

// ─── Admin Login ──────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess, onClose }) {
  const [pwd, setPwd]     = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = () => {
    if (pwd === config.adminPassword) { onSuccess(); }
    else {
      setError(true); setShake(true); setPwd("");
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.modalBox, ...(shake ? s.shake : {}) }} onClick={e => e.stopPropagation()}>
        <div style={s.modalOrnamentTop}>✦</div>
        <h3 style={s.modalTitle}>Area Riservata</h3>
        <Ornament size={100} />
        <p style={{ ...s.modalSub, marginTop:16 }}>Inserisci la password per gestire la galleria.</p>
        <input
          style={{ ...s.elegantInput, borderColor: error ? "#c04040" : C.border, marginTop:20 }}
          type="password" placeholder="Password..."
          value={pwd}
          onChange={e => { setPwd(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          autoFocus
        />
        {error && <p style={s.errorText}>Password errata. Riprova.</p>}
        <button style={{ ...s.goldBtn, marginTop:20 }} onClick={handleSubmit} disabled={!pwd}>
          Accedi
        </button>
        <button style={s.ghostBtn} onClick={onClose}>Annulla</button>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────
function AdminPanel({ posts, onDelete, onClose }) {
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm]   = useState(false);

  const toggle    = id => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === posts.length ? new Set() : new Set(posts.map(p => p.id)));

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePosts(posts.filter(p => selected.has(p.id)));
      onDelete([...selected]);
      setSelected(new Set());
      setConfirm(false);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={{ ...s.adminPanel }} onClick={e => e.stopPropagation()}>
        <div style={s.adminHead}>
          <div style={s.adminHeadText}>
            <div style={s.badgeSmall}>PANNELLO ADMIN</div>
            <h3 style={s.modalTitle}>Gestisci Galleria</h3>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <Ornament />
        <div style={s.adminToolbar}>
          <button style={s.softBtn} onClick={toggleAll}>
            {selected.size === posts.length ? "Deseleziona tutto" : "Seleziona tutto"}
          </button>
          <span style={s.countLabel}>{selected.size > 0 ? `${selected.size} selezionati` : `${posts.length} elementi`}</span>
          {selected.size > 0 && !confirm && (
            <button style={s.redBtn} onClick={() => setConfirm(true)}>🗑 Elimina {selected.size}</button>
          )}
          {confirm && (
            <div style={s.confirmRow}>
              <span style={{ color:"#c04040", fontSize:12 }}>Confermi?</span>
              <button style={{ ...s.redBtn, opacity: deleting ? .6 : 1 }} onClick={handleDelete} disabled={deleting}>
                {deleting ? "⟳ Eliminazione..." : "Sì, elimina"}
              </button>
              <button style={s.softBtn} onClick={() => setConfirm(false)}>Annulla</button>
            </div>
          )}
        </div>
        {posts.length === 0
          ? <p style={{ textAlign:"center", color:C.textMuted, padding:"40px 0" }}>Nessun contenuto.</p>
          : (
            <div style={s.adminGrid}>
              {posts.map(post => {
                const sel = selected.has(post.id);
                return (
                  <div key={post.id} style={{ ...s.adminThumb, outline: sel ? `2px solid ${C.accent}` : "2px solid transparent" }} onClick={() => toggle(post.id)}>
                    {post.type === "video"
                      ? <video src={post.url} style={s.adminMedia} />
                      : <img src={post.url} alt="" style={s.adminMedia} loading="lazy" />}
                    <div style={{ ...s.adminCheck, background: sel ? C.accent : "rgba(250,247,242,.5)", borderColor: sel ? C.accent : C.border }}>
                      {sel && <span style={{ fontSize:9, color:"#fff" }}>✓</span>}
                    </div>
                    <div style={s.adminLabel}>
                      <span style={{ fontSize:9, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{post.author}</span>
                    </div>
                    {post.type === "video" && <div style={s.videoBadge}>▶</div>}
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

// ─── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ onClose }) {
  const url   = config.appUrl;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&bgcolor=faf7f2&color=2c2416&data=${encodeURIComponent(url)}`;

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>QR — ${config.eventName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=EB+Garamond:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#faf7f2;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'EB Garamond',serif}
        .card{border:1px solid #d4af70;border-radius:4px;padding:52px 60px;text-align:center;max-width:440px;width:90%;position:relative}
        .card::before{content:'';position:absolute;inset:6px;border:0.5px solid #e8dfc8;border-radius:2px;pointer-events:none}
        .badge{font-size:9px;letter-spacing:5px;color:#b8965a;margin-bottom:14px;text-transform:uppercase}
        .title{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:300;color:#2c2416;margin-bottom:4px;font-style:italic}
        .sub{font-size:12px;color:#9a8a6a;margin-bottom:6px;letter-spacing:1px}
        .date{font-size:11px;color:#c4b08a;margin-bottom:32px;letter-spacing:1px}
        .qr{width:200px;height:200px;border-radius:2px;border:1px solid #e8dfc8;padding:8px;background:#fff}
        .cta{margin-top:24px;font-size:12px;color:#9a8a6a;line-height:1.8;font-style:italic}
        .url{font-size:9px;color:#c4b08a;margin-top:10px;word-break:break-all;letter-spacing:.5px}
        .divider{margin:20px auto;opacity:.6}
      </style>
    </head><body>
      <div class="card">
        <div class="badge">✦ Galleria Ospiti ✦</div>
        <div class="title">${config.eventName}</div>
        <div class="sub">${config.eventSubtitle || ""}</div>
        <div class="date">${config.eventDate || ""}</div>
        <img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&bgcolor=ffffff&color=2c2416&data=${encodeURIComponent(url)}" />
        <div class="cta">Inquadra il codice con la fotocamera<br>e condividi i tuoi ricordi più belli</div>
        <div class="url">${url}</div>
      </div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modalBox} onClick={e => e.stopPropagation()}>
        <div style={s.modalOrnamentTop}>✦</div>
        <h3 style={s.modalTitle}>QR Code Invitati</h3>
        <Ornament size={100} />
        <div style={s.qrWrap}>
          <img src={qrSrc} alt="QR" style={s.qrImg} />
        </div>
        <p style={s.qrUrl}>{url}</p>
        <p style={{ ...s.modalSub, fontStyle:"italic", marginBottom:20 }}>
          Gli ospiti inquadrano il codice per accedere alla galleria e condividere i loro ricordi.
        </p>
        <button style={s.goldBtn} onClick={handlePrint}>🖨 Stampa invito</button>
        <button style={s.ghostBtn} onClick={onClose}>Chiudi</button>
      </div>
    </div>
  );
}

// ─── Name Screen ──────────────────────────────────────────────────────────────
function NameScreen({ onEnter }) {
  const [name, setName] = useState("");

  return (
    <div style={s.nameScreen}>
      {/* Texture overlay */}
      <div style={s.paperTexture} />

      <div style={s.nameCard}>
        {/* Corner ornaments */}
        <div style={{ ...s.corner, top:16, left:16, borderTop:`1px solid ${C.accentLight}`, borderLeft:`1px solid ${C.accentLight}` }} />
        <div style={{ ...s.corner, top:16, right:16, borderTop:`1px solid ${C.accentLight}`, borderRight:`1px solid ${C.accentLight}` }} />
        <div style={{ ...s.corner, bottom:16, left:16, borderBottom:`1px solid ${C.accentLight}`, borderLeft:`1px solid ${C.accentLight}` }} />
        <div style={{ ...s.corner, bottom:16, right:16, borderBottom:`1px solid ${C.accentLight}`, borderRight:`1px solid ${C.accentLight}` }} />

        <div style={s.badgeSmall}>✦ Galleria del Ricordo ✦</div>

        <h1 style={s.heroTitle}>{config.eventName}</h1>

        <div style={s.heroSubtitle}>{config.eventSubtitle}</div>
        {config.eventDate && <div style={s.heroDate}>{config.eventDate}</div>}

        <Ornament />

        <p style={s.welcomeText}>
          Come ti chiami?<br/>
          <span style={{ fontStyle:"italic", color:C.textMuted }}>Ci fa piacere sapere chi condivide questi ricordi preziosi.</span>
        </p>

        <input
          style={s.elegantInput}
          placeholder="Il tuo nome..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && name.trim() && onEnter(name.trim())}
          autoFocus
        />

        <button
          style={{ ...s.goldBtn, opacity: name.trim() ? 1 : 0.45, marginTop:8 }}
          onClick={() => name.trim() && onEnter(name.trim())}
        >
          Entra nella Galleria
        </button>

        <div style={s.nameFootnote}>Un momento speciale merita di essere ricordato.</div>
      </div>
    </div>
  );
}

// ─── Upload Panel ─────────────────────────────────────────────────────────────
function UploadPanel({ guestName, initials, onPublished, hasPosts, onSlideshow }) {
  const [files, setFiles]         = useState([]);
  const [caption, setCaption]     = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState(null);
  const [shake, setShake]         = useState(false);
  const fileRef = useRef();

  const addFiles = useCallback(incoming => {
    const items = Array.from(incoming).slice(0, config.maxFilesPerUpload).map(f => ({
      file:f, preview:URL.createObjectURL(f),
      type:f.type.startsWith("video")?"video":"image",
      progress:0, status:"pending",
    }));
    setFiles(prev => [...prev, ...items].slice(0, config.maxFilesPerUpload));
  }, []);

  const removeFile = i => setFiles(prev => prev.filter((_,j) => j !== i));
  const handleDrop = useCallback(e => { e.preventDefault(); addFiles(e.dataTransfer.files); }, [addFiles]);
  const updateFile = (idx, patch) => setFiles(prev => prev.map((f,i) => i===idx ? {...f,...patch} : f));

  const handlePost = async () => {
    if (!files.length) { setShake(true); setTimeout(()=>setShake(false),600); return; }
    setUploading(true); setError(null);
    setFiles(prev => prev.map(f => ({...f, status:"uploading", progress:0})));
    try {
      const { urls, errors } = await uploadFiles(
        files.map(f=>f.file),
        (idx,pct) => updateFile(idx,{progress:pct, status:pct===100?"done":"uploading"})
      );
      if (errors.length) {
        errors.forEach(e => { const idx=files.findIndex(f=>f.file===e.file); if(idx>=0) updateFile(idx,{status:"error"}); });
        setError(`${errors.length} file non caricati.`);
      }
      if (urls.length) {
        const saved = await savePosts(urls.map(({file,url}) => ({
          author:guestName, avatar:initials, color:getAvatarColor(initials),
          type:file.type.startsWith("video")?"video":"image",
          url, caption:caption.trim(),
        })));
        saved.forEach(p => onPublished(p));
      }
      setFiles(prev => prev.filter(f=>f.status==="error"));
      setCaption("");
    } catch(err) {
      setError("Errore durante il caricamento. Riprova.");
      setFiles(prev => prev.map(f=>({...f,status:"error"})));
    } finally { setUploading(false); }
  };

  const doneCount = files.filter(f=>f.status==="done").length;
  const totalProg = files.length ? Math.round(files.reduce((s,f)=>s+f.progress,0)/files.length) : 0;

  return (
    <div style={s.uploadSection}>
      <div style={s.uploadCard}>
        {/* Corner ornaments */}
        <div style={{ ...s.corner, top:12, left:12, borderTop:`1px solid ${C.border}`, borderLeft:`1px solid ${C.border}` }} />
        <div style={{ ...s.corner, top:12, right:12, borderTop:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}` }} />
        <div style={{ ...s.corner, bottom:12, left:12, borderBottom:`1px solid ${C.border}`, borderLeft:`1px solid ${C.border}` }} />
        <div style={{ ...s.corner, bottom:12, right:12, borderBottom:`1px solid ${C.border}`, borderRight:`1px solid ${C.border}` }} />

        <div style={s.badgeSmall}>Condividi un Ricordo</div>
        <Ornament size={80} />

        {error && <div style={s.errorBanner}>⚠ {error}</div>}

        {/* Drop zone */}
        <div
          style={{
            ...s.dropzone,
            ...(shake ? s.shake : {}),
            borderColor: files.length ? C.accent : C.border,
            background: files.length ? "#fffcf5" : "#fdfaf5",
          }}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !uploading && fileRef.current.click()}
        >
          {files.length === 0 ? (
            <div style={s.dropInner}>
              <div style={s.dropIconElegant}>✦</div>
              <div style={s.dropTextMain}>Trascina foto e video qui</div>
              <div style={s.dropTextSub}>oppure clicca per scegliere · max {config.maxFilesPerUpload} file</div>
            </div>
          ) : (
            <div style={s.previewGrid}>
              {files.map((f,i) => (
                <div key={i} style={s.previewThumb}>
                  {f.type==="video"
                    ? <video src={f.preview} style={s.thumbMedia}/>
                    : <img src={f.preview} alt="" style={s.thumbMedia}/>}
                  {f.status==="uploading" && <div style={s.thumbOverlay}><span style={{fontSize:11,fontWeight:600,color:"#fff"}}>{f.progress}%</span></div>}
                  {f.status==="done" && <div style={{...s.thumbOverlay,background:"rgba(100,160,80,.5)"}}><span style={{fontSize:16}}>✓</span></div>}
                  {f.status==="error" && <div style={{...s.thumbOverlay,background:"rgba(180,60,60,.5)"}}><span style={{fontSize:14}}>✕</span></div>}
                  {!uploading && <button style={s.thumbRemove} onClick={e=>{e.stopPropagation();removeFile(i);}}>✕</button>}
                </div>
              ))}
              {files.length < config.maxFilesPerUpload && !uploading && (
                <div style={s.addMoreThumb} onClick={e=>{e.stopPropagation();fileRef.current.click();}}>
                  <span style={{fontSize:22,color:C.textLight}}>+</span>
                  <span style={{fontSize:9,color:C.textLight,marginTop:2}}>aggiungi</span>
                </div>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple
            style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/>
        </div>

        {files.length > 0 && (
          <p style={s.fileCountLabel}>
            {uploading ? `Caricamento ${doneCount}/${files.length} — ${totalProg}%` : `${files.length} file selezionat${files.length===1?"o":"i"}`}
          </p>
        )}
        {uploading && (
          <div style={s.progressWrap}>
            <div style={{...s.progressFill, width:`${totalProg}%`, background:C.accent}}/>
          </div>
        )}

        <textarea
          style={s.elegantTextarea}
          placeholder="Una dedica, un pensiero... (opzionale)"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          rows={2}
          disabled={uploading}
        />

        <button
          style={{...s.goldBtn, opacity:uploading?.65:1}}
          onClick={handlePost}
          disabled={uploading}
        >
          {uploading
            ? `⟳ Caricamento ${doneCount}/${files.length}...`
            : files.length > 1 ? `Pubblica ${files.length} foto` : "Pubblica nella Galleria"}
        </button>

        {hasPosts && (
          <button style={s.ghostBtn} onClick={onSlideshow}>
            ▶ Guarda la Presentazione
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, layout, onLike, onExpand }) {
  return (
    <div style={layout==="grid" ? s.gridCard : s.feedCard}>
      <div style={s.cardMediaWrap} onClick={() => post.type==="image" && onExpand(post.url)}>
        {post.type==="video"
          ? <video src={post.url} style={s.cardMedia} controls playsInline/>
          : <img src={post.url} alt={post.caption||""} style={s.cardMedia} loading="lazy"/>}
        {post.type==="image" && <div style={s.zoomHint}>⊕</div>}
      </div>
      <div style={s.cardBody}>
        <div style={s.cardMeta}>
          <div style={{...s.cardAvatar, background:post.color}}>{post.avatar}</div>
          <div>
            <div style={s.cardAuthor}>{post.author}</div>
            <div style={s.cardTime}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        {post.caption && (
          <p style={s.cardCaption}>
            <span style={{color:C.accentLight, marginRight:4}}>"</span>
            {post.caption}
            <span style={{color:C.accentLight, marginLeft:4}}>"</span>
          </p>
        )}
        <div style={s.cardFooter}>
          <button style={{...s.likeBtn, color:post.liked?C.accent:C.textLight}} onClick={()=>onLike(post.id)}>
            {post.liked ? "♥" : "♡"} <span style={{marginLeft:4}}>{post.likes}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slideshow ────────────────────────────────────────────────────────────────
function Slideshow({ posts, onClose }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused]   = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const progRef  = useRef(null);
  const DURATION = 4500;

  const total = posts.length;
  const post  = posts[current];

  const goTo = useCallback(idx => { setCurrent((idx+total)%total); setProgress(0); }, [total]);
  const goNext = useCallback(() => goTo(current+1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current-1), [current, goTo]);

  useEffect(() => {
    if (paused || post?.type==="video") return;
    setProgress(0);
    const start = Date.now();
    progRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now()-start)/DURATION)*100,100));
    }, 30);
    timerRef.current = setTimeout(goNext, DURATION);
    return () => { clearTimeout(timerRef.current); clearInterval(progRef.current); };
  }, [current, paused, goNext, post?.type]);

  useEffect(() => {
    const h = e => {
      if (e.key==="ArrowRight") goNext();
      if (e.key==="ArrowLeft")  goPrev();
      if (e.key==="Escape")     onClose();
      if (e.key===" ")          setPaused(p=>!p);
    };
    window.addEventListener("keydown",h);
    return () => window.removeEventListener("keydown",h);
  }, [goNext,goPrev,onClose]);

  if (!post) return null;

  return (
    <div style={ss.overlay}>
      {/* Progress bars */}
      <div style={ss.progRow}>
        {posts.map((_,i) => (
          <div key={i} style={ss.progTrack}>
            <div style={{...ss.progFill, background:C.accentLight, width:i<current?"100%":i===current?`${progress}%`:"0%"}}/>
          </div>
        ))}
      </div>
      {/* Top bar */}
      <div style={ss.topBar}>
        <div style={ss.authorInfo}>
          <div style={{...ss.dot, background:post.color}}>{post.avatar}</div>
          <div>
            <div style={{color:"#fff",fontSize:12,fontWeight:500}}>{post.author}</div>
            <div style={{color:"rgba(255,255,255,.45)",fontSize:10}}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={ss.btn} onClick={()=>setPaused(p=>!p)}>{paused?"▶":"⏸"}</button>
          <button style={ss.btn} onClick={onClose}>✕</button>
        </div>
      </div>
      {/* Media */}
      <div style={ss.mediaWrap} onClick={goNext}>
        {post.type==="video"
          ? <video key={post.id} src={post.url} style={ss.media} autoPlay playsInline controls onClick={e=>e.stopPropagation()} onEnded={goNext}/>
          : <img key={post.id} src={post.url} alt="" style={ss.media}/>}
        <div style={ss.zoneL} onClick={e=>{e.stopPropagation();goPrev();}}/>
        <div style={ss.zoneR} onClick={e=>{e.stopPropagation();goNext();}}/>
      </div>
      {post.caption && <div style={ss.caption}>"{post.caption}"</div>}
      <button style={{...ss.nav, left:16}} onClick={goPrev}>‹</button>
      <button style={{...ss.nav, right:16}} onClick={goNext}>›</button>
      <div style={ss.counter}>{current+1} di {total}</div>
    </div>
  );
}

const ss = {
  overlay:  {position:"fixed",inset:0,background:"#000",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},
  progRow:  {position:"absolute",top:0,left:0,right:0,display:"flex",gap:3,padding:"14px 18px 0",zIndex:10},
  progTrack:{flex:1,height:1.5,background:"rgba(255,255,255,.15)",borderRadius:2,overflow:"hidden"},
  progFill: {height:"100%",borderRadius:2,transition:"width .03s linear"},
  topBar:   {position:"absolute",top:22,left:0,right:0,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",zIndex:10},
  authorInfo:{display:"flex",alignItems:"center",gap:10},
  dot:      {width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0},
  btn:      {background:"rgba(255,255,255,.1)",border:"none",color:"#fff",borderRadius:"50%",width:34,height:34,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"},
  mediaWrap:{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",cursor:"pointer"},
  media:    {maxWidth:"100%",maxHeight:"100vh",objectFit:"contain",display:"block",userSelect:"none"},
  zoneL:    {position:"absolute",left:0,top:0,width:"30%",height:"100%"},
  zoneR:    {position:"absolute",right:0,top:0,width:"30%",height:"100%"},
  caption:  {position:"absolute",bottom:56,left:0,right:0,textAlign:"center",color:"rgba(255,255,255,.75)",fontSize:14,padding:"0 60px",lineHeight:1.6,fontStyle:"italic",fontFamily:"'EB Garamond',serif",pointerEvents:"none"},
  nav:      {position:"absolute",top:"50%",transform:"translateY(-50%)",background:"rgba(255,255,255,.08)",border:"none",color:"rgba(255,255,255,.7)",borderRadius:"50%",width:44,height:44,fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"},
  counter:  {position:"absolute",bottom:18,left:"50%",transform:"translateX(-50%)",color:"rgba(255,255,255,.35)",fontSize:10,letterSpacing:3,fontFamily:"'EB Garamond',serif"},
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [guestName, setGuestName]         = useState("");
  const [posts, setPosts]                 = useState([]);
  const [loading, setLoading]             = useState(true);
  const [view, setView]                   = useState("grid");
  const [lightbox, setLightbox]           = useState(null);
  const [showQR, setShowQR]               = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdmin, setShowAdmin]         = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const galleryRef = useRef();

  const initials = getInitials(guestName || "?");

  useEffect(() => {
    fetchPosts()
      .then(data => setPosts(data.map(p=>({...p,liked:false}))))
      .catch(console.error)
      .finally(()=>setLoading(false));
  }, []);

  useEffect(() => {
    const ch = supabase.channel("posts-live")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"posts"},
        payload => setPosts(prev => {
          if (prev.find(p=>p.id===payload.new.id)) return prev;
          return [{...payload.new,liked:false},...prev];
        })
      ).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const handlePublished = post => {
    setPosts(prev => {
      if (prev.find(p=>p.id===post.id)) return prev;
      return [{...post,liked:false},...prev];
    });
    setTimeout(()=>galleryRef.current?.scrollIntoView({behavior:"smooth"}),150);
  };

  const toggleLike = id => {
    setPosts(prev => prev.map(post => {
      if (post.id!==id) return post;
      const liked=!post.liked, likes=liked?post.likes+1:post.likes-1;
      updateLikes(id,likes);
      return {...post,liked,likes};
    }));
  };

  const handleDeleted = ids => setPosts(prev=>prev.filter(p=>!ids.includes(p.id)));

  if (!guestName) return <NameScreen onEnter={setGuestName}/>;

  return (
    <div style={{...s.app, background:C.background}}>
      <div style={s.paperTexture}/>

      {/* Header */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.headerLeft}>
            <div style={s.badgeSmall}>✦ Galleria del Ricordo ✦</div>
            <h1 style={s.siteTitle}>{config.eventName}</h1>
            {config.eventSubtitle && <div style={s.siteSubtitle}>{config.eventSubtitle}</div>}
          </div>
          <nav style={s.headerNav}>
            <button style={s.navIconBtn} onClick={()=>setShowAdminLogin(true)} title="Admin">⚙</button>
            <button style={s.navGoldBtn} onClick={()=>setShowQR(true)}>QR Code</button>
            <div style={{...s.guestAvatar, background:getAvatarColor(initials)}} title={guestName}>{initials}</div>
            <div style={s.viewToggle}>
              <button style={{...s.viewBtn,...(view==="grid"?s.viewBtnActive:{})}} onClick={()=>setView("grid")}>⊞</button>
              <button style={{...s.viewBtn,...(view==="feed"?s.viewBtnActive:{})}} onClick={()=>setView("feed")}>☰</button>
            </div>
          </nav>
        </div>
        <div style={s.headerRule}/>
      </header>

      {/* Upload */}
      <UploadPanel
        guestName={guestName} initials={initials}
        onPublished={handlePublished}
        hasPosts={posts.length>0}
        onSlideshow={()=>setShowSlideshow(true)}
      />

      {/* Section header */}
      {!loading && posts.length > 0 && (
        <div style={s.galleryHeader} ref={galleryRef}>
          <Ornament size={160}/>
          <div style={s.galleryTitle}>I Vostri Ricordi</div>
          <p style={s.galleryCount}>{posts.length} {posts.length===1?"momento condiviso":"momenti condivisi"}</p>
        </div>
      )}

      {/* Gallery */}
      <div style={view==="grid" ? s.grid : s.feed}>
        {loading ? (
          <div style={s.stateMsg}>Caricamento in corso...</div>
        ) : posts.length===0 ? (
          <div style={s.stateMsg}>
            <div style={{fontSize:32,marginBottom:12,color:C.accentLight}}>✦</div>
            Sii il primo a condividere un ricordo speciale.
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} layout={view} onLike={toggleLike} onExpand={setLightbox}/>
          ))
        )}
      </div>

      {/* Footer */}
      <footer style={s.footer}>
        <Ornament size={120}/>
        <p style={s.footerText}>Con affetto, per Cosimo &amp; Lucia</p>
      </footer>

      {/* Lightbox */}
      {lightbox && (
        <div style={s.lightboxOverlay} onClick={()=>setLightbox(null)}>
          <img src={lightbox} alt="" style={s.lightboxImg} onClick={e=>e.stopPropagation()}/>
          <button style={s.lightboxClose} onClick={()=>setLightbox(null)}>✕</button>
        </div>
      )}

      {showQR          && <QRModal onClose={()=>setShowQR(false)}/>}
      {showAdminLogin  && <AdminLogin onSuccess={()=>{setShowAdminLogin(false);setShowAdmin(true);}} onClose={()=>setShowAdminLogin(false)}/>}
      {showAdmin       && <AdminPanel posts={posts} onDelete={handleDeleted} onClose={()=>setShowAdmin(false)}/>}
      {showSlideshow   && <Slideshow posts={posts} onClose={()=>setShowSlideshow(false)}/>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:${C.background}; }
        input::placeholder, textarea::placeholder { color:${C.textLight}; font-style:italic; font-family:'EB Garamond',serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:${C.background}; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  // Layout
  app:        { minHeight:"100vh", fontFamily:"'EB Garamond',serif", color:C.text, position:"relative", paddingBottom:80 },
  paperTexture:{ position:"fixed", inset:0, backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`, pointerEvents:"none", zIndex:0, opacity:.7 },

  // Header
  header:       { background:`${C.background}ee`, borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:100, backdropFilter:"blur(12px)" },
  headerInner:  { maxWidth:1000, margin:"0 auto", padding:"16px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 },
  headerLeft:   { flex:1 },
  headerRule:   { height:1, background:`linear-gradient(to right, transparent, ${C.accentLight}, transparent)`, margin:"0 28px" },
  siteTitle:    { fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, color:C.text, letterSpacing:.5, fontStyle:"italic" },
  siteSubtitle: { fontSize:11, color:C.textMuted, letterSpacing:2, marginTop:2, textTransform:"uppercase" },
  headerNav:    { display:"flex", alignItems:"center", gap:12, flexShrink:0 },
  navIconBtn:   { background:"none", border:"none", fontSize:16, cursor:"pointer", color:C.textMuted, padding:"4px 6px" },
  navGoldBtn:   { background:"none", border:`1px solid ${C.accentLight}`, borderRadius:2, padding:"6px 14px", fontSize:11, fontFamily:"'EB Garamond',serif", color:C.accent, cursor:"pointer", letterSpacing:1, textTransform:"uppercase" },
  guestAvatar:  { width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 },
  viewToggle:   { display:"flex", border:`1px solid ${C.border}`, borderRadius:2, overflow:"hidden" },
  viewBtn:      { background:"transparent", border:"none", color:C.textLight, padding:"5px 10px", cursor:"pointer", fontSize:13 },
  viewBtnActive:{ background:C.background, color:C.accent },

  // Badge
  badgeSmall: { fontSize:9, letterSpacing:4, color:C.accent, textTransform:"uppercase", marginBottom:10 },

  // Name screen
  nameScreen:  { minHeight:"100vh", background:C.background, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden", padding:20 },
  nameCard:    { background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:"56px 52px", maxWidth:460, width:"100%", textAlign:"center", position:"relative", animation:"fadeUp .7s ease both", zIndex:1, boxShadow:`0 2px 40px rgba(184,150,90,.08)` },
  corner:      { position:"absolute", width:20, height:20 },
  heroTitle:   { fontFamily:"'Cormorant Garamond',serif", fontSize:52, fontWeight:300, color:C.text, marginBottom:6, fontStyle:"italic", lineHeight:1.1 },
  heroSubtitle:{ fontSize:12, letterSpacing:3, color:C.accent, textTransform:"uppercase", marginBottom:4 },
  heroDate:    { fontSize:12, color:C.textMuted, letterSpacing:1, marginBottom:20, fontStyle:"italic" },
  welcomeText: { fontSize:16, color:C.text, lineHeight:1.7, margin:"20px 0 24px", fontStyle:"italic" },
  nameFootnote:{ fontSize:11, color:C.textLight, marginTop:16, fontStyle:"italic", letterSpacing:.5 },

  // Inputs
  elegantInput: { width:"100%", background:"transparent", border:"none", borderBottom:`1px solid ${C.border}`, padding:"12px 4px", fontSize:16, fontFamily:"'EB Garamond',serif", color:C.text, outline:"none", textAlign:"center", letterSpacing:.5 },
  elegantTextarea: { width:"100%", background:"transparent", border:`1px solid ${C.border}`, borderRadius:2, padding:"12px 14px", fontSize:15, fontFamily:"'EB Garamond',serif", color:C.text, outline:"none", resize:"none", lineHeight:1.6, marginBottom:14 },

  // Buttons
  goldBtn:  { display:"block", width:"100%", background:`linear-gradient(135deg, ${C.accent}, ${C.accentLight})`, border:"none", borderRadius:2, padding:"13px 24px", fontSize:13, fontFamily:"'EB Garamond',serif", fontWeight:500, cursor:"pointer", color:"#fff", letterSpacing:2, textTransform:"uppercase", transition:"opacity .2s" },
  ghostBtn: { display:"block", width:"100%", background:"transparent", border:`1px solid ${C.border}`, borderRadius:2, padding:"11px 24px", fontSize:12, fontFamily:"'EB Garamond',serif", cursor:"pointer", color:C.textMuted, letterSpacing:2, textTransform:"uppercase", marginTop:10 },
  softBtn:  { background:"transparent", border:`1px solid ${C.border}`, color:C.textMuted, borderRadius:2, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"'EB Garamond',serif", letterSpacing:1 },
  redBtn:   { background:"transparent", border:"1px solid #e0a0a0", color:"#c04040", borderRadius:2, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"'EB Garamond',serif", letterSpacing:1 },

  // Upload
  uploadSection:{ maxWidth:600, margin:"40px auto 0", padding:"0 24px", position:"relative", zIndex:1 },
  uploadCard:   { background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:"36px 36px 32px", textAlign:"center", position:"relative", boxShadow:`0 2px 24px rgba(184,150,90,.06)` },
  dropzone:     { border:`1.5px dashed`, borderRadius:2, minHeight:150, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all .25s", overflow:"hidden", marginBottom:12, marginTop:16 },
  dropInner:    { textAlign:"center", padding:28 },
  dropIconElegant: { fontSize:22, color:C.accentLight, marginBottom:10 },
  dropTextMain: { fontSize:15, color:C.textMuted, marginBottom:4, fontStyle:"italic" },
  dropTextSub:  { fontSize:11, color:C.textLight, letterSpacing:.5 },
  previewGrid:  { display:"flex", flexWrap:"wrap", gap:8, padding:14, width:"100%" },
  previewThumb: { width:80, height:80, borderRadius:2, overflow:"hidden", position:"relative", flexShrink:0, background:C.border },
  thumbMedia:   { width:"100%", height:"100%", objectFit:"cover", display:"block" },
  thumbOverlay: { position:"absolute", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff" },
  thumbRemove:  { position:"absolute", top:3, right:3, background:"rgba(0,0,0,.5)", border:"none", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  addMoreThumb: { width:80, height:80, borderRadius:2, border:`1.5px dashed ${C.border}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 },
  fileCountLabel:{ fontSize:11, color:C.textMuted, marginBottom:10, fontStyle:"italic" },
  progressWrap: { height:2, background:C.border, borderRadius:2, marginBottom:14, overflow:"hidden" },
  progressFill: { height:"100%", borderRadius:2, transition:"width .3s ease", animation:"pulse 1.2s ease infinite" },
  errorBanner:  { background:"#fdf0f0", border:"1px solid #e8c0c0", borderRadius:2, padding:"10px 14px", color:"#c04040", fontSize:12, marginBottom:14, textAlign:"left" },
  shake:        { animation:"shake .5s ease" },

  // Gallery
  galleryHeader:{ maxWidth:1000, margin:"40px auto 0", padding:"0 24px", textAlign:"center" },
  galleryTitle: { fontFamily:"'Cormorant Garamond',serif", fontSize:30, fontWeight:300, fontStyle:"italic", color:C.text, margin:"16px 0 6px" },
  galleryCount: { fontSize:11, color:C.textMuted, letterSpacing:2, textTransform:"uppercase" },
  grid:         { maxWidth:1000, margin:"24px auto 0", padding:"0 24px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20 },
  feed:         { maxWidth:580, margin:"24px auto 0", padding:"0 24px", display:"flex", flexDirection:"column", gap:24 },
  stateMsg:     { gridColumn:"1/-1", textAlign:"center", color:C.textMuted, padding:"70px 20px", fontSize:15, lineHeight:2, fontStyle:"italic" },

  // Cards
  gridCard:     { background:C.card, border:`1px solid ${C.border}`, borderRadius:3, overflow:"hidden", animation:"fadeUp .4s ease both", boxShadow:`0 1px 12px rgba(44,36,22,.04)` },
  feedCard:     { background:C.card, border:`1px solid ${C.border}`, borderRadius:3, overflow:"hidden", animation:"fadeUp .4s ease both", boxShadow:`0 1px 12px rgba(44,36,22,.04)` },
  cardMediaWrap:{ position:"relative", cursor:"pointer", overflow:"hidden", background:C.border },
  cardMedia:    { width:"100%", height:220, objectFit:"cover", display:"block", transition:"transform .4s ease" },
  zoomHint:     { position:"absolute", bottom:10, right:10, background:"rgba(250,247,242,.8)", color:C.accent, borderRadius:2, padding:"3px 7px", fontSize:12 },
  cardBody:     { padding:"16px 18px 14px" },
  cardMeta:     { display:"flex", alignItems:"center", gap:10, marginBottom:10 },
  cardAvatar:   { width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:"#fff", flexShrink:0 },
  cardAuthor:   { fontSize:13, fontWeight:500, color:C.text, fontFamily:"'EB Garamond',serif" },
  cardTime:     { fontSize:10, color:C.textLight, letterSpacing:.5 },
  cardCaption:  { fontSize:14, color:C.textMuted, lineHeight:1.6, marginBottom:10, fontStyle:"italic" },
  cardFooter:   { borderTop:`1px solid ${C.border}`, paddingTop:10, display:"flex", justifyContent:"flex-end" },
  likeBtn:      { background:"none", border:"none", cursor:"pointer", fontSize:14, fontFamily:"'EB Garamond',serif", display:"flex", alignItems:"center", transition:"color .15s", padding:0 },

  // Footer
  footer:       { maxWidth:1000, margin:"60px auto 0", padding:"0 24px 40px", textAlign:"center" },
  footerText:   { fontSize:13, color:C.textLight, fontStyle:"italic", marginTop:14, letterSpacing:.5 },

  // Lightbox
  lightboxOverlay:{ position:"fixed", inset:0, background:"rgba(44,36,22,.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, cursor:"zoom-out" },
  lightboxImg:    { maxWidth:"90vw", maxHeight:"90vh", objectFit:"contain", cursor:"default", borderRadius:2 },
  lightboxClose:  { position:"absolute", top:20, right:24, background:"none", border:`1px solid rgba(255,255,255,.2)`, color:"rgba(255,255,255,.6)", borderRadius:2, width:32, height:32, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },

  // Modals
  overlay:       { position:"fixed", inset:0, background:"rgba(44,36,22,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, backdropFilter:"blur(4px)", padding:20 },
  modalBox:      { background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:"40px 44px", maxWidth:400, width:"100%", textAlign:"center", animation:"fadeUp .3s ease both", boxShadow:`0 8px 48px rgba(44,36,22,.12)`, position:"relative" },
  modalOrnamentTop:{ fontSize:14, color:C.accentLight, marginBottom:12 },
  modalTitle:    { fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:300, fontStyle:"italic", color:C.text, marginBottom:12 },
  modalSub:      { fontSize:13, color:C.textMuted, lineHeight:1.6 },
  errorText:     { fontSize:11, color:"#c04040", marginTop:8 },
  qrWrap:        { background:C.background, borderRadius:3, padding:16, display:"inline-flex", marginBottom:12, marginTop:16, border:`1px solid ${C.border}` },
  qrImg:         { width:180, height:180, display:"block" },
  qrUrl:         { fontSize:10, color:C.textLight, marginBottom:8, wordBreak:"break-all", letterSpacing:.5 },

  // Admin
  adminPanel:  { background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:"28px 28px 32px", maxWidth:680, width:"95%", maxHeight:"88vh", display:"flex", flexDirection:"column", animation:"fadeUp .3s ease both", overflow:"hidden", boxShadow:`0 8px 48px rgba(44,36,22,.1)` },
  adminHead:   { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, flexShrink:0 },
  adminHeadText:{ textAlign:"left" },
  closeBtn:    { background:"none", border:"none", color:C.textMuted, fontSize:16, cursor:"pointer", padding:"2px 6px" },
  adminToolbar:{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", margin:"16px 0", flexShrink:0 },
  countLabel:  { fontSize:11, color:C.textMuted, fontStyle:"italic" },
  confirmRow:  { display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" },
  adminGrid:   { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:10, overflowY:"auto" },
  adminThumb:  { position:"relative", borderRadius:2, overflow:"hidden", cursor:"pointer", background:C.border, aspectRatio:"1", transition:"outline .15s" },
  adminMedia:  { width:"100%", height:"100%", objectFit:"cover", display:"block" },
  adminCheck:  { position:"absolute", top:5, left:5, width:18, height:18, borderRadius:3, border:"1.5px solid", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .15s" },
  adminLabel:  { position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,.55)", padding:"3px 5px" },
  videoBadge:  { position:"absolute", top:5, right:5, background:"rgba(0,0,0,.55)", borderRadius:2, padding:"1px 5px", fontSize:8, color:"#fff" },
};
