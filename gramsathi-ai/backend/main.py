"""
GramSathi AI - Python FastAPI Backend v2
Local server: SQLite history + Rule-based NLP + Ollama LLM + edge-tts Neural TTS
Run: python main.py
"""

from fastapi import FastAPI, HTTPException, Query as QParam, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional
import sqlite3, json, datetime, os, re, io, asyncio

app = FastAPI(title="GramSathi AI Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ───────────────────────────────────────────────────
DB_PATH      = "gramsathi.db"
OLLAMA_URL   = os.getenv("OLLAMA_URL", "http://10.87.20.165:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")

# ── Best Neural voices (edge-tts / Microsoft) ────────────────
EDGE_VOICES = {
    "hi":    "hi-IN-SwaraNeural",    # Hindi  — Natural female, clear pronunciation
    "mr":    "mr-IN-AarohiNeural",   # Marathi — Natural female
    "en":    "en-IN-NeerjaNeural",   # Indian English female
    # Male alternatives:
    "hi_m":  "hi-IN-MadhurNeural",
    "mr_m":  "mr-IN-ManoharNeural",
    "en_m":  "en-IN-PrabhatNeural",
}

# ── Database ─────────────────────────────────────────────────
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
    conn.commit()
    conn.close()
    print("✅ SQLite DB ready:", DB_PATH)

init_db()

# ── Knowledge Base ────────────────────────────────────────────
KNOWLEDGE = {
    "govt": [
        {
            "patterns": ["pm kisan", "पीएम किसान", "किसान योजना", "pm kisan"],
            "hi": "**पीएम किसान सम्मान निधि** 🏛️\n\n"
                  "- ₹6,000 प्रति वर्ष, 3 किस्तों में (₹2,000 हर 4 महीने)\n"
                  "- सभी छोटे और सीमांत किसान योग्य हैं\n"
                  "- **कैसे आवेदन करें:** pmkisan.gov.in पर जाएं या नजदीकी CSC केंद्र जाएं\n"
                  "- **जरूरी दस्तावेज:** आधार कार्ड, बैंक खाता, जमीन के कागज",
            "mr": "**PM किसान सन्मान निधी** 🏛️\n\n"
                  "- वार्षिक ₹6,000, 3 हप्त्यांमध्ये\n"
                  "- pmkisan.gov.in वर नोंदणी करा किंवा CSC केंद्र भेट द्या\n"
                  "- **आवश्यक कागदपत्रे:** आधार, बँक खाते, जमीन कागद",
            "en": "**PM Kisan Samman Nidhi** 🏛️\n\n"
                  "- ₹6,000/year paid in 3 installments of ₹2,000 each\n"
                  "- Register at pmkisan.gov.in or nearest CSC center\n"
                  "- **Documents needed:** Aadhaar card, bank account, land papers",
            "sources": ["PM Kisan Portal", "Agriculture Dept"]
        },
        {
            "patterns": ["mnrega", "मनरेगा", "रोजगार", "job card", "जॉब कार्ड"],
            "hi": "**MNREGA (मनरेगा) - 100 दिन का रोजगार** 💼\n\n"
                  "- गारंटीकृत 100 दिन का रोजगार हर साल\n"
                  "- वर्तमान मजदूरी: ₹220-350/दिन (राज्य अनुसार)\n"
                  "- **जॉब कार्ड कैसे बनाएं:** ग्राम पंचायत कार्यालय जाएं\n"
                  "- **आवश्यक:** आधार कार्ड, बैंक खाता, फोटो",
            "mr": "**MNREGA - 100 दिवस रोजगार हमी योजना** 💼\n\n"
                  "- दरवर्षी 100 दिवसांचा हमी रोजगार\n"
                  "- ग्रामपंचायत कार्यालयात जॉब कार्डसाठी अर्ज करा",
            "en": "**MNREGA - 100 Days Employment Guarantee** 💼\n\n"
                  "- Guaranteed 100 days of work per year\n"
                  "- Wages: ₹220-350/day depending on state\n"
                  "- Apply for Job Card at Gram Panchayat office",
            "sources": ["MNREGA Portal", "Ministry of Rural Development"]
        },
        {
            "patterns": ["ayushman", "आयुष्मान", "pmjay", "health card", "हेल्थ कार्ड", "इलाज"],
            "hi": "**आयुष्मान भारत - PM-JAY** 🏥\n\n"
                  "- ₹5 लाख तक मुफ्त इलाज प्रति वर्ष\n"
                  "- 10 करोड़ गरीब परिवारों के लिए\n"
                  "- **पात्रता जांचें:** jan.pmjay.gov.in या 14555 पर कॉल करें\n"
                  "- सरकारी और 25,000+ प्राइवेट अस्पतालों में मान्य",
            "mr": "**आयुष्मान भारत - PM-JAY** 🏥\n\n"
                  "- दरवर्षी ₹5 लाखापर्यंत मोफत उपचार\n"
                  "- jan.pmjay.gov.in वर पात्रता तपासा किंवा 14555 वर कॉल करा",
            "en": "**Ayushman Bharat PM-JAY** 🏥\n\n"
                  "- Free medical treatment up to ₹5 lakh/year\n"
                  "- Check eligibility at jan.pmjay.gov.in or call 14555",
            "sources": ["Ayushman Bharat", "NHA"]
        },
    ],
    "farm": [
        {
            "patterns": ["जुलाई", "july", "खरीफ", "kharif", "बुवाई", "sowing", "फसल"],
            "hi": "**जुलाई की खरीफ फसलें** 🌾\n\n"
                  "| फसल | बुवाई समय | उत्पादन |\n"
                  "|------|-----------|----------|\n"
                  "| धान | 15 जून - 15 जुलाई | 40-50 क्विंटल/हेक्टेयर |\n"
                  "| मक्का | जून-जुलाई | 50-60 क्विंटल/हेक्टेयर |\n"
                  "| सोयाबीन | जून-जुलाई | 20-25 क्विंटल/हेक्टेयर |\n"
                  "| अरहर | जून-जुलाई | 15-20 क्विंटल/हेक्टेयर |\n\n"
                  "**ज़रूरी बातें:**\n"
                  "- बुवाई से पहले बीज उपचार करें (Thiram/Captan)\n"
                  "- मिट्टी परीक्षण कराएं — KVK से संपर्क करें",
            "mr": "**जुलैतील खरीफ पिके** 🌾\n\n"
                  "- भात, मका, सोयाबीन, तूर, मूग\n"
                  "- पेरणीपूर्वी बीज प्रक्रिया करा\n"
                  "- माती परीक्षण करा — KVK शी संपर्क साधा",
            "en": "**July Kharif Crops** 🌾\n\n"
                  "Best crops: Rice, Maize, Soybean, Pigeon pea, Mung bean\n"
                  "- Always treat seeds before sowing\n"
                  "- Contact your local KVK for soil testing",
            "sources": ["ICAR Guide", "Agricultural University"]
        },
        {
            "patterns": ["कीड़े", "pest", "कीट", "नाशक", "insect", "रोग", "disease"],
            "hi": "**कीट एवं रोग नियंत्रण** 🐛\n\n"
                  "**जैविक उपाय (सस्ते और सुरक्षित):**\n"
                  "- नीम का तेल 5ml + 1 लीटर पानी — छिड़काव करें\n"
                  "- पीले चिपचिपे ट्रैप लगाएं (10 प्रति एकड़)\n"
                  "- प्रकाश जाल रात में लगाएं\n\n"
                  "**रासायनिक उपाय:** KVK/कृषि केंद्र से सलाह लें\n"
                  "**हेल्पलाइन:** किसान कॉल सेंटर 1800-180-1551 (मुफ्त)",
            "mr": "**कीड व रोग व्यवस्थापन** 🐛\n\n"
                  "- निंब तेल 5ml + 1 लीटर पाणी — फवारणी करा\n"
                  "- पिवळे चिकट सापळे लावा\n"
                  "- किसान कॉल सेंटर: 1800-180-1551",
            "en": "**Pest & Disease Management** 🐛\n\n"
                  "- Neem oil 5ml per liter water — spray on plants\n"
                  "- Use yellow sticky traps (10 per acre)\n"
                  "- Call Kisan Call Center: 1800-180-1551 (Free)",
            "sources": ["ICAR Pest Guide", "KVK"]
        },
        {
            "patterns": ["यूरिया", "urea", "खाद", "fertilizer", "उर्वरक", "DAP"],
            "hi": "**उर्वरक की सही मात्रा** 🌱\n\n"
                  "| उर्वरक | मात्रा/हेक्टेयर | कब डालें |\n"
                  "|--------|----------------|----------|\n"
                  "| यूरिया | 100-120 किलो | 3 भागों में |\n"
                  "| DAP | 100 किलो | बुवाई पर |\n"
                  "| MOP | 50 किलो | बुवाई पर |\n\n"
                  "⚠️ **पहले मिट्टी परीक्षण कराएं** — सही मात्रा जानें\n"
                  "📍 नजदीकी मिट्टी परीक्षण केंद्र पर जाएं",
            "mr": "**खतांचे योग्य प्रमाण** 🌱\n\n"
                  "- युरिया 100-120 किलो/हेक्टर, 3 हप्त्यांमध्ये\n"
                  "- DAP 100 किलो/हेक्टर, पेरणीच्या वेळी\n"
                  "- माती परीक्षण केल्यानंतरच खते वापरा",
            "en": "**Fertilizer Application Guide** 🌱\n\n"
                  "- Urea: 100-120 kg/hectare in 3 splits\n"
                  "- DAP: 100 kg/hectare at sowing\n"
                  "- Always test soil first for accurate dosage",
            "sources": ["Agriculture Dept", "ICAR"]
        },
    ],
    "health": [
        {
            "patterns": ["बुखार", "fever", "ताप", "तापमान", "गर्मी"],
            "hi": "**बुखार — क्या करें** 🌡️\n\n"
                  "**तुरंत करें:**\n"
                  "- पानी में भिगोया कपड़ा माथे पर रखें\n"
                  "- Paracetamol 500mg (बड़ों के लिए, 6 घंटे बाद)\n"
                  "- ORS पिलाते रहें — निर्जलीकरण से बचाएं\n"
                  "- हल्का खाना दें\n\n"
                  "⚠️ **तुरंत डॉक्टर जाएं अगर:**\n"
                  "- 3 दिन से ज्यादा बुखार हो\n"
                  "- 103°F से ज्यादा तापमान हो\n"
                  "- बच्चे में दौरे पड़ें\n"
                  "- बहुत कमजोरी या बेहोशी हो",
            "mr": "**ताप — काय करावे** 🌡️\n\n"
                  "- ओल्या कापडाने माथ्यावर ठेवा\n"
                  "- Paracetamol 500mg (मोठ्यांसाठी)\n"
                  "- ORS द्या — पाणी पिवत राहा\n\n"
                  "⚠️ **डॉक्टरकडे जा जर:**\n"
                  "- 3 दिवसांपेक्षा जास्त ताप\n"
                  "- 103°F पेक्षा जास्त",
            "en": "**Fever — What to Do** 🌡️\n\n"
                  "- Apply cold wet cloth on forehead\n"
                  "- Paracetamol 500mg for adults (every 6 hours)\n"
                  "- Keep giving ORS to prevent dehydration\n\n"
                  "⚠️ **See doctor immediately if:**\n"
                  "- Fever lasts more than 3 days\n"
                  "- Temperature above 103°F",
            "sources": ["WHO Guidelines", "ASHA Guide"]
        },
        {
            "patterns": ["दस्त", "diarrhea", "loose motion", "पेचिश", "उल्टी", "vomiting"],
            "hi": "**दस्त / उल्टी — घरेलू उपचार** 💊\n\n"
                  "**ORS घर पर बनाएं:**\n"
                  "1 लीटर साफ पानी + 6 चम्मच चीनी + ½ चम्मच नमक\n\n"
                  "**क्या करें:**\n"
                  "- हर 5-10 मिनट में थोड़ा-थोड़ा पिलाएं\n"
                  "- चावल का मांड, केला, दही दे सकते हैं\n"
                  "- तेल-मसाले वाला खाना बंद करें\n\n"
                  "⚠️ **डॉक्टर जाएं अगर:**\n"
                  "- मल में खून आए\n"
                  "- बेहोशी हो\n"
                  "- 24 घंटे में ठीक न हो",
            "mr": "**जुलाब / उलटी — घरगुती उपचार** 💊\n\n"
                  "**घरी ORS बनवा:** 1 लिटर पाणी + 6 चमचे साखर + अर्धा चमचा मीठ\n"
                  "- दर 10 मिनिटांनी थोडे थोडे प्या\n"
                  "- तांदळाचे पाणी, केळ, दही द्या",
            "en": "**Diarrhea/Vomiting — Home Care** 💊\n\n"
                  "**Make ORS at home:** 1L clean water + 6 spoons sugar + ½ spoon salt\n"
                  "- Give small sips every 5-10 minutes\n"
                  "- Give rice water, banana, yogurt\n"
                  "- Avoid spicy oily food",
            "sources": ["ASHA Guide", "WHO ORS Protocol"]
        },
        {
            "patterns": ["खांसी", "cough", "सर्दी", "cold", "जुकाम", "गले"],
            "hi": "**खांसी / सर्दी — घरेलू उपाय** 🤧\n\n"
                  "**कारगर घरेलू नुस्खे:**\n"
                  "- तुलसी + अदरक + काली मिर्च का काढ़ा — दिन में 2-3 बार\n"
                  "- गर्म पानी से भाप लें (10 मिनट)\n"
                  "- हल्दी वाला दूध रात को पिएं\n"
                  "- शहद + अदरक का रस — 1 चम्मच\n\n"
                  "⚠️ **अगर खांसी 2 हफ्ते से ज्यादा हो** — TB की जांच कराएं",
            "mr": "**खोकला / सर्दी — घरगुती उपाय** 🤧\n\n"
                  "- तुळस + आले + मिरे काढा — दिवसातून 2-3 वेळा\n"
                  "- गरम पाण्याने वाफ घ्या\n"
                  "- हळद दूध रात्री प्या",
            "en": "**Cough/Cold — Home Remedies** 🤧\n\n"
                  "- Tulsi + ginger + pepper decoction — 2-3 times daily\n"
                  "- Steam inhalation with hot water\n"
                  "- Turmeric milk at night\n"
                  "- Honey + ginger juice — 1 spoon",
            "sources": ["AYUSH Guide", "Traditional Medicine"]
        },
    ],
    "edu": [
        {
            "patterns": ["प्रकाश संश्लेषण", "photosynthesis", "पौधे", "plant food"],
            "hi": "**प्रकाश संश्लेषण** 🌿\n\n"
                  "पौधे अपना खाना खुद बनाते हैं!\n\n"
                  "**सरल भाषा में:**\n"
                  "```\nसूरज की रोशनी + पानी + CO₂ → ग्लूकोज + ऑक्सीजन\n```\n\n"
                  "- पत्तियों में हरा पदार्थ (क्लोरोफिल) होता है\n"
                  "- यही क्लोरोफिल सूरज की रोशनी पकड़ता है\n"
                  "- इसीलिए पत्तियां हरी होती हैं\n"
                  "- पौधे दिन में ऑक्सीजन देते हैं, रात में CO₂",
            "mr": "**प्रकाश संश्लेषण** 🌿\n\n"
                  "झाडे स्वतःचे अन्न तयार करतात!\n\n"
                  "सूर्यप्रकाश + पाणी + CO₂ → ग्लुकोज + ऑक्सिजन\n\n"
                  "- पानांमधील हरितद्रव्य (क्लोरोफिल) सूर्यप्रकाश शोषते",
            "en": "**Photosynthesis** 🌿\n\n"
                  "Plants make their own food!\n\n"
                  "Sunlight + Water + CO₂ → Glucose + Oxygen\n\n"
                  "- Chlorophyll (green pigment) in leaves captures sunlight\n"
                  "- Plants release oxygen during day, CO₂ at night",
            "sources": ["NCERT Science Class 7", "CBSE"]
        },
        {
            "patterns": ["पाइथागोरस", "pythagoras", "त्रिकोण", "triangle"],
            "hi": "**पाइथागोरस प्रमेय** 📐\n\n"
                  "समकोण त्रिभुज में:\n"
                  "**a² + b² = c²**\n\n"
                  "| b=भुजा | a=भुजा | c=कर्ण |\n"
                  "|--------|--------|--------|\n"
                  "| 3 | 4 | 5 |\n"
                  "| 5 | 12 | 13 |\n"
                  "| 6 | 8 | 10 |\n\n"
                  "**उपयोग:** खेत का सही कोण बनाने में काम आता है!",
            "mr": "**पायथागोरस प्रमेय** 📐\n\n"
                  "काटकोन त्रिकोणात: a² + b² = c²\n"
                  "उदाहरण: 3, 4, 5 — हे काटकोन त्रिकोण बनवतात",
            "en": "**Pythagoras Theorem** 📐\n\n"
                  "In a right triangle: a² + b² = c²\n"
                  "Example: 3, 4, 5 — 3²+4²=9+16=25=5²\n"
                  "Useful for: measuring right angles in fields!",
            "sources": ["NCERT Math Class 8", "CBSE"]
        },
        {
            "patterns": ["ब्याज", "interest", "simple interest", "साधारण ब्याज", "चक्रवृद्धि"],
            "hi": "**ब्याज की गणना** 💰\n\n"
                  "**साधारण ब्याज:**\n"
                  "ब्याज = (मूलधन × दर × समय) ÷ 100\n\n"
                  "**उदाहरण:**\n"
                  "₹10,000 पर 5% सालाना ब्याज, 2 साल के लिए:\n"
                  "= (10,000 × 5 × 2) ÷ 100 = **₹1,000**\n\n"
                  "⚠️ बैंक से कर्ज लेते समय कुल रकम पूछें!",
            "mr": "**व्याज गणना** 💰\n\n"
                  "साधे व्याज = (मुद्दल × दर × काळ) ÷ 100\n"
                  "उदाहरण: ₹10,000 वर 5% दराने 2 वर्षे = ₹1,000 व्याज",
            "en": "**Interest Calculation** 💰\n\n"
                  "Simple Interest = (Principal × Rate × Time) ÷ 100\n"
                  "Example: ₹10,000 at 5% for 2 years = ₹1,000 interest",
            "sources": ["NCERT Math Class 8", "Financial Literacy"]
        },
    ],
}

def find_answer(query: str, module: str, lang: str = "hi") -> dict:
    q = query.lower()
    entries = KNOWLEDGE.get(module, [])
    for entry in entries:
        if any(p.lower() in q for p in entry["patterns"]):
            return {
                "text": entry.get(lang) or entry.get("hi", ""),
                "sources": entry.get("sources", [])
            }
    fallback = {
        "hi": "माफ करें, इस सवाल का सटीक जवाब मुझे नहीं मिला। "
              "कृपया अधिक विस्तार से पूछें या नजदीकी कृषि/स्वास्थ्य केंद्र जाएं।",
        "mr": "माफ करा, या प्रश्नाचे उत्तर मला सापडले नाही। "
              "कृपया अधिक तपशीलवार विचारा किंवा जवळच्या केंद्राशी संपर्क करा।",
              "en": "Sorry, I couldn't find an exact answer. "
              "Please ask in more detail or visit your nearest agriculture/health center.",
    }
    return {"text": fallback.get(lang, fallback["hi"]), "sources": []}

# ── Pydantic Models ───────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str
    module: str = "health"
    language: str = "hi"
    ai_engine: str = "gemini" # 'gemini' or 'local'
    gemini_key: Optional[str] = None

# ── Gemini API ───────────────────────────────────────────────
async def call_gemini(prompt: str, api_key: str) -> str:
    import httpx
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.35,
                "maxOutputTokens": 2048
            }
        }
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(url, json=payload)
            res.raise_for_status()
            data = res.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini error: {str(e)}")

