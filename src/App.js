import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { uploadFiles, savePosts, fetchPosts, updateLikes, deletePosts } from "./api";
import { getAvatarColor, getInitials, timeAgo } from "./utils";
import config from "./config";

// ── Midnight-luxury palette ───────────────────────────────────────────────────
const C = {
  bg:          "#0e1117",   // notte profonda
  bgCard:      "#141921",   // carta notturna
  bgElevated:  "#1a2030",   // superficie elevata
  bgModal:     "#111520",   // modale scura

  gold:        "#c9a84c",   // oro champagne
  goldLight:   "#e0c87a",   // oro luminoso
  goldPale:    "#c9a84c22", // oro trasparente

  white:       "#f0ede8",   // bianco caldo
  whiteMuted:  "#a8a49e",   // bianco attenuato
  whiteFaint:  "#5a5650",   // bianco lieve

  border:      "#c9a84c30", // bordo dorato tenue
  borderStrong:"#c9a84c60", // bordo più visibile
};

// ── Decorative rule ────────────────────────────────────────────────────────────
const Rule = ({ width = 200 }) => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, margin:"16px auto" }}>
    <div style={{ height:1, width:width/2-18, background:`linear-gradient(to right, transparent, ${C.gold})` }} />
    <div style={{ fontSize:8, color:C.gold, letterSpacing:4 }}>✦</div>
    <div style={{ height:1, width:width/2-18, background:`linear-gradient(to left, transparent, ${C.gold})` }} />
  </div>
);

