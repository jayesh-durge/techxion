/**
 * Voice Agents — 4 distinct voice personalities for GramSathi AI
 * Uses browser Web Speech API with best-quality voice selection
 */

export const VOICE_AGENTS = {
  dadi: {
    id: 'dadi', emoji: '👵',
    name: { hi: 'दादी माँ', mr: 'आजी', en: 'Grandma' },
    desc: { hi: 'धीमी, प्यारी आवाज़', mr: 'हळू, मायाळू आवाज', en: 'Slow, warm voice' },
    rate: 0.78, pitch: 1.28, genderPref: 'female',
    color: '#be185d',
  },
  ramu: {
    id: 'ramu', emoji: '👨‍🌾',
    name: { hi: 'राम भाई', mr: 'राम दादा', en: 'Village Voice' },
    desc: { hi: 'सामान्य, स्पष्ट आवाज़', mr: 'सामान्य, स्पष्ट आवाज', en: 'Normal, clear voice' },
    rate: 0.88, pitch: 0.92, genderPref: 'male',
    color: '#065f46',
  },
  teacher: {
    id: 'teacher', emoji: '👨‍🏫',
    name: { hi: 'मास्टर जी', mr: 'गुरुजी', en: 'Teacher' },
    desc: { hi: 'पढ़ाने वाली, तेज आवाज़', mr: 'शिकवण्याची, स्पष्ट आवाज', en: 'Teaching, clear voice' },
    rate: 0.97, pitch: 1.05, genderPref: 'neutral',
    color: '#1e40af',
  },
  doctor: {
    id: 'doctor', emoji: '👩‍⚕️',
    name: { hi: 'डॉक्टर जी', mr: 'डॉक्टर', en: 'Doctor' },
    desc: { hi: 'शांत, पेशेवर आवाज़', mr: 'शांत, व्यावसायिक आवाज', en: 'Calm, professional voice' },
    rate: 0.82, pitch: 1.12, genderPref: 'female',
    color: '#9f1239',
  },
};

const LANG_MAP = { hi: 'hi', mr: 'mr', en: 'en-IN' };

/** Load voices asynchronously (required by browsers) */
export const loadVoices = () =>
  new Promise((resolve) => {
    const v = speechSynthesis.getVoices();
    if (v.length > 0) { resolve(v); return; }
    speechSynthesis.addEventListener('voiceschanged', () => resolve(speechSynthesis.getVoices()), { once: true });
    setTimeout(() => resolve(speechSynthesis.getVoices()), 1000);
  });

/** Pick the highest-quality voice for a language */
export const pickBestVoice = (voices, lang, agentId = 'ramu') => {
  const agent = VOICE_AGENTS[agentId];
  const prefix = LANG_MAP[lang] || 'hi';

  // Score voices: higher = better
  const score = (v) => {
    let s = 0;
    if (v.lang.toLowerCase().startsWith(prefix)) s += 10;
    if (/natural|online|neural|premium/i.test(v.name)) s += 5;
    if (!v.localService) s += 3; // network = higher quality
    if (/google/i.test(v.name)) s += 2;
    if (/microsoft/i.test(v.name)) s += 1;
    // Gender match bonus
    if (agent?.genderPref === 'female' && /female|woman|swara|zira|hazel|neerja/i.test(v.name)) s += 2;
    if (agent?.genderPref === 'male' && /male|man|hemant|ravi/i.test(v.name)) s += 2;
    return s;
  };

  const sorted = [...voices].sort((a, b) => score(b) - score(a));
  return sorted[0] || null;
};

/** Speak text with a given voice agent */
export const speakWithAgent = (text, voices, lang, agentId, onStart, onEnd) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const agent = VOICE_AGENTS[agentId] || VOICE_AGENTS.ramu;
  const clean = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/[|#>*_`]/g, ' ')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 700);

  const utt = new SpeechSynthesisUtterance(clean);
  const bestVoice = pickBestVoice(voices, lang, agentId);
  if (bestVoice) utt.voice = bestVoice;
  utt.lang  = LANG_MAP[lang] || 'hi-IN';
  utt.rate  = agent.rate;
  utt.pitch = agent.pitch;
  utt.volume = 1;

  utt.onstart  = onStart;
  utt.onend    = onEnd;
  utt.onerror  = onEnd;

  // Chrome bug: cancel first, then speak after small delay
  setTimeout(() => window.speechSynthesis.speak(utt), 120);
};
