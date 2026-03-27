# GramSathi AI 🌿 — Empowering Rural India
*A highly scalable, multi-lingual, and completely Voice-First intelligent assistant designed exclusively for the agricultural, healthcare, governance, and educational sectors of rural India.*

---

## 🚀 Key Features

*   🎙️ **100% Voice-First Interface:** Zero-typing UI. Simply press the microphone, speak naturally (in Hindi, Marathi, or English), and the AI instantly responds with contextual voice audio.
*   🛡️ **Deep Domain Isolation:** The AI physically refuses to answer off-topic queries, guaranteeing that village users receive highly accurate, actionable information explicitly mapped to their requested sector (Agriculture, Health, Edu, Govt).
*   🌐 **Dual-Brain Fallback API:** Runs securely on **Google Gemini 1.5 Flash**. Should the primary cloud fail, the backend instantly intercepts the error and routes the exact context to **Sarvam AI (sarvam-30b)**. Zero downtime.
*   📱 **Progressive Web App (PWA):** Easily installable to any local home screen directly from the browser window (`Add to Home Screen`), with completely off-grid offline local-database caching.
*   🔒 **Zero-PII Secure Engine:** The API explicitly deletes and aggressively scrubs sensitive PII (Aadhaar Data, Phone Numbers) using Regular Expressions before any payload hits cloud endpoints.
*   🎨 **Premium Glassmorphism:** Features a highly optimized `100dvh` CSS layout rendering absolute Frosted Glass panels against an infinite natural-moving gradient, maximizing visual engagement globally without external CSS/JS bloatware.

---

## 🛠️ Technology Stack
### Frontend (React + Vite)
*   **Core:** React 18, Vite (HMR)
*   **Styling:** Pure Modern CSS-in-JS Variables, Dynamic Glassmorphic Viewports
*   **Build/Offline:** Vite-Plugin-PWA (Progressive Web Application standard)
*   **Audio Pipeline:** `window.SpeechRecognition` (STT Input)

### Backend (Python + FastAPI)
*   **Core:** Python 3.10+, FastAPI (ASGI Asynchronous Routing), Uvicorn
*   **Database:** `sqlite3` natively handling session recall and caching mechanisms
*   **Inference APIs:** Google Gemini SDK, `sarvamai` (Fallback pipeline)
*   **Audio Pipeline:** `gTTS` (Response Output)

---

## ⚙️ Installation & Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/gramsathi-ai.git
   cd gramsathi-ai
   ```

2. **Configure Environment Variables:**
   Open the root `.env` file and strictly insert your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_key_here
   SARVAM_API_KEY=your_sarvam_key_here
   VITE_OLLAMA_URL=http://localhost:11434
   ```

3. **Initialize the Python Backend:**
   Open a terminal into the `/backend` folder.
   ```bash
   cd backend
   pip install fastapi uvicorn google-genai sarvamai Pydantic gTTS python-dotenv
   python main.py
   ```
   *The server dynamically creates `gramsathi.db` memory instances and spins up on `http://localhost:8000`.*

4. **Initialize the React Frontend:**
   Open a separate terminal in the root project folder.
   ```bash
   npm install --legacy-peer-deps
   npm run dev
   ```
   *The blazing frontend will instantly boot on `http://localhost:3002`.*

---

## 📱 PWA Deployment Instructions
If you want to install GramSathi natively to your mobile device:
1. Since browsers tightly lock Progressive Web Apps to secure contexts, use a secure tunnel mapping to your laptop (e.g., `ngrok http 3002`).
2. Open the secure `https` link on Chrome/Safari. 
3. Open the **Settings Panel (⚙️)** in the application, and hit the blue **🚀 Install App** button!

---

## 👥 Contributors & Documentation
*   Presentations? See the included **`gramsathi_ppt_content.md`** for immediate deck copy-paste.
*   Code architecture breakdown? Read **`gramsathi_architecture.md`** for a strict line-by-line methodology of the Dual-Brain Python stack and CSS grids.

*Engineered with precision for a connected, smarter future.*
