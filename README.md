# GramSathi AI 🌿

**Open, Voice-First, Privacy-First Handheld AI for Rural India**

A multilingual AI assistant (Hindi / Marathi / English) for rural communities — works offline, runs locally, and never sends your data to the cloud.

## Features
- 🎙️ Voice-first interaction (Web Speech API)
- 🏛️ Government Schemes (PM Kisan, MNREGA, Ayushman Bharat)
- 🌾 Farming Assistant (crops, pests, fertilizer, irrigation)
- 🏥 Health Guidance (symptoms, home remedies, when to see doctor)
- 📖 Education Helper (Math, Science in simple language)
- 🤖 Ollama LLM integration (connect local AI model over LAN)
- 🔒 100% Privacy — all data stays on your device
- 🌐 Desktop + Mobile responsive

## Setup

### Frontend
```bash
cd gramsathi-ai
npm install
npm run dev        # → http://localhost:3002
```

### Backend (Python FastAPI + SQLite)
```bash
cd gramsathi-ai/backend
pip install -r requirements.txt
python main.py     # → http://localhost:8000
```

### Ollama (Optional — for real LLM responses)
On the Ollama server laptop:
```cmd
set OLLAMA_HOST=0.0.0.0
set OLLAMA_ORIGINS=*
ollama pull gemma3:4b
ollama serve
```

Create `.env` in `gramsathi-ai/`:
```
VITE_OLLAMA_URL=http://<OLLAMA_LAPTOP_IP>:11434
VITE_OLLAMA_MODEL=gemma3:4b
```

## Tech Stack
- **Frontend**: React 18 + Vite, CSS (responsive)
- **Backend**: Python FastAPI + SQLite
- **AI**: Web Speech API (STT/TTS) + Ollama (local LLM)
- **Languages**: Hindi (हिंदी), Marathi (मराठी), English

## Team
Built for **Hackathon — Reimagining Open Voice-First Handheld AI**
Domain: Artificial Intelligence | Problem Statement #5
