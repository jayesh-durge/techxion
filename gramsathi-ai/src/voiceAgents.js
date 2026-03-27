/**
 * Google gTTS Voice Agents
 */

export const VOICE_AGENTS = {
  meera: {
    id: 'meera', emoji: '👩',
    name: { hi: 'महिला (Google)', mr: 'महिला (Google)', en: 'Google (Female)' },
    desc: { hi: 'गूगल की महिलाओं वाली आवाज़', mr: 'गुगलचा महिला आवाज', en: 'Standard Google TTS' },
    genderPref: 'female',
    color: '#be185d',
    rate: 1.0, pitch: 1.0,
  },
  shubh: {
    id: 'shubh', emoji: '👨',
    name: { hi: 'पुरुष (Google)', mr: 'पुरुष (Google)', en: 'Google (Male)' },
    desc: { hi: 'गूगल की आवाज़', mr: 'गुगलचा आवाज', en: 'Standard Google TTS' },
    genderPref: 'male',
    color: '#065f46',
    rate: 1.0, pitch: 1.0,
  },
};

const LANG_MAP = { hi: 'hi', mr: 'mr', en: 'en-IN' };

export const loadVoices = () => Promise.resolve([]);
export const pickBestVoice = () => null;
export const speakWithAgent = () => { /* fallback disabled since we rely on backend Sarvam api completely now */ };
