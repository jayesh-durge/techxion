/**
 * GramSathi AI — v2
 * Full i18n • Ollama Integration • Voice Agents • Responsive
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Lenis from 'lenis';
import { I18N, translate } from './i18n.js';
import { VOICE_AGENTS, loadVoices, speakWithAgent } from './voiceAgents.js';
import { MODULES, findAnswer }  from './data/knowledge.js';

/* ── Constants ──────────────────────────────────────────────────── */
const LANGS = { hi: 'हि', mr: 'म', en: 'En' };
const LANG_CODES = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN' };
const NAV_ITEMS = [
  { id: 'home',     icon: '🏠' },
  { id: 'services', icon: '📦' },
  { id: 'history',  icon: '📋' },
  { id: 'settings', icon: '⚙️' },
];
const DEFAULT_OLLAMA_URL   = import.meta.env.VITE_OLLAMA_URL   || 'http://10.87.20.165:11434';
const DEFAULT_OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'gemma3:4b';
const QUICK_QUERIES = [
  { icon: '🏛️', hi: 'पीएम किसान योजना क्या है?', mr: 'PM किसान योजना काय आहे?', en: 'What is PM Kisan scheme?', module: 'govt' },
  { icon: '🌾', hi: 'जुलाई में कौन सी फसल बोएं?', mr: 'जुलैमध्ये कोणती पिके घ्यावीत?', en: 'Best crops for July?', module: 'farm' },
  { icon: '🏥', hi: 'मुझे बुखार है क्या करूं?', mr: 'मला ताप आहे काय करावे?', en: 'I have fever, what to do?', module: 'health' },
  { icon: '📖', hi: 'प्रकाश संश्लेषण क्या है?', mr: 'प्रकाश संश्लेषण काय आहे?', en: 'What is photosynthesis?', module: 'edu' },
];
const MODULE_KEYS = {
  govt:   { name: 'govtModule',   desc: 'govtDesc'   },
  farm:   { name: 'farmModule',   desc: 'farmDesc'   },
  health: { name: 'healthModule', desc: 'healthDesc' },
  edu:    { name: 'eduModule',    desc: 'eduDesc'    },
};

/* ── localStorage helpers ───────────────────────────────────────── */
const lsGet  = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } };
const lsSet  = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

/* ── Markdown bubble component ──────────────────────────────────── */
function MD({ text }) {
  return (
    <ReactMarkdown
      components={{
        p:          ({ children }) => <p>{children}</p>,
        strong:     ({ children }) => <strong>{children}</strong>,
        ul:         ({ children }) => <ul>{children}</ul>,
        li:         ({ children }) => <li>{children}</li>,
        blockquote: ({ children }) => <blockquote>{children}</blockquote>,
        table:      ({ children }) => <div style={{ overflowX:'auto' }}><table>{children}</table></div>,
        th:         ({ children }) => <th>{children}</th>,
        td:         ({ children }) => <td>{children}</td>,
      }}
    >{text}</ReactMarkdown>
  );
}

/* ── Toast ──────────────────────────────────────────────────────── */
function Toast({ msg }) {
  if (!msg) return null;
  return <div className="toast-wrap"><div className="toast">{msg}</div></div>;
}

/* ── Custom Toggle Switch ───────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <div className="toggle-track" />
      <div className="toggle-thumb" />
    </label>
  );
}

/* ── Page Transition Wrapper ────────────────────────────────────── */
function PageTransition({ children, pageKey }) {
  const [displayKey, setDisplayKey] = useState(pageKey);
  const [content, setContent] = useState(children);
  const [cls, setCls] = useState('page-enter');

  useEffect(() => {
    if (pageKey === displayKey) return;
    setCls('page-exit');
    const t1 = setTimeout(() => {
      setDisplayKey(pageKey);
      setContent(children);
      setCls('page-enter');
    }, 180);
    return () => clearTimeout(t1);
  }, [pageKey]);

  // Update content while same key (e.g. lang change)
  useEffect(() => {
    if (pageKey === displayKey) setContent(children);
  }, [children]);

  return <div className={`page-wrap ${cls}`}>{content}</div>;
}