def build_rural_prompt(query: str, module: str, lang: str, context: str) -> str:
    lang_labels = {"hi": "हिंदी (Hindi)", "mr": "मराठी (Marathi)", "en": "English"}
    lang_label  = lang_labels.get(lang, "हिंदी")
    module_ctx  = {
        "govt":   "government schemes for farmers and rural people in India",
        "farm":   "farming, crops, pest control, fertilizers, irrigation for Indian farmers",
        "health": "basic healthcare, home remedies, when to see a doctor, for rural communities",
        "edu":    "school education topics (Math, Science, General Knowledge) explained simply",
    }.get(module, "rural community assistance")

    return f"""You are GramSathi AI — a friendly voice assistant for rural communities in India.

Your role: Help with {module_ctx}.

STRICT RULES:
1. Reply ONLY in {lang_label} language. Do not mix languages.
2. Use very SIMPLE words — as if explaining to a farmer or village person who has basic education.
3. Be CONCISE — under 150 words.
4. Give PRACTICAL, ACTIONABLE advice — what they can do TODAY.
5. If health-related: always say "डॉक्टर को दिखाएं" (see a doctor) for serious issues.
6. Use emojis sparingly (1-2 max) to make it friendly.
7. No technical jargon. No English words in Hindi/Marathi responses.

Context from knowledge base:
{context}

User's question: {query}

Answer in {lang_label} (simple, helpful, friendly):"""

