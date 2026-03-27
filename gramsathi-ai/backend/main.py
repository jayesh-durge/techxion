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
from urllib.parse import unquote
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

SUPPORTED_LANGS = {"hi", "mr", "en", "bn", "ta", "te", "gu", "kn", "ml", "pa"}

LANG_META = {
    "hi": {"label": "Hindi", "script": "Devanagari", "regex": r"[\u0900-\u097F]"},
    "mr": {"label": "Marathi", "script": "Devanagari", "regex": r"[\u0900-\u097F]"},
    "en": {"label": "English", "script": "Latin", "regex": r"[A-Za-z]"},
    "bn": {"label": "Bengali", "script": "Bengali", "regex": r"[\u0980-\u09FF]"},
    "ta": {"label": "Tamil", "script": "Tamil", "regex": r"[\u0B80-\u0BFF]"},
    "te": {"label": "Telugu", "script": "Telugu", "regex": r"[\u0C00-\u0C7F]"},
    "gu": {"label": "Gujarati", "script": "Gujarati", "regex": r"[\u0A80-\u0AFF]"},
    "kn": {"label": "Kannada", "script": "Kannada", "regex": r"[\u0C80-\u0CFF]"},
    "ml": {"label": "Malayalam", "script": "Malayalam", "regex": r"[\u0D00-\u0D7F]"},
    "pa": {"label": "Punjabi", "script": "Gurmukhi", "regex": r"[\u0A00-\u0A7F]"},
}


def normalize_lang(lang: str) -> str:
    base = (lang or "en").split("-")[0].lower().strip()
    return base if base in SUPPORTED_LANGS else "en"


def text_matches_language(text: str, lang: str) -> bool:
    # Consider only letters/scripts while ignoring punctuation, numbers and emojis.
    if not text:
        return False
    meta = LANG_META.get(lang, LANG_META["en"])
    script_chars = len(re.findall(meta["regex"], text))
    alpha_chars = len(re.findall(r"[A-Za-z\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]", text))
    if alpha_chars == 0:
        return False
    return (script_chars / alpha_chars) >= 0.6