// ── Roman numeral helper ───────────────────────────────────────────────────────
const toRoman = n => {
  const v=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const s=["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  return v.reduce((r,val,i)=>{ while(n>=val){r+=s[i];n-=val;} return r; },"");
};

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
      <div style={{ ...s.modal, ...(shake ? { animation:"shake .5s ease" } : {}) }} onClick={e => e.stopPropagation()}>
        <button style={s.closeX} onClick={onClose}>✕</button>
        <div style={s.modalEyebrow}>AREA RISERVATA</div>
        <h3 style={s.modalHeading}>Amministrazione</h3>
        <Rule width={180} />
        <p style={s.modalBody}>Inserisci la password per gestire la galleria.</p>
        <input
          style={{ ...s.lineInput, borderColor: error ? "#c06060" : C.border, marginTop:20 }}
          type="password" placeholder="Password..."
          value={pwd}
          onChange={e => { setPwd(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          autoFocus
        />
        {error && <p style={{ fontSize:11, color:"#d07070", marginTop:8 }}>Password errata. Riprova.</p>}
        <button style={{ ...s.goldBtn, marginTop:20, opacity: pwd ? 1 : 0.4 }} onClick={handleSubmit} disabled={!pwd}>
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
      setSelected(new Set()); setConfirm(false);
    } catch(err){ console.error(err); }
    finally { setDeleting(false); }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.adminPanel} onClick={e => e.stopPropagation()}>
        <div style={s.adminHead}>
          <div>
            <div style={s.eyebrow}>PANNELLO ADMIN</div>
            <h3 style={s.modalHeading}>Gestisci Galleria</h3>
          </div>
          <button style={s.closeX} onClick={onClose}>✕</button>
        </div>
        <Rule />
        <div style={s.adminToolbar}>
          <button style={s.pillBtn} onClick={toggleAll}>
            {selected.size === posts.length ? "Deseleziona tutto" : "Seleziona tutto"}
          </button>
          <span style={{ fontSize:11, color:C.whiteMuted, fontStyle:"italic" }}>
            {selected.size > 0 ? `${selected.size} selezionati` : `${posts.length} elementi`}
          </span>
          {selected.size > 0 && !confirm && (
            <button style={s.redPillBtn} onClick={() => setConfirm(true)}>Elimina {selected.size}</button>
          )}
          {confirm && (
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:"#d07070" }}>Confermi?</span>
              <button style={s.redPillBtn} onClick={handleDelete} disabled={deleting}>
                {deleting ? "⟳ Eliminazione..." : "Sì, elimina"}
              </button>
              <button style={s.pillBtn} onClick={() => setConfirm(false)}>Annulla</button>
            </div>
          )}
        </div>
        {posts.length === 0 ? (
          <div style={{ textAlign:"center", color:C.whiteMuted, padding:"40px 0", fontSize:13, fontStyle:"italic" }}>Galleria vuota.</div>
        ) : (
          <div style={s.adminGrid}>
            {posts.map(post => {
              const sel = selected.has(post.id);
              return (
                <div key={post.id}
                  style={{ ...s.adminThumb, outline: sel ? `2px solid ${C.gold}` : "2px solid transparent" }}
                  onClick={() => toggle(post.id)}
                >
                  {post.type === "video"
                    ? <video src={post.url} style={s.adminMedia} />
                    : <img src={post.url} alt="" style={s.adminMedia} loading="lazy" />
                  }
                  <div style={{ ...s.adminCheck, background: sel ? C.gold : "rgba(0,0,0,.5)", borderColor: sel ? C.gold : C.whiteFaint }}>
                    {sel && <span style={{ fontSize:9, color:"#111" }}>✓</span>}
                  </div>
                  <div style={s.adminLabel}>
                    <div style={{ ...s.adminAvatar, background: post.color }}>{post.avatar}</div>
                    <span style={{ fontSize:9, color:"#ddd", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{post.author}</span>
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
  const url    = config.appUrl;
  const qrSrc  = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=300&dark=c9a84c&light=0e1117&ecLevel=H`;

  const handlePrint = () => {
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>QR — ${config.eventName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&family=Jost:wght@300;400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'Jost',sans-serif}
        .wrap{border:1px solid #c9a84c;border-radius:4px;padding:52px 60px;text-align:center;max-width:440px;width:90%;position:relative}
        .wrap::before{content:"";position:absolute;inset:6px;border:1px solid #e0c87a40;border-radius:2px;pointer-events:none}
        .eyebrow{font-size:9px;letter-spacing:4px;color:#a08040;text-transform:uppercase;margin-bottom:20px}
        .title{font-family:'Playfair Display',serif;font-size:36px;font-weight:400;color:#1a1008;margin-bottom:4px;font-style:italic}
        .sub{font-size:11px;color:#a08040;letter-spacing:2px;margin-bottom:28px;text-transform:uppercase}
        .qr{width:200px;height:200px;border-radius:4px}
        .rule{display:flex;align-items:center;gap:10;margin:20px auto;max-width:200px}
        .rule-line{height:1px;flex:1;background:linear-gradient(to right,transparent,#c9a84c)}
        .rule-line.r{background:linear-gradient(to left,transparent,#c9a84c)}
        .dot{font-size:8px;color:#c9a84c;letter-spacing:4px}
        .cta{margin-top:20px;font-size:12px;color:#666;line-height:1.8}
        .url{font-size:10px;color:#bbb;margin-top:10px;word-break:break-all}
      </style>
    </head><body>
      <div class="wrap">
        <div class="eyebrow">Galleria degli Ospiti</div>
        <div class="title">${config.eventName}</div>
        <div class="sub">${config.eventSubtitle || ""}</div>
        <img class="qr" src="https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=400&dark=1a1008&light=ffffff&ecLevel=H" />
        <div class="rule"><div class="rule-line"></div><div class="dot">✦</div><div class="rule-line r"></div></div>
        <div class="cta">Inquadra il codice con la fotocamera<br>e condividi i tuoi ricordi</div>
        <div class="url">${url}</div>
      </div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <button style={s.closeX} onClick={onClose}>✕</button>
        <div style={s.eyebrow}>QR CODE</div>
        <h3 style={s.modalHeading}>{config.eventName}</h3>
        <Rule width={180} />
        <div style={{ background:"#0a0d13", borderRadius:4, padding:20, display:"inline-flex", margin:"8px 0 12px", border:`1px solid ${C.border}` }}>
          <img src={qrSrc} alt="QR Code" style={{ width:180, height:180, display:"block", borderRadius:2 }} />
        </div>
        <p style={{ fontSize:10, color:C.whiteFaint, marginBottom:6, wordBreak:"break-all", letterSpacing:.5 }}>{url}</p>
        <p style={{ fontSize:12, color:C.whiteMuted, lineHeight:1.7, marginBottom:20 }}>
          Gli ospiti inquadrano il codice e accedono alla galleria.
        </p>
        <button style={s.goldBtn} onClick={handlePrint}>Stampa invito con QR</button>
      </div>
    </div>
  );
}

// ─── Slideshow ────────────────────────────────────────────────────────────────
function Slideshow({ posts, onClose }) {
  const [current, setCurrent]   = useState(0);
  const [paused, setPaused]     = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const progRef  = useRef(null);
  const DURATION = 4000;

  const items = posts.filter(p => p.type === "image" || p.type === "video");
  const total = items.length;
  const post  = items[current];

  const goTo = useCallback(idx => { setCurrent((idx+total)%total); setProgress(0); }, [total]);
  const goNext = useCallback(() => goTo(current+1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current-1), [current, goTo]);

  useEffect(() => {
    if (paused || post?.type==="video") return;
    setProgress(0);
    const start = Date.now();
    progRef.current = setInterval(() => setProgress(Math.min((Date.now()-start)/DURATION*100,100)), 30);
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
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [goNext, goPrev, onClose]);

  if (!post) return null;

  return (
    <div style={{ position:"fixed", inset:0, background:"#050709", zIndex:2000, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      {/* Progress bars */}
      <div style={{ position:"absolute", top:0, left:0, right:0, display:"flex", gap:3, padding:"14px 18px 0", zIndex:10 }}>
        {items.map((_, i) => (
          <div key={i} style={{ flex:1, height:1.5, background:"rgba(201,168,76,.2)", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:2, background:C.gold, width: i<current?"100%":i===current?`${progress}%`:"0%", transition:i===current?"none":undefined }} />
          </div>
        ))}
      </div>
      {/* Top bar */}
      <div style={{ position:"absolute", top:22, left:0, right:0, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 18px", zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ ...ss.avatar, background:post.color }}>{post.avatar}</div>
          <div>
            <div style={{ color:C.white, fontSize:13, fontFamily:"'Jost',sans-serif", letterSpacing:.5 }}>{post.author}</div>
            <div style={{ color:C.whiteFaint, fontSize:10, fontFamily:"'Jost',sans-serif" }}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={ss.ctrl} onClick={() => setPaused(p=>!p)}>{paused?"▶":"⏸"}</button>
          <button style={ss.ctrl} onClick={onClose}>✕</button>
        </div>
      </div>
      {/* Media */}
      <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }} onClick={goNext}>
        {post.type === "video"
          ? <video key={post.id} src={post.url} style={ss.media} autoPlay playsInline controls onClick={e=>e.stopPropagation()} onEnded={goNext} />
          : <img key={post.id} src={post.url} alt="" style={ss.media} />
        }
        <div style={{ position:"absolute", left:0, top:0, width:"30%", height:"100%" }} onClick={e=>{e.stopPropagation();goPrev();}} />
        <div style={{ position:"absolute", right:0, top:0, width:"30%", height:"100%" }} onClick={e=>{e.stopPropagation();goNext();}} />
      </div>
      {/* Caption */}
      {post.caption && (
        <div style={{ position:"absolute", bottom:56, left:0, right:0, textAlign:"center", color:"rgba(240,237,232,.8)", fontSize:15, padding:"0 48px", fontFamily:"'Playfair Display',serif", fontStyle:"italic", textShadow:"0 1px 8px rgba(0,0,0,.9)", lineHeight:1.6, pointerEvents:"none" }}>
          {post.caption}
        </div>
      )}
      <button style={{ ...ss.nav, left:16 }} onClick={goPrev}>‹</button>
      <button style={{ ...ss.nav, right:16 }} onClick={goNext}>›</button>
      <div style={{ position:"absolute", bottom:22, left:"50%", transform:"translateX(-50%)", color:C.whiteFaint, fontSize:10, fontFamily:"'Jost',sans-serif", letterSpacing:3 }}>
        {toRoman(current+1)} / {toRoman(total)}
      </div>
    </div>
  );
}
const ss = {
  avatar:{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 },
  ctrl:  { background:"rgba(201,168,76,.12)", border:`1px solid ${C.border}`, color:C.whiteMuted, borderRadius:2, width:34, height:34, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" },
  media: { maxWidth:"100%", maxHeight:"100vh", objectFit:"contain", display:"block", userSelect:"none" },
  nav:   { position:"absolute", top:"50%", transform:"translateY(-50%)", background:"rgba(201,168,76,.1)", border:`1px solid ${C.border}`, color:C.whiteMuted, borderRadius:2, width:42, height:42, fontSize:26, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" },
};

// ─── Name Screen ──────────────────────────────────────────────────────────────
function NameScreen({ onEnter }) {
  const [name, setName] = useState("");
  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20, position:"relative", overflow:"hidden" }}>
      {/* Ambient glow */}
      <div style={{ position:"absolute", top:"30%", left:"50%", transform:"translate(-50%,-50%)", width:500, height:500, background:`radial-gradient(circle, ${C.goldPale} 0%, transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:4, padding:"60px 52px", maxWidth:460, width:"100%", textAlign:"center", position:"relative", animation:"fadeUp .7s ease both", zIndex:1, boxShadow:`0 0 80px rgba(201,168,76,.06), 0 8px 40px rgba(0,0,0,.4)` }}>
        {/* Inner frame */}
        <div style={{ position:"absolute", inset:10, border:`1px solid ${C.goldPale}`, borderRadius:2, pointerEvents:"none" }} />
        <div style={s.eyebrow}>GALLERIA DEGLI OSPITI</div>
        <h1 style={s.heroTitle}>{config.eventName}</h1>
        {config.eventSubtitle && (
          <div style={{ fontSize:11, color:C.gold, letterSpacing:3, textTransform:"uppercase", marginBottom:4 }}>{config.eventSubtitle}</div>
        )}
        <Rule width={220} />
        <p style={{ fontSize:15, color:C.whiteMuted, lineHeight:1.8, margin:"8px 0 28px", fontFamily:"'Playfair Display',serif", fontStyle:"italic" }}>
          Condividi i tuoi ricordi più belli di questa giornata straordinaria
        </p>
        <input
          style={{ ...s.lineInput, textAlign:"center" }}
          placeholder="Il tuo nome..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key==="Enter" && name.trim() && onEnter(name.trim())}
          autoFocus
        />
        <button
          style={{ ...s.goldBtn, marginTop:20, opacity: name.trim() ? 1 : 0.4 }}
          onClick={() => name.trim() && onEnter(name.trim())}
        >
          Entra nella galleria
        </button>
        <p style={{ fontSize:16, color:C.whiteFaint, marginTop:16, letterSpacing:1, fontStyle:"italic" }}>
          Le tue foto saranno visibili a tutti gli ospiti
        </p>
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
      file:f, preview:URL.createObjectURL(f), type:f.type.startsWith("video")?"video":"image", progress:0, status:"pending"
    }));
    setFiles(prev => [...prev, ...items].slice(0, config.maxFilesPerUpload));
  }, []);

  const removeFile = i => setFiles(prev => prev.filter((_,j)=>j!==i));
  const handleDrop = useCallback(e => { e.preventDefault(); addFiles(e.dataTransfer.files); }, [addFiles]);
  const updateStatus = (idx, patch) => setFiles(prev => prev.map((f,i)=>i===idx?{...f,...patch}:f));

  const handlePost = async () => {
    if (files.length===0) { setShake(true); setTimeout(()=>setShake(false),600); return; }
    setUploading(true); setError(null);
    setFiles(prev => prev.map(f=>({...f,status:"uploading",progress:0})));
    try {
      const { urls, errors } = await uploadFiles(files.map(f=>f.file), (idx,pct)=>updateStatus(idx,{progress:pct,status:pct===100?"done":"uploading"}));
      if (errors.length>0) {
        errors.forEach(e=>{ const idx=files.findIndex(f=>f.file===e.file); if(idx>=0) updateStatus(idx,{status:"error"}); });
        setError(`${errors.length} file non caricati.`);
      }
      if (urls.length>0) {
        const saved = await savePosts(urls.map(({file,url})=>({
          author:guestName, avatar:initials, color:getAvatarColor(initials),
          type:file.type.startsWith("video")?"video":"image", url, caption:caption.trim()
        })));
        saved.forEach(p=>onPublished(p));
      }
      setFiles(prev=>prev.filter(f=>f.status==="error")); setCaption("");
    } catch(err) {
      setError("Errore durante il caricamento. Riprova.");
      setFiles(prev=>prev.map(f=>({...f,status:"error"})));
    } finally { setUploading(false); }
  };

  const done  = files.filter(f=>f.status==="done").length;
  const prog  = files.length>0 ? Math.round(files.reduce((s,f)=>s+f.progress,0)/files.length) : 0;

  return (
    <div style={{ maxWidth:620, margin:"44px auto 0", padding:"0 24px", position:"relative", zIndex:1 }}>
      {/* Section heading */}
      <div style={{ textAlign:"center", marginBottom:24 }}>
        <div style={s.eyebrow}>CONDIVIDI UN MOMENTO</div>
        <Rule width={180} />
      </div>

      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:4, padding:"32px 32px 28px", boxShadow:`0 4px 32px rgba(0,0,0,.3)` }}>
        {error && <div style={{ background:"rgba(180,60,60,.1)", border:"1px solid rgba(180,60,60,.3)", borderRadius:2, padding:"10px 14px", color:"#d08080", fontSize:12, marginBottom:14 }}>{error}</div>}

        {/* Dropzone */}
        <div
          style={{ border:`1.5px dashed`, borderColor: files.length>0 ? C.gold : C.border, borderRadius:3, minHeight:150, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all .25s", overflow:"hidden", marginBottom:12, ...(shake?{animation:"shake .5s ease"}:{}) }}
          onDragOver={e=>e.preventDefault()} onDrop={handleDrop}
          onClick={()=>!uploading && fileRef.current.click()}
        >
          {files.length===0 ? (
            <div style={{ textAlign:"center", padding:28 }}>
              <div style={{ fontSize:26, color:C.gold, marginBottom:12, opacity:.7 }}>✦</div>
              <div style={{ fontSize:16, color:C.whiteMuted, marginBottom:5, fontFamily:"'Playfair Display',serif", fontStyle:"italic" }}>Trascina foto e video qui</div>
              <div style={{ fontSize:12, color:C.whiteFaint, letterSpacing:1 }}>oppure clicca per scegliere · max {config.maxFilesPerUpload} file</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, padding:14, width:"100%" }}>
              {files.map((f,i) => (
                <div key={i} style={{ width:82, height:82, borderRadius:3, overflow:"hidden", position:"relative", flexShrink:0, background:C.bgElevated }}>
                  {f.type==="video" ? <video src={f.preview} style={s.thumbMedia}/> : <img src={f.preview} alt="" style={s.thumbMedia}/>}
                  {f.status==="uploading" && <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12 }}>{f.progress}%</div>}
                  {f.status==="done" && <div style={{ position:"absolute",inset:0,background:"rgba(201,168,76,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>✓</div>}
                  {f.status==="error" && <div style={{ position:"absolute",inset:0,background:"rgba(180,60,60,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>✕</div>}
                  {!uploading && <button style={s.thumbX} onClick={e=>{e.stopPropagation();removeFile(i);}}>✕</button>}
                </div>
              ))}
              {files.length<config.maxFilesPerUpload && !uploading && (
                <div style={{ width:82,height:82,borderRadius:3,border:`1.5px dashed ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0 }}
                  onClick={e=>{e.stopPropagation();fileRef.current.click();}}>
                  <div style={{ fontSize:22, color:C.whiteFaint }}>+</div>
                </div>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{display:"none"}} onChange={e=>addFiles(e.target.files)}/>
        </div>

        {files.length>0 && <div style={{ fontSize:11, color:C.whiteMuted, marginBottom:10, textAlign:"center", fontStyle:"italic" }}>{uploading?`Caricamento ${done}/${files.length} — ${prog}%`:`${files.length} file selezionati`}</div>}
        {uploading && <div style={{ height:1, background:C.border, borderRadius:2, marginBottom:14, overflow:"hidden" }}><div style={{ height:"100%", background:C.gold, width:`${prog}%`, transition:"width .3s ease" }}/></div>}

        <textarea
          style={s.elegantTextarea, textAlign:"center"}
          placeholder="Una didascalia per questo ricordo... (opzionale)"
          value={caption} onChange={e=>setCaption(e.target.value)} rows={2} disabled={uploading}
        />
        <button style={{ ...s.goldBtn, opacity:uploading?.65:1 }} onClick={handlePost} disabled={uploading}>
          {uploading ? `Pubblicazione ${done}/${files.length}...` : files.length>1 ? `Pubblica ${files.length} foto` : "Pubblica nella galleria"}
        </button>
        {hasPosts && (
          <button style={{ ...s.ghostBtn, marginTop:10 }} onClick={onSlideshow}>
            ▶  Guarda la presentazione
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, layout, onLike, onExpand }) {
  return (
    <div style={{ ...(layout==="grid"?s.gridCard:s.feedCard) }}>
      <div style={{ position:"relative", cursor:"pointer", overflow:"hidden", background:C.bg }} onClick={()=>post.type==="image"&&onExpand(post.url)}>
        {post.type==="video"
          ? <video src={post.url} style={s.cardMedia} controls playsInline/>
          : <img src={post.url} alt={post.caption||""} style={s.cardMedia} loading="lazy"/>
        }
        {post.type==="image" && (
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(14,17,23,.6) 0%, transparent 50%)", opacity:0, transition:"opacity .3s", display:"flex", alignItems:"flex-end", justifyContent:"flex-end", padding:10 }}>
            <div style={{ color:C.gold, fontSize:12, letterSpacing:1 }}>ESPANDI</div>
          </div>
        )}
      </div>
      <div style={{ padding:"16px 18px 14px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",flexShrink:0, background:post.color }}>{post.avatar}</div>
          <div>
            <div style={{ fontSize:13, color:C.white, fontFamily:"'Jost',sans-serif", letterSpacing:.3 }}>{post.author}</div>
            <div style={{ fontSize:10, color:C.whiteFaint, letterSpacing:.5 }}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        {post.caption && <p style={{ fontSize:14, color:C.whiteMuted, lineHeight:1.6, marginBottom:10, fontFamily:"'Playfair Display',serif", fontStyle:"italic" }}>{post.caption}</p>}
        <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, display:"flex", justifyContent:"flex-end" }}>
          <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:14, color:post.liked?C.gold:C.whiteFaint, fontFamily:"'Jost',sans-serif", transition:"color .15s", padding:0, display:"flex", alignItems:"center", gap:6, letterSpacing:.5 }}
            onClick={()=>onLike(post.id)}>
            {post.liked?"♥":"♡"} {post.likes}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [guestName, setGuestName]           = useState("");
  const [posts, setPosts]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [view, setView]                     = useState("grid");
  const [lightbox, setLightbox]             = useState(null);
  const [showQR, setShowQR]                 = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdmin, setShowAdmin]           = useState(false);
  const [showSlideshow, setShowSlideshow]   = useState(false);
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
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"posts"},payload=>{
        setPosts(prev=>prev.find(p=>p.id===payload.new.id)?prev:[{...payload.new,liked:false},...prev]);
      }).subscribe();
    return ()=>supabase.removeChannel(ch);
  }, []);

  const handlePublished = post => {
    setPosts(prev=>prev.find(p=>p.id===post.id)?prev:[{...post,liked:false},...prev]);
    setTimeout(()=>galleryRef.current?.scrollIntoView({behavior:"smooth"}),150);
  };

  const toggleLike = id => setPosts(prev=>prev.map(p=>{
    if(p.id!==id) return p;
    const liked=!p.liked, likes=liked?p.likes+1:p.likes-1;
    updateLikes(id,likes);
    return {...p,liked,likes};
  }));

  const handleDeleted = ids => setPosts(prev=>prev.filter(p=>!ids.includes(p.id)));

  if (!guestName) return <NameScreen onEnter={setGuestName}/>;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Jost',sans-serif", color:C.white, paddingBottom:80, position:"relative" }}>
      {/* Ambient top glow */}
      <div style={{ position:"fixed", top:0, left:"50%", transform:"translateX(-50%)", width:800, height:300, background:`radial-gradient(ellipse at top, ${C.goldPale} 0%, transparent 70%)`, pointerEvents:"none", zIndex:0 }}/>

      {/* Header */}
      <header style={{ borderBottom:`1px solid ${C.border}`, background:`${C.bg}f0`, position:"sticky", top:0, zIndex:100, backdropFilter:"blur(16px)" }}>
        <div style={{ maxWidth:1040, margin:"0 auto", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:400, fontStyle:"italic", color:C.white, letterSpacing:.3 }}>{config.eventName}</div>
            {config.eventSubtitle && <div style={{ fontSize:9, color:C.gold, letterSpacing:3, textTransform:"uppercase", marginTop:2 }}>{config.eventSubtitle}</div>}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button style={s.hdrBtn} onClick={()=>setShowAdminLogin(true)} title="Admin">⚙</button>
            <button style={s.hdrBtn} onClick={()=>setShowQR(true)} title="QR Code">◻</button>
            <div style={{ ...ss.avatar, background:getAvatarColor(initials) }} title={guestName}>{initials}</div>
            <div style={{ display:"flex", border:`1px solid ${C.border}`, borderRadius:2, overflow:"hidden" }}>
              <button style={{ ...s.viewBtn, ...(view==="grid"?s.viewBtnOn:{}) }} onClick={()=>setView("grid")}>⊞</button>
              <button style={{ ...s.viewBtn, ...(view==="feed"?s.viewBtnOn:{}) }} onClick={()=>setView("feed")}>☰</button>
            </div>
          </div>
        </div>
        <div style={{ height:1, background:`linear-gradient(to right, transparent, ${C.gold}40, transparent)`, margin:"0 28px" }}/>
      </header>

      {/* Upload */}
      <UploadPanel guestName={guestName} initials={initials} onPublished={handlePublished} hasPosts={posts.length>0} onSlideshow={()=>setShowSlideshow(true)}/>

      {/* Gallery */}
      <div style={{ maxWidth:1040, margin:"40px auto 0", padding:"0 24px", position:"relative", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={s.eyebrow}>I RICORDI DELLA GIORNATA</div>
          <Rule width={200} />
          {!loading && posts.length>0 && <div style={{ fontSize:11, color:C.whiteFaint, letterSpacing:2 }}>{posts.length} {posts.length===1?"momento condiviso":"momenti condivisi"}</div>}
        </div>
      </div>

      <div ref={galleryRef} style={view==="grid"?s.grid:s.feed}>
        {loading ? (
          <div style={{ gridColumn:"1/-1", textAlign:"center", color:C.whiteFaint, padding:"70px 20px", fontSize:14, fontStyle:"italic" }}>
            Caricamento...
          </div>
        ) : posts.length===0 ? (
          <div style={{ gridColumn:"1/-1", textAlign:"center", color:C.whiteFaint, padding:"70px 20px", fontSize:15, lineHeight:2 }}>
            <div style={{ fontSize:28, color:C.gold, marginBottom:12, opacity:.4 }}>✦</div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontStyle:"italic" }}>Sii il primo a condividere un ricordo</div>
          </div>
        ) : posts.map(post => (
          <PostCard key={post.id} post={post} layout={view} onLike={toggleLike} onExpand={setLightbox}/>
        ))}
      </div>

      {/* Footer */}
      <div style={{ maxWidth:1040, margin:"60px auto 0", padding:"0 24px 0", textAlign:"center" }}>
        <Rule width={200}/>
        <div style={{ fontSize:11, color:C.whiteFaint, letterSpacing:1, fontStyle:"italic" }}>
          {config.eventName} — {config.eventSubtitle}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div style={{ position:"fixed",inset:0,background:"rgba(5,7,9,.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,cursor:"zoom-out" }} onClick={()=>setLightbox(null)}>
          <img src={lightbox} alt="" style={{ maxWidth:"90vw",maxHeight:"90vh",objectFit:"contain",cursor:"default",borderRadius:2 }} onClick={e=>e.stopPropagation()}/>
          <button style={{ position:"absolute",top:20,right:24,background:"none",border:`1px solid ${C.border}`,color:C.whiteMuted,borderRadius:2,width:32,height:32,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }} onClick={()=>setLightbox(null)}>✕</button>
        </div>
      )}

      {showQR        && <QRModal onClose={()=>setShowQR(false)}/>}
      {showAdminLogin && <AdminLogin onSuccess={()=>{setShowAdminLogin(false);setShowAdmin(true);}} onClose={()=>setShowAdminLogin(false)}/>}
      {showAdmin     && <AdminPanel posts={posts} onDelete={handleDeleted} onClose={()=>setShowAdmin(false)}/>}
      {showSlideshow && <Slideshow posts={posts} onClose={()=>setShowSlideshow(false)}/>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        body { background:${C.bg}; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        * { -webkit-tap-highlight-color:transparent; }
        input, textarea { user-select:text; }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  eyebrow:     { fontSize:9, letterSpacing:4, color:C.gold, textTransform:"uppercase", marginBottom:4 },
  heroTitle:   { fontFamily:"'Playfair Display',serif", fontSize:52, fontWeight:400, color:C.white, marginBottom:6, fontStyle:"italic", lineHeight:1.1 },

  lineInput:   { width:"100%", background:"transparent", border:"none", borderBottom:`1px solid ${C.border}`, padding:"12px 4px", fontSize:16, fontFamily:"'Jost',sans-serif", color:C.white, outline:"none", letterSpacing:.5 },
  elegantTextarea:{ width:"100%", background:C.bgElevated, border:`1px solid ${C.border}`, borderRadius:3, padding:"12px 14px", fontSize:14, fontFamily:"'Playfair Display',serif", fontStyle:"italic", color:C.whiteMuted, outline:"none", resize:"none", lineHeight:1.6, marginBottom:14 },
  thumbMedia:  { width:"100%", height:"100%", objectFit:"cover", display:"block" },
  thumbX:      { position:"absolute", top:3, right:3, background:"rgba(0,0,0,.7)", border:"none", color:"#fff", borderRadius:"50%", width:16, height:16, fontSize:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },

  goldBtn:     { display:"block", width:"100%", background:`linear-gradient(135deg, ${C.gold}, ${C.goldLight})`, border:"none", borderRadius:2, padding:"13px 24px", fontSize:12, fontFamily:"'Jost',sans-serif", fontWeight:500, cursor:"pointer", color:"#0e1117", letterSpacing:2, textTransform:"uppercase", transition:"opacity .2s" },
  ghostBtn:    { display:"block", width:"100%", background:"transparent", border:`1px solid ${C.borderStrong}`, borderRadius:2, padding:"12px 24px", fontSize:12, fontFamily:"'Jost',sans-serif", cursor:"pointer", color:C.gold, letterSpacing:2, textTransform:"uppercase" },
  pillBtn:     { background:"transparent", border:`1px solid ${C.border}`, color:C.whiteMuted, borderRadius:2, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"'Jost',sans-serif", letterSpacing:1 },
  redPillBtn:  { background:"transparent", border:"1px solid rgba(180,80,80,.5)", color:"#d08080", borderRadius:2, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:"'Jost',sans-serif" },

  hdrBtn:      { background:"none", border:"none", fontSize:16, cursor:"pointer", color:C.whiteFaint, padding:"4px 6px", transition:"color .15s" },
  viewBtn:     { background:"transparent", border:"none", color:C.whiteFaint, padding:"6px 10px", cursor:"pointer", fontSize:13 },
  viewBtnOn:   { background:C.bgElevated, color:C.gold },

  grid:        { maxWidth:1040, margin:"0 auto", padding:"0 24px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:20, position:"relative", zIndex:1 },
  feed:        { maxWidth:580, margin:"0 auto", padding:"0 24px", display:"flex", flexDirection:"column", gap:24, position:"relative", zIndex:1 },
  gridCard:    { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:4, overflow:"hidden", animation:"fadeUp .4s ease both", boxShadow:`0 4px 24px rgba(0,0,0,.3)` },
  feedCard:    { background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:4, overflow:"hidden", animation:"fadeUp .4s ease both", boxShadow:`0 4px 24px rgba(0,0,0,.3)` },
  cardMedia:   { width:"100%", height:220, objectFit:"cover", display:"block", transition:"transform .4s ease" },

  overlay:     { position:"fixed", inset:0, background:"rgba(5,7,9,.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, backdropFilter:"blur(8px)", padding:20 },
  modal:       { background:C.bgModal, border:`1px solid ${C.border}`, borderRadius:4, padding:"44px 44px 40px", maxWidth:400, width:"100%", textAlign:"center", animation:"fadeUp .3s ease both", boxShadow:`0 0 80px rgba(201,168,76,.08), 0 8px 48px rgba(0,0,0,.6)`, position:"relative" },
  modalHeading:{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:400, fontStyle:"italic", color:C.white, marginBottom:10 },
  modalBody:   { fontSize:13, color:C.whiteMuted, lineHeight:1.7, fontFamily:"'Jost',sans-serif" },
  closeX:      { position:"absolute", top:16, right:18, background:"none", border:"none", color:C.whiteFaint, fontSize:14, cursor:"pointer" },

  adminPanel:  { background:C.bgModal, border:`1px solid ${C.border}`, borderRadius:4, padding:"28px 28px 32px", maxWidth:700, width:"95%", maxHeight:"88vh", display:"flex", flexDirection:"column", animation:"fadeUp .3s ease both", overflow:"hidden", boxShadow:`0 8px 48px rgba(0,0,0,.6)` },
  adminHead:   { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16, flexShrink:0 },
  adminToolbar:{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", margin:"16px 0", flexShrink:0 },
  adminGrid:   { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:10, overflowY:"auto" },
  adminThumb:  { position:"relative", borderRadius:3, overflow:"hidden", cursor:"pointer", background:C.bgElevated, aspectRatio:"1", transition:"outline .15s" },
  adminMedia:  { width:"100%", height:"100%", objectFit:"cover", display:"block" },
  adminCheck:  { position:"absolute", top:5, left:5, width:18, height:18, borderRadius:3, border:"1.5px solid", display:"flex", alignItems:"center", justifyContent:"center" },
  adminLabel:  { position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,.65)", padding:"3px 5px", display:"flex", alignItems:"center", gap:4 },
  adminAvatar: { width:14, height:14, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:6, fontWeight:700, color:"#fff", flexShrink:0 },
  videoBadge:  { position:"absolute", top:5, right:5, background:"rgba(0,0,0,.65)", borderRadius:2, padding:"1px 5px", fontSize:8, color:"#fff" },
};
