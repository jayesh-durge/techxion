# GramSathi AI 🌿 — Complete Project Architecture & Line-by-Line Breakdown
*A highly technical, detailed overview of how the GramSathi AI application functions from the ground up.*

---

## 🏗️ 1. Project Structure Overview
GramSathi is fundamentally a **Full-Stack Application** divided into two highly decoupled environments:
1. **Frontend (`/src`)**: A lightweight, blazing-fast React 18 Application compiled by Vite. It uses raw CSS-in-JS design paradigms and runs entirely in the user's browser as a progressive Web App (PWA).
2. **Backend (`/backend/main.py`)**: An asynchronous Python server built on the `FastAPI` framework. It handles the heavy AI routing (Gemini + Sarvam AI), localized Database caching (`SQLite3`), and Text-to-Speech synthesis (`gTTS`).

---

## 🐍 2. The Backend (`main.py`) — The AI Engine
The backend is an asynchronous API gateway meant to receive raw text from the user, determine the correct AI execution path, and return a translated string + an MP3 voice file.

* **Line 1-20 (Imports & Setup)**: We extensively use `fastapi` for routing, `pydantic` for data validation, `gtts` for voice, and standard `sqlite3` for local caching. We use `dotenv` to load the `GEMINI_API_KEY` and `SARVAM_API_KEY`.
* **Line 21-30 (CORS Middleware)**: `CORSMiddleware` is configured to `allow_origins=["*"]`. This guarantees that if a mobile phone connects to the laptop's IP address, the browser doesn't block the connection due to Cross-Origin Resource Sharing security.
* **Line 35-150 (SQLite Initialization)**: `init_db()` runs on startup. It generates two SQL tables: `knowledge` (an absolute offline cache of answers) and `queries` (which stores exactly what the farmer asked, what the AI replied, and logs timestamps).
* **Line 150-380 (Prompt Engineering Layer)**: `build_rural_prompt()` is the most critical function. It injects a highly strict "Domain Guardrail" around the LLM. It forces the AI to check `req.module` (e.g., Farm vs. Health) and *strictly forbids* the AI from answering off-topic questions. It also forces constraints like "under 150 words" and "use simple words as if explaining to a village person."
* **Line 400-475 (The Core API Route `/api/query`)**:
  1. The user's query hits this endpoint via a `POST` request.
  2. First, the query is scrubbed of PII (Aadhaar or Phone numbers are regex-replaced out before hitting the cloud).
  3. `call_gemini` attempts an async API call to Google's Gemini-1.5-Flash model.
  4. **The Sarvam Fallback Trick**: If Gemini fails (API Limit), the code catches the `Exception`, pulls the `SARVAM_API_KEY`, spins up a new `client.chat.completions` object, and reroutes the exact same query completely invisibly via the `sarvam-30b` model.
  5. The successful text is written to SQLite permanently and then sent back to the React app.
* **Line 480-530 (The Voice Synthesis Route `/api/tts`)**: This endpoint receives the raw text, uses Google TTS (`gTTS`) to transform it into an MP3 buffer based on language (`hi`, `mr`, `en`), and streams the exact binary audio chunk directly back into the browser's audio player.

---

## ⚛️ 3. The Frontend (`App.jsx` & `main.jsx`) — The UI Layer
The React frontend is responsible exclusively for taking the User's voice, interacting with the Browser's STT (Speech-to-Text), and rendering the premium glass UI.

* **`main.jsx`**: The root bootloader. It mounts the React application into the `<div id="root">` of your `index.html`.
* **`App.jsx` (Lines 1-50: Constants & Translations)**: We define static JSON objects (`MODULES`, `VOICE_AGENTS`, `NAV_ITEMS`) containing exact text and emojis for English, Hindi, and Marathi.
* **`App.jsx` (Lines 55-250: Audio Pipeline)**: 
  * `toggleMic()` checks if `window.SpeechRecognition` exists.
  * It starts recording your physical microphone directly in the browser. 
  * Once the browser processes the audio into text (e.g. "बारिश कब होगी"), it shoots an async `fetch('/api/query')` payload to the Python backend.
  * It sets React generic state hooks like `setRecording(true)` and `setThinking(true)` to trigger the glowing UI animations.
  * When `fetch` resolves, it displays the text, and sequentially triggers `speakWithAgent()` which calls `/api/tts` to hear the AI.
* **`App.jsx` (Lines 350-520: The HomeScreen)**: The main interface. It dynamically renders the "Big Mic" button based on states (`busy`, `recording`). Below it, it `.map()` loops through the exact modules (Govt, Farm, Health, Edu) to map the four colored Frosted Glass cards visually on the screen.
* **`App.jsx` (Lines 600-700: The SettingsScreen)**: A highly interactive panel completely wired to `localStorage`. Editing variables like the Voice Agent or clearing history instantly changes `localStorage` and forces a React re-render. Note the `installPrompt` block — this listens for the exact Chrome PWA trigger to allow 1-click home screen installation.
* **`App.jsx` (Lines 750-920: The Root Application Controller)**: The `<App>` function houses the core application skeleton (`app-shell`). It maps a fixed `<Topbar>`, a dynamically scaling `<div className="content-area">`, the main `<Sidebar>`, and the `<BottomNav>`. Inside the content area, a master `switch()` statement securely routes users between `[home, services, history, settings]` screens seamlessly without ever reloading the browser page (A Single Page Application).

---

## 🎨 4. Design System (`index.css`)
We completely bypassed using external libraries (like Tailwind or Bootstrap) to ensure the application executes instantly on low-end mobile CPUs.

* **Lines 1-100 (CSS Variables)**: Declares all strict Hex-code colors (`var(--green)`, `var(--surface)`). This prevents code repetition and guarantees UI consistency across 800+ lines.
* **Lines 108-120 (The Shell & Dynamic Background)**: Notice `.app-shell` utilizes `100dvh` — this dynamic viewport height locks the exact CSS borders perfectly inside of any mobile screen. Next, the `linear-gradient` applies the highly aesthetic animated "Smooth Nature" colors swirling infinitely via `@keyframes dynamic-bg`.
* **Lines 125-300 (Glassmorphism Layout)**: Every UI constraint (`.topbar`, `.mod-card`, `.sidebar`, `.bottom-nav`) forces `rgba(255, 255, 255, 0.45)` coupled rigidly with `backdrop-filter: blur(24px)`. This mathematically blurs the rolling colors operating exactly behind them, creating the immersive premium "Apple iOS" aesthetic.
* **Lines 420-450 (Module Cards)**: Each service tile has a rigid explicit gradient assigned. When `.mod-card.farm` is triggered, the `.farm` selector forces a translucent Emerald Green glow that mixes structurally with the blur.

---

## 🚀 5. The PWA Bundler (`vite.config.js`)
* Vite wraps everything up. We explicitly inject `vite-plugin-pwa` so Vite generates a complex `ServiceWorker.js` at runtime. 
* Whenever Chrome accesses the site, the browser's hidden bots read the `manifest` block inside `vite.config.js` and securely validates `start_url` and `icons` to grant the website the strict permission to "Install as a Native App" over Mobile.