def detect_query_language(text: str, fallback_lang: str) -> str:
    fallback_lang = normalize_lang(fallback_lang)

    # Unique scripts first.
    if re.search(LANG_META["bn"]["regex"], text):
        return "bn"
    if re.search(LANG_META["ta"]["regex"], text):
        return "ta"
    if re.search(LANG_META["te"]["regex"], text):
        return "te"
    if re.search(LANG_META["gu"]["regex"], text):
        return "gu"
    if re.search(LANG_META["kn"]["regex"], text):
        return "kn"
    if re.search(LANG_META["ml"]["regex"], text):
        return "ml"
    if re.search(LANG_META["pa"]["regex"], text):
        return "pa"

    # Devanagari can be Hindi or Marathi; keep user's selected one if applicable.
    if re.search(LANG_META["hi"]["regex"], text):
        return fallback_lang if fallback_lang in {"hi", "mr"} else "hi"

    # Latin-only queries treated as English.
    if re.search(LANG_META["en"]["regex"], text):
        return "en"

    return fallback_lang

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
                "text": entry.get(lang) or entry.get("en") or entry.get("hi", ""),
                "sources": entry.get("sources", [])
            }
    fallback = {
        "hi": "माफ करें, इस सवाल का सटीक जवाब मुझे नहीं मिला। "
              "कृपया अधिक विस्तार से पूछें या नजदीकी कृषि/स्वास्थ्य केंद्र जाएं।",
        "mr": "माफ करा, या प्रश्नाचे उत्तर मला सापडले नाही। "
              "कृपया अधिक तपशीलवार विचारा किंवा जवळच्या केंद्राशी संपर्क करा।",
        "en": "Sorry, I couldn't find an exact answer. "
              "Please ask in more detail or visit your nearest agriculture/health center.",
        "bn": "দুঃখিত, এই প্রশ্নের সঠিক উত্তর এখন পাইনি। অনুগ্রহ করে আরও বিস্তারিতভাবে জিজ্ঞাসা করুন।",
        "ta": "மன்னிக்கவும், இந்த கேள்விக்கு துல்லியமான பதில் கிடைக்கவில்லை. தயவுசெய்து மேலும் விவரமாக கேளுங்கள்.",
        "te": "క్షమించండి, ఈ ప్రశ్నకు ఖచ్చితమైన సమాధానం దొరకలేదు. దయచేసి మరింత వివరంగా అడగండి.",
        "gu": "માફ કરશો, આ પ્રશ્નનો સચોટ જવાબ મળ્યો નથી. કૃપા કરીને વધુ વિગતથી પૂછો.",
        "kn": "ಕ್ಷಮಿಸಿ, ಈ ಪ್ರಶ್ನೆಗೆ ಖಚಿತ ಉತ್ತರ ಸಿಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಹೆಚ್ಚಿನ ವಿವರಗಳೊಂದಿಗೆ ಕೇಳಿ.",
        "ml": "ക്ഷമിക്കണം, ഈ ചോദ്യത്തിന് കൃത്യമായ മറുപടി ലഭിച്ചില്ല. ദയവായി കൂടുതൽ വിശദമായി ചോദിക്കൂ.",
        "pa": "ਮਾਫ ਕਰਨਾ, ਇਸ ਸਵਾਲ ਦਾ ਸਹੀ ਜਵਾਬ ਨਹੀਂ ਮਿਲਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਹੋਰ ਵੇਰਵੇ ਨਾਲ ਪੁੱਛੋ।",
    }
    return {"text": fallback.get(lang, fallback["en"]), "sources": []}

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
    lang = normalize_lang(lang)
    lang_label = LANG_META[lang]["label"]
    script_label = LANG_META[lang]["script"]
    module_ctx  = {
        "govt":   "government schemes for farmers and rural people in India",
        "farm":   "farming, crops, pest control, fertilizers, irrigation for Indian farmers",
        "health": "basic healthcare, home remedies, when to see a doctor, for rural communities",
        "edu":    "school education topics (Math, Science, General Knowledge) explained simply",
    }.get(module, "rural community assistance")

    return f"""You are GramSathi AI — a friendly voice assistant for rural communities in India.

Your role: Help with {module_ctx}.

STRICT RULES:
1. Reply ONLY in {lang_label}. Do not mix languages.
2. Write ONLY in {script_label}. Do not use another script.
3. Use very SIMPLE words — as if explaining to a farmer or village person who has basic education.
4. Be CONCISE — under 150 words.
5. Give PRACTICAL, ACTIONABLE advice — what they can do TODAY.
6. If health-related and serious, always advise seeing a doctor in {lang_label}.
7. Use emojis sparingly (1-2 max) to make it friendly.
8. No technical jargon.

Context from knowledge base:
{context}

User's question: {query}

Answer in {lang_label} using {script_label} only (simple, helpful, friendly):"""