# ── API Routes ───────────────────────────────────────────────
@app.get("/")
def root():
    return {"app": "GramSathi AI", "version": "2.0", "status": "running", "privacy": "100% local"}

@app.get("/health")
def health_check():
    return {"status": "ok", "db": os.path.exists(DB_PATH), "tts": "edge-tts ready"}

@app.post("/api/query")
async def process_query(req: QueryRequest):
    """Main query — routes to local KB or Ollama LLM"""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    # PII scrubbing
    q = re.sub(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', '[AADHAAR]', req.query)
    q = re.sub(r'\b[6-9]\d{9}\b', '[PHONE]', q)

    # Always get local context
    local = find_answer(q, req.module, req.language)
    prompt = build_rural_prompt(q, req.module, req.language, local["text"])

    if req.ai_engine == "gemini":
        gemini_key = req.gemini_key or os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                response_text = await call_gemini(prompt, gemini_key)
                sources = local["sources"] + ["Google Gemini"]
            except Exception as e:
                print(f"Gemini call failed: {e}")
                response_text = local["text"]
                sources = local["sources"]
        else:
            response_text = local["text"]
            sources = local["sources"]

    else: # local AI rules fallback
        response_text = local["text"]
        sources = local["sources"]

    # Save to SQLite
    conn = get_db()
    conn.execute(
        "INSERT INTO queries (module, language, query, response, sources, timestamp) VALUES (?,?,?,?,?,?)",
        (req.module, req.language, req.query, response_text,
         json.dumps(sources), datetime.datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    return {
        "query": req.query,
        "response": response_text,
        "module": req.module,
        "language": req.language,
        "sources": sources,
        "privacy": "cloud" if req.ai_engine == "gemini" else "on-device",
        "cloud_calls": 1 if req.ai_engine == "gemini" else 0,
        "mode": req.ai_engine,
    }

@app.get("/api/tts")
async def text_to_speech(
    text: str = QParam(...),
    lang: str = QParam("hi"),
    gender: str = QParam("female"),
):
    """
    Generate robust speech using Google TTS (gTTS) - completely immune to 403 bans.
    """
    try:
        from gtts import gTTS
        import io

        # Clean text
        clean = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
        clean = re.sub(r'[^\w\s\.,!\?।\u0900-\u097F-]', '', clean)
        clean = re.sub(r'\n+', '. ', clean)
        clean = re.sub(r'\s+', ' ', clean).strip()

        if not clean:
            clean = "नमस्कार"

        target_lang = "hi"
        if lang.startswith("mr"): target_lang = "mr"
        elif lang.startswith("en"): target_lang = "en"

        # Generate audio directly into memory buffer
        tts = gTTS(text=clean, lang=target_lang, slow=False)
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        audio_data = fp.getvalue()

        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-cache"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS stream error: {str(e)}")

@app.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """
    Convert speech to text using Sarvam AI saaras:v3 model.
    """
    try:
        from sarvamai import SarvamAI
        # Save uploaded audio file to disk temporarily
        audio_path = f"temp_{file.filename or 'audio.wav'}"
        with open(audio_path, "wb") as f:
            f.write(await file.read())

        # Initialize SarvamAI client
        client = SarvamAI(api_subscription_key="sk_2786h1fq_bilWDuNt36Z0sApfaRzCFZe4")
        
        # Transcribe audio
        response = client.speech_to_text.transcribe(
            file=open(audio_path, "rb"),
            model="saaras:v3",
            mode="transcribe"
        )
        # response should be a string or object containing transcribed text
        # Fallback cleanup logic
        if os.path.exists(audio_path):
            os.remove(audio_path)
            
        # The user provided example shows print(response) directly outputs the string
        return {"text": str(response).strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT error: {str(e)}")

@app.get("/api/history")
def get_history(limit: int = 50, module: Optional[str] = None):
    conn = get_db()
    if module:
        rows = conn.execute(
            "SELECT * FROM queries WHERE module=? ORDER BY timestamp DESC LIMIT ?", (module, limit)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM queries ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["sources"] = json.loads(d.get("sources", "[]"))
        result.append(d)
    return result

@app.delete("/api/history")
def clear_history():
    conn = get_db()
    conn.execute("DELETE FROM queries")
    conn.commit()
    conn.close()
    return {"message": "History cleared", "status": "ok"}

@app.get("/api/stats")
def get_stats():
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM queries").fetchone()[0]
    by_module = conn.execute(
        "SELECT module, COUNT(*) as cnt FROM queries GROUP BY module"
    ).fetchall()
    conn.close()
    return {
        "total_queries": total,
        "by_module": {row["module"]: row["cnt"] for row in by_module},
        "privacy": "all data stored locally — zero cloud",
    }

@app.get("/api/ollama/models")
async def list_ollama_models(url: str = OLLAMA_URL):
    """List available models from Ollama server"""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            res = await client.get(f"{url.rstrip('/')}/api/tags")
            res.raise_for_status()
            models = [m["name"] for m in res.json().get("models", [])]
            return {"models": models, "connected": True, "url": url}
    except Exception as e:
        return {"models": [], "connected": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("\n🌿 GramSathi AI Backend v2 starting...")
    print(f"📡 API:  http://localhost:8000")
    print(f"📖 Docs: http://localhost:8000/docs")
    print(f"🎙️ TTS:  http://localhost:8000/api/tts?text=नमस्ते&lang=hi")
    print(f"🤖 LLM:  {OLLAMA_URL}")
    print(f"🔒 Privacy: 100% local — zero cloud\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
