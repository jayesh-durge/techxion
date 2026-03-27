/**
 * GramSathi Cloud Voice Agents
 */

export const VOICE_AGENTS = {
  meera: {
    id: 'meera', emoji: '👩',
    name: {
      hi: 'महिला आवाज़', mr: 'महिला आवाज', en: 'Female Voice',
      bn: 'মহিলা কণ্ঠ', ta: 'பெண் குரல்', te: 'మహిళా స్వరం', gu: 'મહિલા અવાજ',
      kn: 'ಮಹಿಳಾ ಧ್ವನಿ', ml: 'സ്ത്രീ ശബ്ദം', pa: 'ਮਹਿਲਾ ਆਵਾਜ਼',
    },
    desc: {
      hi: 'अत्यंत स्पष्ट और प्राकृतिक आवाज़', mr: 'अत्यंत स्पष्ट आणि नैसर्गिक आवाज', en: 'Clear and natural female voice',
      bn: 'স্পষ্ট এবং প্রাকৃতিক মহিলা কণ্ঠ', ta: 'தெளிவான இயல்பான பெண் குரல்', te: 'స్పష్టమైన సహజ మహిళా స్వరం', gu: 'સ્પષ્ટ અને કુદરતી મહિલા અવાજ',
      kn: 'ಸ್ಪಷ್ಟ ಮತ್ತು ಸಹಜ ಮಹಿಳಾ ಧ್ವನಿ', ml: 'വ്യക്തവും സ്വാഭാവികവും ആയ സ്ത്രീ ശബ്ദം', pa: 'ਸਾਫ਼ ਅਤੇ ਕੁਦਰਤੀ ਮਹਿਲਾ ਆਵਾਜ਼',
    },
    genderPref: 'female',
    color: '#be185d',
    rate: 1.0, pitch: 1.0,
  },
  shubh: {
    id: 'shubh', emoji: '👨',
    name: {
      hi: 'पुरुष आवाज़', mr: 'पुरुष आवाज', en: 'Male Voice',
      bn: 'পুরুষ কণ্ঠ', ta: 'ஆண் குரல்', te: 'పురుష స్వరం', gu: 'પુરુષ અવાજ',
      kn: 'ಪುರುಷ ಧ್ವನಿ', ml: 'പുരുഷ ശബ്ദം', pa: 'ਪੁਰਸ਼ ਆਵਾਜ਼',
    },
    desc: {
      hi: 'स्पष्ट और पेशेवर आवाज़', mr: 'स्पष्ट आणि व्यावसायिक आवाज', en: 'Clear and professional male voice',
      bn: 'স্পষ্ট এবং পেশাদার পুরুষ কণ্ঠ', ta: 'தெளிவான தொழில்முறை ஆண் குரல்', te: 'స్పష్టమైన ప్రొఫెషనల్ పురుష స్వరం', gu: 'સ્પષ્ટ અને વ્યાવસાયિક પુરુષ અવાજ',
      kn: 'ಸ್ಪಷ್ಟ ಮತ್ತು ವೃತ್ತಿಪರ ಪುರುಷ ಧ್ವನಿ', ml: 'വ്യക്തവും പ്രൊഫഷണലുമായ പുരുഷ ശബ്ദം', pa: 'ਸਾਫ਼ ਅਤੇ ਪ੍ਰੋਫੈਸ਼ਨਲ ਪੁਰਸ਼ ਆਵਾਜ਼',
    },
    genderPref: 'male',
    color: '#065f46',
    rate: 1.0, pitch: 1.0,
  },
};

const LANG_MAP = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN' };

export const loadVoices = () => Promise.resolve([]);
export const pickBestVoice = () => null;
export const speakWithAgent = () => { /* fallback disabled since we rely on backend Sarvam api completely now */ };