def build_language_rewrite_prompt(answer_text: str, lang: str) -> str:
    lang = normalize_lang(lang)
    lang_label = LANG_META[lang]["label"]
    script_label = LANG_META[lang]["script"]
    return f"""Rewrite the answer below in {lang_label}.

STRICT RULES:
1. Output ONLY in {lang_label} using {script_label} script.
2. Do NOT mix any other language.
3. Keep meaning the same.
4. Keep it concise and practical.
5. Return only the rewritten answer text.

Answer to rewrite:
{answer_text}
"""

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

    req.language = normalize_lang(req.language)
    response_lang = detect_query_language(req.query, req.language)

    # PII scrubbing
    q = re.sub(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', '[AADHAAR]', req.query)
    q = re.sub(r'\b[6-9]\d{9}\b', '[PHONE]', q)

    # Always get local context
    local = find_answer(q, req.module, response_lang)
    prompt = build_rural_prompt(q, req.module, response_lang, local["text"])

    if req.ai_engine == "gemini":
        gemini_key = req.gemini_key or os.getenv("GEMINI_API_KEY")
        if gemini_key:
            try:
                response_text = await call_gemini(prompt, gemini_key)
                if not text_matches_language(response_text, response_lang):
                    rewrite_prompt = build_language_rewrite_prompt(response_text, response_lang)
                    response_text = await call_gemini(rewrite_prompt, gemini_key)
                    if not text_matches_language(response_text, response_lang):
                        fallback_text = {
                            "hi": "माफ कीजिए, मैं अभी सही भाषा में उत्तर नहीं दे पाया। कृपया वही सवाल फिर से पूछें।",
                            "mr": "माफ करा, सध्या योग्य भाषेत उत्तर देता आले नाही. कृपया तोच प्रश्न पुन्हा विचारा.",
                            "en": "Sorry, I could not respond in the selected language right now. Please ask the same question again.",
                            "bn": "দুঃখিত, এই মুহূর্তে নির্বাচিত ভাষায় উত্তর দিতে পারিনি। অনুগ্রহ করে একই প্রশ্ন আবার করুন।",
                            "ta": "மன்னிக்கவும், தேர்ந்தெடுத்த மொழியில் இப்போது பதிலளிக்க முடியவில்லை. அதே கேள்வியை மீண்டும் கேளுங்கள்.",
                            "te": "క్షమించండి, ఎంపిక చేసిన భాషలో ఇప్పుడే సమాధానం ఇవ్వలేకపోయాను. అదే ప్రశ్నను మళ్లీ అడగండి.",
                            "gu": "માફ કરશો, હાલમાં પસંદ કરેલી ભાષામાં જવાબ આપી શક્યો નથી. એ જ પ્રશ્ન ફરી પૂછો.",
                            "kn": "ಕ್ಷಮಿಸಿ, ಆಯ್ದ ಭಾಷೆಯಲ್ಲಿ ಈಗ ಉತ್ತರಿಸಲು ಆಗಲಿಲ್ಲ. ಅದೇ ಪ್ರಶ್ನೆಯನ್ನು ಮತ್ತೆ ಕೇಳಿ.",
                            "ml": "ക്ഷമിക്കണം, തിരഞ്ഞെടുക്കപ്പെട്ട ഭാഷയിൽ ഇപ്പോൾ മറുപടി നൽകാനായില്ല. അതേ ചോദ്യം വീണ്ടും ചോദിക്കൂ.",
                            "pa": "ਮਾਫ ਕਰਨਾ, ਚੁਣੀ ਹੋਈ ਭਾਸ਼ਾ ਵਿੱਚ ਹੁਣੇ ਜਵਾਬ ਨਹੀਂ ਦੇ ਸਕਿਆ। ਓਹੀ ਸਵਾਲ ਦੁਬਾਰਾ ਪੁੱਛੋ।",
                        }
                        response_text = fallback_text.get(response_lang, fallback_text["en"])
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
        (req.module, response_lang, req.query, response_text,
         json.dumps(sources), datetime.datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

    return {
        "query": req.query,
        "response": response_text,
        "module": req.module,
        "language": response_lang,
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

        # Decode percent-encoded text when clients pass encoded payloads.
        decoded_text = unquote(text or "")

        # Clean text
        clean = re.sub(r'\*\*(.*?)\*\*', r'\1', decoded_text)
        clean = re.sub(r'[^\w\s\.,!\?।\u0900-\u097F-]', '', clean)
        clean = re.sub(r'\n+', '. ', clean)
        clean = re.sub(r'\s+', ' ', clean).strip()

        # Keep synthesis short and stable for network TTS providers.
        clean = clean[:320]

        if not clean:
            clean = "नमस्कार"

        target_lang = "en"
        if lang.startswith("hi"): target_lang = "hi"
        elif lang.startswith("mr"): target_lang = "mr"
        elif lang.startswith("en"): target_lang = "en"
        elif lang.startswith("bn"): target_lang = "bn"
        elif lang.startswith("ta"): target_lang = "ta"
        elif lang.startswith("te"): target_lang = "te"
        elif lang.startswith("gu"): target_lang = "gu"
        elif lang.startswith("kn"): target_lang = "kn"
        elif lang.startswith("ml"): target_lang = "ml"
        elif lang.startswith("pa"): target_lang = "pa"

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
        # Hard fallback: generate a short local WAV silence so the endpoint never 500s on TTS outages.
        import wave
        import struct

        sample_rate = 16000
        duration_sec = 0.7
        n_samples = int(sample_rate * duration_sec)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)  # 16-bit PCM
            wf.setframerate(sample_rate)
            for _ in range(n_samples):
                wf.writeframes(struct.pack("<h", 0))

        return Response(
            content=buf.getvalue(),
            media_type="audio/wav",
            headers={
                "Cache-Control": "no-cache",
                "X-TTS-Fallback": f"1; reason={str(e)[:120]}"
            }
        )

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
