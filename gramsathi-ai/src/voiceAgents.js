/**
 * GramSathi Cloud Voice Agents
 */

export const VOICE_AGENTS = {
  meera: {
    id: 'meera', emoji: '👩',
    name: { hi: 'महिला आवाज़', mr: 'महिला आवाज', en: 'Female Voice' },
    desc: { hi: 'अत्यंत स्पष्ट और प्राकृतिक आवाज़', mr: 'अत्यंत स्पष्ट आणि नैसर्गिक आवाज', en: 'Clear and natural female voice' },
    genderPref: 'female',
    color: '#be185d',
    rate: 1.0, pitch: 1.0,
  },
  shubh: {
    id: 'shubh', emoji: '👨',
    name: { hi: 'पुरुष आवाज़', mr: 'पुरुष आवाज', en: 'Male Voice' },
    desc: { hi: 'स्पष्ट और पेशेवर आवाज़', mr: 'स्पष्ट आणि व्यावसायिक आवाज', en: 'Clear and professional male voice' },
    genderPref: 'male',
    color: '#065f46',
    rate: 1.0, pitch: 1.0,
  },
};

const LANG_MAP = { hi: 'hi', mr: 'mr', en: 'en-IN' };

export const loadVoices = () => Promise.resolve([]);
export const pickBestVoice = () => null;
export const speakWithAgent = () => { /* fallback disabled since we rely on backend Sarvam api completely now */ };
