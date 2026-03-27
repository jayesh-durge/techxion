/**
 * GramSathi AI — Python FastAPI Backend
 * Local server with SQLite for session history
 * Run: python backend/main.py
 */

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3, json, datetime, os, re

app = FastAPI(title="GramSathi AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "gramsathi.db"

# ── Database setup ──────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS queries (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            module    TEXT NOT NULL,
            language  TEXT DEFAULT 'hi',
            query     TEXT NOT NULL,
            response  TEXT NOT NULL,
            sources   TEXT DEFAULT '[]',
            timestamp TEXT NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS profiles (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name     TEXT NOT NULL,
            language TEXT DEFAULT 'hi',
            region   TEXT DEFAULT '',
            created  TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()
    print("✅ SQLite DB initialized at", DB_PATH)

init_db()

# ── Knowledge Base (Python-side rule engine) ────────────────
KNOWLEDGE = {
    "govt": [
        {"patterns": ["pm kisan", "पीएम किसान", "किसान योजना"],
         "hi": "पीएम किसान योजना में ₹6,000/साल, तीन किस्तों में मिलते हैं। pmkisan.gov.in पर आवेदन करें।",
         "sources": ["PM Kisan Portal"]},
        {"patterns": ["mnrega", "मनरेगा", "रोजगार"],
         "hi": "MNREGA में 100 दिन का गारंटीशुदा रोजगार मिलता है। ग्राम पंचायत जाकर जॉब कार्ड बनाएं।",
         "sources": ["MNREGA Portal"]},
        {"patterns": ["ayushman", "आयुष्मान", "pmjay"],
         "hi": "आयुष्मान भारत में ₹5 लाख तक मुफ्त इलाज। jan.pmjay.gov.in पर पात्रता जांचें।",
         "sources": ["Ayushman Bharat"]},
    ],
    "farm": [
        {"patterns": ["जुलाई", "july", "खरीफ", "kharif"],
         "hi": "जुलाई में धान, मक्का, सोयाबीन, अरहर, मूंग बोएं। बीज उपचार ज़रूर करें।",
         "sources": ["ICAR Guide"]},
        {"patterns": ["कीड़े", "pest", "कीट"],
         "hi": "नीम का तेल (5ml/लीटर) छिड़काव करें। पीले ट्रैप लगाएं। KVK से संपर्क करें।",
         "sources": ["ICAR Pest Guide"]},
        {"patterns": ["यूरिया", "urea", "खाद", "fertilizer"],
         "hi": "यूरिया 100-120 किलो/हेक्टेयर, 3 भागों में डालें। मिट्टी परीक्षण पहले करें।",
         "sources": ["Agriculture Dept"]},
    ],
    "health": [
        {"patterns": ["बुखार", "fever", "ताप"],
         "hi": "ठंडी पट्टी रखें, Paracetamol 500mg लें, ORS पिएं। 3 दिन से ज़्यादा बुखार हो तो डॉक्टर को दिखाएं।",
         "sources": ["WHO Guidelines"]},
        {"patterns": ["दस्त", "diarrhea", "loose motion"],
         "hi": "ORS बनाएं: 1L पानी + 6 चम्मच चीनी + ½ चम्मच नमक। थोड़ा-थोड़ा पिलाते रहें।",
         "sources": ["ASHA Guide"]},
        {"patterns": ["खांसी", "cough", "सर्दी", "cold"],
         "hi": "तुलसी-अदरक का काढ़ा पिएं। भाप लें। हल्दी वाला दूध पिएं।",
         "sources": ["AYUSH Guide"]},
    ],
    "edu": [
        {"patterns": ["प्रकाश संश्लेषण", "photosynthesis"],
         "hi": "पौधे सूर्यप्रकाश, पानी, CO₂ से ग्लूकोज बनाते हैं और ऑक्सीजन छोड़ते हैं।",
         "sources": ["NCERT Science"]},
        {"patterns": ["पाइथागोरस", "pythagoras"],
         "hi": "समकोण त्रिभुज में: a² + b² = c²। उदाहरण: 3,4,5 वाला त्रिकोण।",
         "sources": ["NCERT Math"]},
        {"patterns": ["ब्याज", "interest", "simple interest"],
         "hi": "साधारण ब्याज = (मूलधन × दर × समय) / 100",
         "sources": ["NCERT Math"]},
    ],
}

def find_answer(query: str, module: str, lang: str = "hi") -> dict:
    q = query.lower()
    entries = KNOWLEDGE.get(module, [])
    for entry in entries:
        if any(p.lower() in q for p in entry["patterns"]):
            return {"text": entry.get(lang, entry.get("hi", "")), "sources": entry.get("sources", [])}
    return {
        "text": f"माफ करें, इस सवाल का जवाब अभी नहीं मिला। कृपया और विस्तार से पूछें।",
        "sources": []
    }

# ── Pydantic models ─────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str
    module: str = "health"
    language: str = "hi"
    use_ollama: bool = False
    ollama_url: Optional[str] = "http://localhost:11434"
    ollama_model: Optional[str] = "gemma3:4b"

class ProfileCreate(BaseModel):
    name: str
    language: str = "hi"
    region: str = ""

# ── Ollama integration ──────────────────────────────────────
async def query_ollama(prompt: str, url: str, model: str) -> str:
    import httpx
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.4, "num_predict": 300}
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(f"{url}/api/generate", json=payload)
            res.raise_for_status()
            return res.json().get("response", "")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {str(e)}")

# ── Routes ──────────────────────────────────────────────────
@app.get("/")
def root():
    return {"app": "GramSathi AI", "version": "1.0", "status": "running", "privacy": "100% local"}

@app.post("/api/query")
async def process_query(req: QueryRequest):
    """Main query endpoint — rule-based NLP or Ollama LLM"""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # PII scrubbing
    clean_query = re.sub(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', '[AADHAAR]', req.query)
    clean_query = re.sub(r'\b[6-9]\d{9}\b', '[PHONE]', clean_query)

    if req.use_ollama and req.ollama_url:
        # Ollama LLM path
        lang_ctx = {"hi": "हिंदी", "mr": "मराठी", "en": "English"}.get(req.language, "हिंदी")
        rag_ctx = find_answer(clean_query, req.module, req.language)
        prompt = f"""You are GramSathi AI, a helpful assistant for rural India.
Reply in {lang_ctx} language. Be simple and clear.
Context: {rag_ctx['text']}
User question: {clean_query}
Answer:"""
        answer_text = await query_ollama(prompt, req.ollama_url, req.ollama_model)
        sources = rag_ctx["sources"]
    else:
        # Rule-based fallback
        result = find_answer(clean_query, req.module, req.language)
        answer_text = result["text"]
        sources = result["sources"]

    # Save to SQLite
    conn = get_db()
    conn.execute(
        "INSERT INTO queries (module, language, query, response, sources, timestamp) VALUES (?,?,?,?,?,?)",
        (req.module, req.language, req.query, answer_text,
         json.dumps(sources), datetime.datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    return {
        "query": req.query,
        "response": answer_text,
        "module": req.module,
        "language": req.language,
        "sources": sources,
        "privacy": "on-device",
        "cloud_calls": 0,
    }

@app.get("/api/history")
def get_history(limit: int = 50, module: Optional[str] = None):
    """Fetch query history from SQLite"""
    conn = get_db()
    if module:
        rows = conn.execute("SELECT * FROM queries WHERE module=? ORDER BY timestamp DESC LIMIT ?", (module, limit)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM queries ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.delete("/api/history")
def clear_history():
    conn = get_db()
    conn.execute("DELETE FROM queries")
    conn.commit()
    conn.close()
    return {"message": "History cleared"}

@app.get("/api/stats")
def get_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM queries").fetchone()[0]
    by_module = conn.execute("SELECT module, COUNT(*) as cnt FROM queries GROUP BY module").fetchall()
    conn.close()
    return {
        "total_queries": total,
        "by_module": {row["module"]: row["cnt"] for row in by_module},
        "privacy": "all data stored locally",
        "cloud_calls": 0,
    }

@app.post("/api/profiles")
def create_profile(profile: ProfileCreate):
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO profiles (name, language, region, created) VALUES (?,?,?,?)",
        (profile.name, profile.language, profile.region, datetime.datetime.now().isoformat())
    )
    conn.commit()
    profile_id = cur.lastrowid
    conn.close()
    return {"id": profile_id, "name": profile.name, "message": "Profile created"}

@app.get("/api/profiles")
def list_profiles():
    conn = get_db()
    rows = conn.execute("SELECT * FROM profiles").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/health")
def health_check():
    return {"status": "ok", "db": os.path.exists(DB_PATH)}

if __name__ == "__main__":
    import uvicorn
    print("\n🌿 GramSathi AI Backend starting...")
    print("📡 API: http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")
    print("🔒 Privacy: 100% local — zero cloud\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