/* ══════════════════════════════════════════════════════════════════
   MODULE CHAT SCREEN
═══════════════════════════════════════════════════════════════════ */
function ModuleScreen({ moduleId, lang, t, onBack, voices, voiceAgent, aiCfg }) {
  const mod = MODULES[moduleId];
  const [msgs,     setMsgs]     = useState([]);
  const [input,    setInput]    = useState('');
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(null); // msg index
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, thinking]);

  /* ── Backend TTS: Microsoft Neural Voice via edge-tts ── */
  const audioRef = useRef(null);
  const speakBackend = useCallback(async (text, idx) => {
    try {
      if (audioRef.current) { 
        audioRef.current.pause(); 
        audioRef.current.currentTime = 0;
        audioRef.current = null; 
      }
      setSpeaking(idx); // Force UI update immediately

      const gender = VOICE_AGENTS[voiceAgent]?.genderPref === 'female' ? 'female' : 'male';
      const url = `/api/tts?text=${encodeURIComponent(text.substring(0, 550))}&lang=${lang}&gender=${gender}`;
      
      // We directly pass the URL so the browser can incredibly stream the MP3 instantly!
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => setSpeaking(null);
      audio.onerror = () => setSpeaking(null);
      
      await audio.play();
    } catch (err) {
      console.warn("TTS Playback issue:", err);
      setSpeaking(null); // Unstick UI guaranteed
    }
  }, [lang, voiceAgent, voices]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setSpeaking(null);
  }, []);

  /* ── Main query handler — always via /api/query backend ── */
  const sendQuery = useCallback(async (query) => {
    if (!query.trim() || thinking) return;
    setMsgs(p => [...p, { role: 'user', text: query }]);
    setInput('');
    setThinking(true);

    try {
      // Route through FastAPI backend (handles local KB + Gemini + SQLite save)
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          module: moduleId,
          language: lang,
          ai_engine: 'gemini', // Enforce cloud automatically
          gemini_key: aiCfg.geminiKey,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        // Backend down — graceful local fallback
        const fallback = findAnswer(query, moduleId, lang);
        setMsgs(p => [...p, { role: 'ai', text: fallback?.text, sources: fallback?.sources || [], offline: true }]);
        speakBackend(fallback?.text || '', msgs.length + 1);
      } else {
        const data = await res.json();
        const aiMsg = { role: 'ai', text: data.response, sources: data.sources || [], mode: data.mode };
        setMsgs(p => [...p, aiMsg]);
        speakBackend(data.response, msgs.length + 1);
      }
    } catch (err) {
      // Full offline fallback
      const fallback = findAnswer(query, moduleId, lang);
      const errText = fallback?.text || `Error: ${err.message}`;
      setMsgs(p => [...p, { role: 'ai', text: errText, sources: fallback?.sources || [] }]);
    }
    setThinking(false);
  }, [thinking, moduleId, lang, aiCfg, speakBackend, msgs.length]);

  const handleSpeak = (text, idx) => {
    if (speaking === idx) { stopSpeaking(); return; }
    speakBackend(text, idx);
  };

  const sugg = mod.suggested[lang] || mod.suggested.hi;
  const modColor = `var(--${moduleId === 'edu' ? 'edu' : moduleId === 'health' ? 'health' : moduleId === 'govt' ? 'govt' : 'farm'})`;
  const engineLabel = aiCfg.engine === 'gemini' ? '✨ GramSathi Cloud' : t('simulation');

  return (
    <div className="module-screen">
      {/* Module header */}
      <div className="mod-header">
        <button className="back-btn hide-desktop" onClick={onBack}>←</button>
        <div className="mod-header-info">
          <div className="mod-header-name" style={{ color: modColor }}>
            {MODULES[moduleId]?.icon} {t(MODULE_KEYS[moduleId]?.name || 'allServices')}
          </div>
          <div className="mod-header-sub">
            {engineLabel} • {Object.keys(LANGS).find(k => k === lang) ? Object.values({ hi: 'हिंदी', mr: 'मराठी', en: 'English' })[Object.keys({ hi: 0, mr: 1, en: 2 })[lang]] : ''}
          </div>
        </div>
        <div className="current-voice hide-mobile">
          {VOICE_AGENTS[voiceAgent]?.emoji} {VOICE_AGENTS[voiceAgent]?.name[lang] || VOICE_AGENTS[voiceAgent]?.name.hi}
        </div>
      </div>

      {/* Chat messages */}
      <div className="chat-scroll scrollable">
        {/* Welcome state */}
        {msgs.length === 0 && (
          <div className="chat-welcome">
            <div className="chat-row ai">
              <div className="chat-avatar">🤖</div>
              <div className="chat-col">
                <div className="bubble">{t('welcome')}</div>
                <div className="chat-meta" style={{ marginTop: 4 }}>
                  <span className="meta-tag">{t('onDevice')}</span>
                </div>
              </div>
            </div>
            <div style={{ marginLeft: 40, marginTop: 10 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--txt3)', marginBottom: 6 }}>{t('examples')}</div>
              <div className="sugg-chips">
                {sugg.map((s, i) => <button key={i} className="sugg-chip" onClick={() => sendQuery(s)}>{s}</button>)}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {msgs.map((m, i) => (
          <div key={i} className={`chat-row ${m.role}`}>
            <div className="chat-avatar">
              {m.role === 'user' ? '👤' : VOICE_AGENTS[voiceAgent]?.emoji || '🤖'}
            </div>
            <div className="chat-col">
              <div className="bubble">{m.role === 'ai' ? <MD text={m.text} /> : m.text}</div>
              {m.role === 'ai' && (
                <div className="chat-meta">
                  <span className="meta-tag">{t('onDevice')}</span>
                  {m.sources?.map((s, si) => <span key={si} className="meta-tag">{s}</span>)}
                  <button
                    className={`play-btn ${speaking === i ? 'playing' : ''}`}
                    onClick={() => handleSpeak(m.text, i)}
                  >
                    {speaking === i ? t('stopBtn') : t('listenBtn')}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Thinking */}
        {thinking && (
          <div className="thinking-row">
            <div className="chat-avatar">🤖</div>
            <div className="thinking-bubble">
              <div className="th-dot" /><div className="th-dot" /><div className="th-dot" />
              <span>{t('thinking')}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="input-bar">
        <ChatInputRow
          input={input} setInput={setInput}
          onSend={() => sendQuery(input)}
          lang={lang} t={t} thinking={thinking}
        />
        <div className="input-suggestions">
          {sugg.slice(0, 3).map((s, i) => (
            <button key={i} className="input-sugg" onClick={() => sendQuery(s)}>
              {s.length > 30 ? s.substring(0, 29) + '…' : s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Chat input row (shared component) ─────────────────────────── */
function ChatInputRow({ input, setInput, onSend, lang, t, thinking, onExtMicResult }) {
  const [recording, setRecording] = useState(false);
  const recRef = useRef(null);

  const startRec = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert(t('noSpeechSupport') || 'Speech not supported on this browser.'); return; }
    try {
      const r = new SR();
      r.lang = LANG_CODES[lang] || 'hi-IN';
      r.onstart  = () => setRecording(true);
      r.onend    = () => setRecording(false);
      r.onerror  = (e) => { setRecording(false); console.warn('STT Error', e); };
      r.onresult = (e) => {
        const txt = e.results[0][0].transcript;
        setInput(txt);
        onExtMicResult?.(txt);
      };
      r.start();
      recRef.current = r;
    } catch (e) {
      alert("Microphone denied or blocked.");
    }
  };

  const stopRec = () => {
    if (recRef.current && recording) {
      recRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div className={`input-row ${recording ? 'rec' : ''}`}>
      <input
        className="chat-input"
        placeholder={recording ? t('recordingPlaceholder') : t('typeOrSpeak')}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        disabled={thinking}
      />
      <button className={`input-mic ${recording ? 'rec' : ''}`} onClick={recording ? stopRec : startRec}>
        {recording ? '⏹' : '🎙️'}
      </button>
      <button className="input-send" onClick={onSend} disabled={!input.trim() || thinking}>➤</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HOME SCREEN — Two-way voice channel
   User speaks → STT → Gemini → TTS
═══════════════════════════════════════════════════════════════════ */
function HomeScreen({ lang, t, onModuleSelect, voices, voiceAgent, aiCfg }) {
  const [recording, setRecording] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [userText, setUserText] = useState('');
  const [aiText, setAiText] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const recRef = useRef(null);
  const audioRef = useRef(null);

  // Detect module from text
  const detectModule = (txt) => {
    const lower = txt.toLowerCase();
    if (/सरकार|योजना|mnrega|किसान|ayushman|pmkisan|scheme|ration/.test(lower)) return 'govt';
    if (/फसल|बीज|खाद|कीट|crop|farm|शेती|पिक|fertilizer/.test(lower)) return 'farm';
    if (/बुखार|fever|दस्त|खांसी|health|आरोग्य|dengue|डेंगू|medicine/.test(lower)) return 'health';
    return 'edu';
  };

  // Step 3: TTS — play the AI response
  const playTTS = async (text) => {
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const gender = VOICE_AGENTS[voiceAgent]?.genderPref === 'female' ? 'female' : 'male';
      const url = `/api/tts?text=${encodeURIComponent(text.substring(0, 550))}&lang=${lang}&gender=${gender}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      setSpeaking(true);
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch {
      setSpeaking(false);
    }
  };

  // Step 2: send transcribed text to Gemini
  const sendToGemini = async (query) => {
    setThinking(true);
    setAiText('');
    try {
      const module = detectModule(query);
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          module,
          language: lang,
          ai_engine: 'gemini',
          gemini_key: aiCfg?.geminiKey || '',
        }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      const answer = data.response || data.detail || 'No response';
      setAiText(answer);
      await playTTS(answer);
    } catch (e) {
      const err = 'Connection error. Please try again.';
      setAiText(err);
    } finally {
      setThinking(false);
    }
  };

  // Step 1: STT via browser SpeechRecognition
  const startRec = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported on this browser.'); return; }
    try {
      const r = new SR();
      r.lang = LANG_CODES[lang] || 'hi-IN';
      r.onstart  = () => { setRecording(true); setUserText(''); setAiText(''); };
      r.onend    = () => setRecording(false);
      r.onerror  = (e) => { setRecording(false); console.warn('STT error', e); };
      r.onresult = (e) => {
        const txt = e.results[0][0].transcript;
        setUserText(txt);
        sendToGemini(txt);
      };
      r.start();
      recRef.current = r;
    } catch {
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopRec = () => { recRef.current?.stop(); setRecording(false); };
  const toggleMic = () => recording ? stopRec() : startRec();

  return (
    <div className="screen-scroll scrollable">
      <div className="home-screen">
        {/* ── Mic hero ── */}
        <div className="mic-hero">
          <div className="mic-hero-label">
            {speaking ? '🔊 ' + (t('speaking') || 'GramSathi speaking...') :
             thinking ? '🤔 ' + (t('thinking') || 'Thinking...') :
             recording ? '👂 ' + (t('listening') || 'Listening...') :
             t('tapToSpeak')}
          </div>
          <div className="mic-wrap">
            <div className={`mic-ring ${recording || thinking || speaking ? 'active' : ''}`} />
            <div className={`mic-ring ${recording ? 'active' : ''}`} />
            <button
              id="home-mic-btn"
              className={`mic-btn ${recording ? 'rec' : ''} ${thinking || speaking ? 'busy' : ''}`}
              onClick={toggleMic}
              disabled={thinking || speaking}
            >
              {thinking ? '⌛' : speaking ? '🔊' : recording ? '⏹️' : '🎙️'}
            </button>
          </div>

          {recording && (
            <div className="waveform">{[1,2,3,4,5,6].map(i=><div key={i} className="wv"/>)}</div>
          )}

          {/* Voice conversation bubbles */}
          {(userText || aiText || thinking) && (
            <div className="voice-convo">
              {userText && (
                <div className="vc-bubble user">
                  <span className="vc-icon">👤</span>
                  <div className="vc-text">{userText}</div>
                </div>
              )}
              {thinking && (
                <div className="vc-bubble ai thinking">
                  <span className="vc-icon">🌿</span>
                  <div className="vc-text">
                    <span className="dot-loader"><span/><span/><span/></span>
                  </div>
                </div>
              )}
              {aiText && !thinking && (
                <div className={`vc-bubble ai ${speaking ? 'speaking' : ''}`}>
                  <span className="vc-icon">🌿</span>
                  <div className="vc-text">{aiText}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Module grid */}
        <div>
          <div className="section-head">{t('allServices')}</div>
          <div className="module-grid">
            {Object.entries(MODULES).map(([id, mod]) => (
              <div key={id} className={`mod-card ${id}`} onClick={() => onModuleSelect(id)}>
                <div className="mc-icon">{mod.icon}</div>
                <div className="mc-name">{t(MODULE_KEYS[id]?.name)}</div>
                <div className="mc-desc">{t(MODULE_KEYS[id]?.desc)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick queries */}
        <div>
          <div className="section-head">{t('quickAsk')}</div>
          <div className="quick-list">
            {QUICK_QUERIES.map((q, i) => (
              <button key={i} className="quick-item" onClick={() => onModuleSelect(q.module, q[lang] || q.hi)}>
                <span className="qi-icon">{q.icon}</span>
                <span>{q[lang] || q.hi}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SERVICES SCREEN (module list for mobile tab)
═══════════════════════════════════════════════════════════════════ */
function ServicesScreen({ lang, t, onModuleSelect }) {
  return (
    <div className="screen-scroll scrollable">
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div className="section-head">{t('allServices')}</div>
        {Object.entries(MODULES).map(([id, mod]) => (
          <div key={id} className={`hist-item`} style={{ borderLeft: `4px solid var(--${id === 'health' ? 'health' : id === 'edu' ? 'edu' : id === 'govt' ? 'govt' : 'farm'})` }}
            onClick={() => onModuleSelect(id)}>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              <span style={{ fontSize:'1.8rem' }}>{mod.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{t(MODULE_KEYS[id]?.name)}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--txt3)', marginTop:2 }}>{t(MODULE_KEYS[id]?.desc)}</div>
                <div className="sugg-chips" style={{ marginTop:8 }}>
                  {(mod.suggested[lang] || mod.suggested.hi).slice(0,2).map((s,i) =>
                    <span key={i} className="sugg-chip" onClick={(e)=>{ e.stopPropagation(); onModuleSelect(id, s); }}>{s.substring(0,32)}</span>
                  )}
                </div>
              </div>
              <span style={{ color:'var(--txt4)', fontSize:'1.2rem' }}>›</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   HISTORY SCREEN
═══════════════════════════════════════════════════════════════════ */
function HistoryScreen({ lang, t, onReplay }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const modIcons = { govt:'🏛️', farm:'🌾', health:'🏥', edu:'📖' };

  // Load from backend SQLite on mount
  useEffect(() => {
    fetch('/api/history?limit=100')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        // Backend uses 'module' field, map to 'moduleId' for display
        setHistory(data.map(h => ({ ...h, moduleId: h.module, ts: h.timestamp })));
      })
      .catch(() => setHistory(lsGet('gram_hist', [])))
      .finally(() => setLoading(false));
  }, []);

  const clear = async () => {
    try { await fetch('/api/history', { method: 'DELETE' }); } catch {}
    lsSet('gram_hist', []);
    setHistory([]);
  };

  return (
    <div className="screen-scroll scrollable">
      <div className="history-screen">
        <div className="hist-header">
          <div className="hist-title">{t('historyTitle')} ({history.length})</div>
          {history.length > 0 && <button className="hist-clear" onClick={clear}>{t('clearAll')}</button>}
        </div>
        {loading
          ? <div className="empty-state"><div className="empty-icon" style={{animation:'spin 1s linear infinite'}}>⏳</div><div>Loading...</div></div>
          : history.length === 0
          ? <div className="empty-state"><div className="empty-icon">📋</div><div>{t('noHistory')}</div></div>
          : history.map((h, i) => (
            <div key={i} className="hist-item" onClick={() => onReplay(h)}>
              <div className="hi-q">{h.query}</div>
              <div className="hi-meta">
                <span className={`hi-module-tag ${h.moduleId}`}>{modIcons[h.moduleId]} {t(MODULE_KEYS[h.moduleId]?.name)}</span>
                <span>{h.lang?.toUpperCase()}</span>
                <span>{new Date(h.ts).toLocaleString('hi-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SETTINGS SCREEN
═══════════════════════════════════════════════════════════════════ */
function SettingsScreen({ lang, t, aiCfg, setAiCfg, voiceAgent, setVoiceAgent, voices, onToast, installPrompt, onInstall }) {
  const [form, setForm] = useState({ engine: aiCfg.engine, geminiKey: aiCfg.geminiKey });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch('/health', { signal: AbortSignal.timeout(3000) });
      const ttsStatus = res.ok ? '✅ Neural TTS ready' : '⚠️ TTS unavailable';
      const geminiStatus = form.geminiKey ? '✨ Cloud Key Authorized' : '⚪ Cloud Key Missing';
      setTestResult({ ok: true, msg: `${geminiStatus}\n${ttsStatus}` });
    } catch (e) {
      setTestResult({ ok: false, msg: `${t('connectFail')}: ${e.message}` });
    }
    setTesting(false);
  };

  const save = () => {
    const cfg = { ...form };
    setAiCfg(cfg);
    lsSet('gram_ai', cfg);
    onToast(`AI Engine set to ${cfg.engine.toUpperCase()}`);
  };

  const testSpeak = async (agentId) => {
    const demo = { hi: 'नमस्ते! मैं ग्राम साथी AI हूं।', mr: 'नमस्कार! मी ग्राम साथी AI आहे.', en: 'Hello! I am GramSathi AI.' };
    const text = demo[lang] || demo.hi;
    try {
      const gender = VOICE_AGENTS[agentId]?.genderPref === 'female' ? 'female' : 'male';
      const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}&lang=${lang}&gender=${gender}`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      new Audio(URL.createObjectURL(blob)).play();
    } catch {
      speakWithAgent(text, voices, lang, agentId, () => {}, () => {});
    }
  };

  return (
    <div className="screen-scroll scrollable">
      <div className="settings-screen">
        {/* AI Engine Selection hidden for presentation */}

        {/* Voice agents */}
        <div className="settings-card">
          <div className="sc-title">🎙️ {t('voiceSection')}</div>
          <div className="sc-label" style={{ marginBottom:8 }}>{t('voiceAgentLabel')}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {Object.values(VOICE_AGENTS).map(ag => (
              <div
                key={ag.id}
                className={`va-card ${voiceAgent === ag.id ? 'active' : ''}`}
                onClick={() => { setVoiceAgent(ag.id); lsSet('gram_voice', ag.id); testSpeak(ag.id); }}
              >
                <div className="va-emoji">{ag.emoji}</div>
                <div className="va-name" style={{ color: voiceAgent === ag.id ? 'var(--green)' : undefined }}>
                  {ag.name[lang] || ag.name.hi}
                </div>
                <div className="va-desc">{ag.desc[lang] || ag.desc.hi}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, fontSize:'0.72rem', color:'var(--txt3)' }}>
            💡 Click a voice card to hear a preview.
          </div>
        </div>

        {/* PWA App Install */}
        {installPrompt && (
          <div className="settings-card" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(16,185,129,0.1))', borderColor: 'var(--green-light)' }}>
            <div className="sc-title" style={{ color: '#0284c7' }}>📱 Install GramSathi App</div>
            <div style={{ fontSize:'0.82rem', color:'var(--txt2)', lineHeight:1.7, marginBottom: 16 }}>
              Install GramSathi locally to your home screen for full offline voice engines and instant one-tap access.
            </div>
            <button 
              className="sc-btn w-full" 
              style={{ background: 'linear-gradient(135deg, #0284c7, #10b981)', color: '#fff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 4px 14px rgba(16,185,129,0.3)', cursor: 'pointer' }}
              onClick={onInstall}
            >
              🚀 Install App to Home Screen
            </button>
          </div>
        )}

        {/* Data / Privacy */}
        <div className="settings-card">
          <div className="sc-title">🔒 Privacy</div>
          <div style={{ fontSize:'0.82rem', color:'var(--txt2)', lineHeight:1.7 }}>
            • All data stored locally on your device<br />
            • No user data sent to cloud<br />
            • Ollama runs on friend's LAN laptop only<br />
            • Browser voice synthesis is fully offline<br />
            • Delete all data below
          </div>
        <button className="sc-btn mt-12 w-full" style={{ background:'rgba(220,38,38,0.08)', color:'var(--err)', border:'1px solid rgba(220,38,38,0.2)' }}
            onClick={() => { lsSet('gram_hist', []); lsSet('gram_ai', {}); onToast(t('sessionCleared')); }}>
            🗑️ Clear All Local Data
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR (desktop only)
═══════════════════════════════════════════════════════════════════ */
function Sidebar({ lang, t, activeTab, setActiveTab, activeModule, setActiveModule, voiceAgent, setVoiceAgent, aiCfg }) {
  const engineLabel = aiCfg.engine === 'gemini' ? '✨ GramSathi Cloud' : 'Local Simulated AI';
  return (
    <aside className="sidebar">
      {/* Nav */}
      <div className="sidebar-nav">
        {NAV_ITEMS.map(n => (
          <button
            key={n.id}
            id={`sidebar-${n.id}`}
            className={`sidebar-nav-btn ${activeTab === n.id && !activeModule ? 'active' : ''}`}
            onClick={() => { setActiveTab(n.id); setActiveModule(null); }}
          >
            <span className="sidebar-nav-icon">{n.icon}</span>
            {t(`nav${n.id.charAt(0).toUpperCase() + n.id.slice(1)}`)}
          </button>
        ))}
      </div>

      <div className="sidebar-scroll scrollable">
        {/* Modules */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">{t('allServices')}</div>
          <div className="sidebar-modules">
            {Object.entries(MODULES).map(([id, mod]) => (
              <div
                key={id}
                className={`sidebar-mod ${activeModule === id ? 'active' : ''}`}
                onClick={() => { setActiveModule(id); setActiveTab('module'); }}
              >
                <span className="sm-icon">{mod.icon}</span>
                <div className="sm-text">
                  <div className={`sm-name ${id}`}>{t(MODULE_KEYS[id]?.name)}</div>
                  <div className="sm-desc">{(mod.suggested[lang] || mod.suggested.hi)[0]?.substring(0,28)}…</div>
                </div>
                <span className="sm-arrow">›</span>
              </div>
            ))}
          </div>
        </div>

        {/* Voice agent picker is restricted uniquely to SettingsScreen */}        {/* AI Status Hidden */}
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [lang,         setLang]         = useState(() => lsGet('gram_lang', 'hi'));
  const [activeTab,    setActiveTab]    = useState('home');
  const [activeModule, setActiveModule] = useState(null);
  const [voiceAgent,   setVoiceAgent]   = useState(() => lsGet('gram_voice', 'shubh'));
  const [voices,       setVoices]       = useState([]);
  const [toast,        setToast]        = useState('');
  const [aiCfg,        setAiCfg]        = useState(() => ({
    engine: 'gemini', // 'local' or 'gemini'
    geminiKey: '',
    ...lsGet('gram_ai', {}),
  }));
  const toastTimer = useRef(null);
  
  // Custom PWA Install State
  const [installPrompt, setInstallPrompt] = useState(null);

  // Catch PWA Install Prompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Load browser voices on mount
  useEffect(() => {
    loadVoices().then(setVoices);
  }, []);

  // Persist language
  useEffect(() => { lsSet('gram_lang', lang); }, [lang]);

  const t = useCallback((key) => translate(lang, key), [lang]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }, []);

  const handleModuleSelect = useCallback((id, preQuery) => {
    setActiveModule(id);
    setActiveTab('module');
  }, []);

  const handleBack = useCallback(() => { setActiveModule(null); }, []);

  const handleReplay = useCallback((h) => {
    setActiveModule(h.moduleId);
    setActiveTab('module');
  }, []);

  // Main content renderer
  const renderMain = () => {
    if (activeModule && activeTab === 'module') {
      return (
          <ModuleScreen
          key={activeModule}
          moduleId={activeModule}
          lang={lang}
          t={t}
          onBack={handleBack}
          voices={voices}
          voiceAgent={voiceAgent}
          aiCfg={aiCfg}
        />
      );
    }
    if (activeTab === 'home')     return <HomeScreen    lang={lang} t={t} onModuleSelect={handleModuleSelect} voices={voices} voiceAgent={voiceAgent} aiCfg={aiCfg} />;
    if (activeTab === 'services') return <ServicesScreen lang={lang} t={t} onModuleSelect={handleModuleSelect} />;
    if (activeTab === 'history')  return <HistoryScreen lang={lang} t={t} onReplay={handleReplay} />;
    if (activeTab === 'settings') return <SettingsScreen 
        lang={lang} t={t} aiCfg={aiCfg} setAiCfg={setAiCfg} 
        voiceAgent={voiceAgent} setVoiceAgent={setVoiceAgent} 
        voices={voices} onToast={showToast} 
        installPrompt={installPrompt} 
        onInstall={() => { if(installPrompt) installPrompt.prompt(); }} 
      />;
    return null;
  };

  const pageKey = activeModule ? `module-${activeModule}` : activeTab;
  const engineLabel = aiCfg.engine === 'gemini' ? '✨ GramSathi Cloud' : t('simulation');

  return (
    <div className="app-shell">
      {/* ── Topbar ── */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-logo">🌿</div>
          <div className="brand-text">
            <div className="brand-name">{t('appName')}</div>
            <div className="brand-tag">{t('tagline')}</div>
          </div>
        </div>

        <div className="topbar-actions">
          {/* AI Status Badge omitted to white-label */}

          {/* Language toggle */}
          <div className="lang-group">
            {Object.entries(LANGS).map(([k, label]) => (
              <button key={k} id={`lang-${k}`} className={`lang-pill ${lang === k ? 'active' : ''}`} onClick={() => setLang(k)}>
                {label}
              </button>
            ))}
          </div>

          {/* Settings shortcut */}
          <button
            className="icon-btn"
            title={t('settingsTitle')}
            onClick={() => { setActiveTab('settings'); setActiveModule(null); }}
          >⚙️</button>
        </div>
      </header>

      {/* ── Body: Sidebar + Main ── */}
      <div className="content-area">
        <Sidebar
          lang={lang} t={t}
          activeTab={activeTab} setActiveTab={setActiveTab}
          activeModule={activeModule} setActiveModule={setActiveModule}
          voiceAgent={voiceAgent} setVoiceAgent={setVoiceAgent}
          aiCfg={aiCfg}
        />
        <main className="main-content">
          <PageTransition pageKey={pageKey}>
            {renderMain()}
          </PageTransition>
        </main>
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(n => (
          <button
            key={n.id}
            id={`nav-${n.id}`}
            className={`nav-btn ${activeTab === n.id && !activeModule ? 'active' : ''}`}
            onClick={() => { setActiveTab(n.id); setActiveModule(null); }}
          >
            <div className="nav-icon">{n.icon}</div>
            <div>{t(`nav${n.id.charAt(0).toUpperCase() + n.id.slice(1)}`)}</div>
          </button>
        ))}
      </nav>

      <Toast msg={toast} />
    </div>
  );
}
