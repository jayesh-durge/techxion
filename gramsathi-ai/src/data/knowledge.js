/**
 * GramSathi AI — Knowledge Base
 * Multilingual knowledge packs for all 4 modules
 * Simulates local RAG (ChromaDB/FAISS) + rule-based NLP fallback
 */

export const MODULES = {
  govt: {
    id: 'govt',
    name: '🏛️ सरकारी योजना',
    nameEn: 'Govt Schemes',
    desc: 'PM किसान, MNREGA, Ayushman Bharat',
    color: 'var(--govt)',
    cls: 'govt',
    icon: '🏛️',
    lang: 'hi-IN',
    suggested: {
      hi: ['PM किसान योजना क्या है?', 'MNREGA में काम कैसे मिलेगा?', 'आयुष्मान भारत में कौन पात्र है?', 'राशन कार्ड कैसे बनता है?'],
      mr: ['PM किसान योजना काय आहे?', 'MNREGA कार्ड कसे मिळते?'],
      en: ['What is PM Kisan scheme?', 'How to apply for MNREGA?'],
    },
    knowledge: [
      {
        patterns: ['pm kisan', 'पीएम किसान', 'किसान योजना', 'kisan yojana'],
        hi: `**पीएम किसान सम्मान निधि योजना** 🌾\n\nइस योजना में सरकार हर साल **₹6,000** देती है — तीन किस्तों में (₹2,000 हर 4 महीने)।\n\n**कौन पात्र है?**\n- जिनके पास 2 हेक्टेयर से कम जमीन हो\n- जिनका नाम भूमि रिकॉर्ड में हो\n- आधार कार्ड से लिंक बैंक खाता हो\n\n**कैसे करें आवेदन?**\n1. pmkisan.gov.in वेबसाइट पर जाएं\n2. "New Farmer Registration" पर क्लिक करें\n3. आधार नंबर, बैंक खाता, जमीन के कागज दें\n4. CSC सेंटर से भी आवेदन कर सकते हैं\n\n⚠️ किसी से पैसे देकर मदद न लें — यह प्रक्रिया **बिल्कुल मुफ्त** है।`,
        mr: `**पीएम किसान सन्मान निधी योजना** 🌾\n\nसरकार दर वर्षी **₹6,000** देते — तीन हप्त्यांमध्ये (₹2,000 प्रत्येक 4 महिन्यांनी).\n\n**कोण पात्र आहे?**\n- 2 हेक्टरपेक्षा कमी जमीन असणारे शेतकरी\n- आधार कार्डशी लिंक केलेले बँक खाते\n\n**अर्ज कसा करावा?** pmkisan.gov.in वर जा किंवा CSC केंद्राला भेट द्या.`,
        en: `**PM Kisan Samman Nidhi** 🌾\n\nFarmers receive **₹6,000/year** in 3 installments (₹2,000 every 4 months).\n\n**Eligibility:** Small/marginal farmers with up to 2 hectares of land, Aadhaar-linked bank account.\n\n**Apply at:** pmkisan.gov.in or nearest CSC center. It's completely **free** to apply.`,
        sources: ['PM Kisan Portal', 'Ministry of Agriculture'],
      },
      {
        patterns: ['mnrega', 'मनरेगा', 'नरेगा', 'nrega', 'रोजगार'],
        hi: `**MNREGA (मनरेगा) — महात्मा गांधी राष्ट्रीय ग्रामीण रोजगार गारंटी योजना** 💼\n\n**क्या मिलता है?**\n- हर परिवार को साल में **100 दिन का गारंटीशुदा रोजगार**\n- न्यूनतम **₹220-300/दिन** मजदूरी (राज्य के अनुसार)\n\n**कैसे मिलेगा काम?**\n1. ग्राम पंचायत में MNREGA जॉब कार्ड के लिए आवेदन करें\n2. आधार कार्ड, फोटो, बैंक खाता नंबर लेकर जाएं\n3. जॉब कार्ड मिलने के 15 दिन में काम दिया जाएगा\n\n**महत्वपूर्ण:**\n- काम न मिलने पर बेरोजगारी भत्ता मिलता है\n- मजदूरी सीधे बैंक में आती है — बिचौलिए नहीं\n- शिकायत: nrega.nic.in पर करें`,
        mr: `**MNREGA** — दरवर्षी प्रत्येक कुटुंबाला **100 दिवसांचा रोजगार** मिळतो.\n\nग्राम पंचायतीत जाऊन Job Card साठी अर्ज करा. आधार, फोटो, बँक खाते घेऊन जा.`,
        en: `**MNREGA** provides **100 days guaranteed employment** per family per year.\n\n**Wages:** ₹220–300/day directly to bank account.\n\n**Apply:** Visit Gram Panchayat with Aadhaar, photo, and bank account details. Get your Job Card within 15 days.`,
        sources: ['MNREGA Portal', 'Ministry of Rural Development'],
      },
      {
        patterns: ['ayushman', 'आयुष्मान', 'health card', 'अस्पताल', 'इलाज', 'pmjay'],
        hi: `**आयुष्मान भारत — प्रधानमंत्री जन आरोग्य योजना** 🏥\n\n**क्या मिलता है?**\n- हर परिवार को **₹5 लाख तक का मुफ्त इलाज** हर साल\n- सरकारी और चुनिंदा प्राइवेट अस्पतालों में\n- 1,300+ बीमारियां कवर\n\n**कौन पात्र है?**\n- SECC 2011 डेटा के अनुसार गरीब परिवार\n- jan.pmjay.gov.in पर अपना नाम चेक करें\n\n**गोल्डन कार्ड कैसे बनवाएं?**\n1. नजदीकी CSC या आयुष्मान मित्र से संपर्क करें\n2. आधार कार्ड और राशन कार्ड लाएं\n3. मुफ्त में कार्ड बनता है\n\n⚠️ कोई पैसे मांगे तो शिकायत करें: 14555`,
        mr: `**आयुष्मान भारत** — दरवर्षी **₹5 लाखांपर्यंत मोफत उपचार**.\n\njanpmjay.gov.in वर नाव तपासा. नजीकच्या CSC केंद्रावर जाऊन Golden Card बनवा.`,
        en: `**Ayushman Bharat PMJAY** provides **₹5 lakh health cover** per family per year.\n\n**Check eligibility:** jan.pmjay.gov.in or call 14555. Get your Golden Card for free at CSC centers.`,
        sources: ['Ayushman Bharat Portal', 'NHA'],
      },
      {
        patterns: ['ration', 'राशन', 'पीडीएस', 'pds', 'अनाज'],
        hi: `**राशन कार्ड और PDS (सार्वजनिक वितरण प्रणाली)** 🍚\n\n**राशन पर क्या मिलता है?**\n- BPL परिवार: **5 किलो चावल/गेहूं ₹1-3/किलो** प्रति सदस्य\n- PM गरीब कल्याण अन्न योजना: अतिरिक्त **5 किलो मुफ्त**\n\n**राशन कार्ड कैसे बनाएं?**\n1. तहसील/CSC ऑफिस में आवेदन करें\n2. आधार, निवास प्रमाण, परिवार के सदस्यों की जानकारी दें\n3. eKYC ज़रूरी है\n\n**One Nation One Ration Card:** अब कहीं से भी राशन मिल सकता है।`,
        mr: `**रेशन कार्ड** — BPL कुटुंबांना ₹1-3/किलो दराने धान्य मिळते.\n\nतालुका कार्यालयात किंवा CSC केंद्रावर अर्ज करा.`,
        en: `**Ration Card / PDS:** BPL families get 5 kg grain at ₹1-3/kg per member.\n\nApply at Tehsil office or CSC center with Aadhaar and residence proof.`,
        sources: ['DFPD India', 'State Food Dept'],
      },
    ],
  },

  farm: {
    id: 'farm',
    name: '🌾 खेती साथी',
    nameEn: 'Farming Assistant',
    desc: 'फसल, कीट, उर्वरक, सिंचाई',
    color: 'var(--farm)',
    cls: 'farm',
    icon: '🌾',
    lang: 'hi-IN',
    suggested: {
      hi: ['जुलाई में कौन सी फसल बोएं?', 'गेहूं में लगने वाले कीड़े', 'यूरिया की सही मात्रा', 'धान में पानी कब दें?'],
      mr: ['जुलैमध्ये कोणती पिके घ्यावीत?', 'गव्हावरील कीड कोणती?'],
      en: ['Best crops for July?', 'How to control pests in wheat?'],
    },
    knowledge: [
      {
        patterns: ['जुलाई', 'july', 'खरीफ', 'kharif', 'बारिश', 'monsoon'],
        hi: `**जुलाई में खरीफ फसलें** 🌧️\n\n**मुख्य फसलें (बोने का सही समय):**\n\n| फसल | बुवाई का समय | उत्पादन |\n|---|---|---|\n| धान (चावल) | जून-जुलाई | 45-60 क्विंटल/हेक्टेयर |\n| मक्का | जून-जुलाई | 40-50 क्विंटल |\n| सोयाबीन | जून-जुलाई | 15-20 क्विंटल |\n| अरहर (तुअर) | जून-जुलाई | 10-15 क्विंटल |\n| मूंग | जुलाई | 8-10 क्विंटल |\n\n**टिप्स:**\n- बीज उपचार ज़रूर करें (थीरम/कैप्टान से)\n- मिट्टी परीक्षण के आधार पर खाद डालें\n- मेड़बंदी करें — पानी बर्बाद न हो`,
        mr: `**जुलैमधील खरीप पिके** 🌧️\n\nभात, मका, सोयाबीन, तूर, मूग — या पिकांची पेरणी करा.\n\nबियाणे उपचार (थायरम) नक्की करा. माती परीक्षण करून खते द्या.`,
        en: `**Kharif Crops for July** 🌧️\n\nSow: Paddy, Maize, Soybean, Pigeon Pea (Arhar), Moong.\n\n**Tips:** Treat seeds before sowing. Test soil for fertilizer needs. Build bunds to retain rainwater.`,
        sources: ['ICAR Kharif Crop Guide', 'State Agriculture Dept'],
      },
      {
        patterns: ['कीड़े', 'pest', 'कीट', 'रोग', 'blight', 'झुलसा', 'टिड्डी'],
        hi: `**फसलों में कीट एवं रोग नियंत्रण** 🐛\n\n**सामान्य कीट और उपाय:**\n\n**दीमक (Termite):**\n- क्लोरपाइरीफॉस 20 EC — 5 लीटर/हेक्टेयर बोने से पहले मिट्टी में मिलाएं\n\n**तना छेदक (Stem Borer) — धान में:**\n- कारटैप हाइड्रोक्लोराइड 4G — 18 किलो/हेक्टेयर\n\n**माहू (Aphid) — सरसों/गेहूं में:**\n- इमिडाक्लोप्रिड 17.8 SL — 125 मिली/हेक्टेयर\n\n**जैविक उपाय:**\n- नीम का तेल (5 मिली/लीटर पानी) छिड़काव करें\n- पीले चिपचिपे ट्रैप लगाएं\n- फसल चक्र अपनाएं\n\n⚠️ कीटनाशक छिड़काव शाम को करें — मधुमक्खियां बचाएं!`,
        mr: `**कीड व रोग नियंत्रण** 🐛\n\nदीमक: क्लोरपायरीफॉस मातीत मिसळा.\nखोडकिडा: कारटॅप 4G वापरा.\nमावा: निंबोळी तेल (5 मिली/लीटर) फवारणी करा.\n\n⚠️ फवारणी संध्याकाळी करा.`,
        en: `**Pest Control** 🐛\n\n**Termite:** Mix Chlorpyrifos 20 EC in soil before sowing.\n**Stem Borer:** Cartap Hydrochloride 4G @ 18 kg/hectare.\n**Aphids:** Imidacloprid 17.8 SL @ 125 ml/hectare.\n\n**Organic:** Neem oil (5ml/litre) spray. Use yellow sticky traps. Practice crop rotation.`,
        sources: ['ICAR Pest Management', 'Krishi Vigyan Kendra'],
      },
      {
        patterns: ['यूरिया', 'urea', 'खाद', 'fertilizer', 'उर्वरक', 'dap'],
        hi: `**खाद और उर्वरक — सही मात्रा और समय** 🌱\n\n**मुख्य उर्वरक:**\n\n| उर्वरक | मात्रा/हेक्टेयर | कब डालें |\n|---|---|---|\n| यूरिया | 100-120 किलो | 3 बार (बुवाई+20दिन+40दिन) |\n| DAP | 100 किलो | बुवाई के समय |\n| MOP (पोटाश) | 60 किलो | बुवाई के समय |\n\n**जैविक खाद:**\n- गोबर खाद: 10-15 टन/हेक्टेयर — बुवाई से 3 सप्ताह पहले\n- वर्मीकम्पोस्ट: 2.5 टन/हेक्टेयर\n\n**PM Kisan FPO योजना:** किसान उत्पादक संगठन से सस्ती खाद मिल सकती है।\n\n⚠️ मिट्टी परीक्षण के बिना अंधाधुंध खाद न डालें!`,
        mr: `**खते व मात्रा** 🌱\n\nयुरिया: 100-120 किलो/हे (3 वेळा)\nDAP: 100 किलो बुवाणीच्या वेळी\nशेणखत: 10-15 टन/हे — पेरणीपूर्वी 3 आठवडे\n\nमाती परीक्षण करूनच खते द्या!`,
        en: `**Fertilizer Guide** 🌱\n\n| Fertilizer | Dose/hectare | Timing |\n|---|---|---|\n| Urea | 100-120 kg | Split in 3 doses |\n| DAP | 100 kg | At sowing |\n| FYM (Compost) | 10-15 tonnes | 3 weeks before sowing |\n\n⚠️ Always do soil testing before applying fertilizers.`,
        sources: ['ICAR Fertilizer Guide', 'State Agriculture Dept'],
      },
      {
        patterns: ['सिंचाई', 'पानी', 'irrigation', 'water', 'drip'],
        hi: `**सिंचाई — कब और कितना पानी दें** 💧\n\n**फसलवार सिंचाई:**\n\n| फसल | पानी की जरूरत | क्रांतिक अवस्था |\n|---|---|---|\n| गेहूं | 6-8 बार | CRI, फुटाव, बाली निकलना |\n| धान | लगातार 5cm | रोपाई से पकाई तक |\n| मक्का | 5-6 बार | फूल और दाना भरते समय |\n| सोयाबीन | 3-4 बार | फूल और फली भरते समय |\n\n**ड्रिप और स्प्रिंकलर:**\n- 40-50% पानी बचता है\n- PM कृषि सिंचाई योजना में 80-90% सब्सिडी मिलती है\n\n📞 जिला उद्यान विभाग से संपर्क करें।`,
        mr: `**सिंचन** 💧\n\nगहू: 6-8 वेळा; धान: सतत 5 सेमी पाणी; मका: 5-6 वेळा.\n\nठिबक सिंचनावर 80-90% अनुदान मिळते (PM कृषी सिंचन योजना).`,
        en: `**Irrigation Guide** 💧\n\nWheat: 6-8 irrigations (critical: CRI, tillering, grain fill).\nPaddy: Maintain 5cm water continuously.\nMaize: 5-6 irrigations.\n\n**Drip/Sprinkler:** 80-90% subsidy under PM Krishi Sinchai Yojana.`,
        sources: ['ICAR Water Management', 'PMKSY Portal'],
      },
    ],
  },

  health: {
    id: 'health',
    name: '🏥 स्वास्थ्य सेवा',
    nameEn: 'Health Assistant',
    desc: 'लक्षण, घरेलू उपाय, डॉक्टर सलाह',
    color: 'var(--health)',
    cls: 'health',
    icon: '🏥',
    lang: 'hi-IN',
    suggested: {
      hi: ['बुखार में क्या करूं?', 'बच्चे को दस्त हो रहे हैं', 'सर्दी-खांसी का घरेलू उपाय', 'पेट में दर्द है'],
      mr: ['तापावर काय करावे?', 'मुलाला जुलाब होत आहे'],
      en: ['What to do for fever?', 'Home remedy for cold?'],
    },
    knowledge: [
      {
        patterns: ['बुखार', 'fever', 'ताप', 'तेज गर्मी', 'temperature'],
        hi: `**बुखार — क्या करें और क्या न करें** 🌡️\n\n**घरेलू उपाय:**\n- ठंडे पानी की पट्टी माथे पर रखें\n- पैरासिटामोल 500mg (वयस्क) / 15mg/kg (बच्चे)\n- खूब पानी पिएं — ORS दें\n- आराम करें, हल्का खाना खाएं\n\n**डेंगू के लक्षण हैं तो:**\n- आंखों के पीछे दर्द, जोड़ों में दर्द, लाल चकत्ते\n- **एस्पिरिन/ब्रूफेन बिल्कुल न दें!**\n\n🚨 **तुरंत डॉक्टर के पास जाएं अगर:**\n- बुखार 3 दिन से ज़्यादा हो\n- सांस लेने में तकलीफ हो\n- बेहोशी या फिट आए\n- नाक/मसूड़ों से खून आए\n\n📞 आपातकाल: 108`,
        mr: `**ताप — काय करावे** 🌡️\n\nकपाळावर थंड पाण्याची पट्टी ठेवा. Paracetamol 500mg द्या. ORS पिण्यास द्या.\n\n🚨 3 दिवसांपेक्षा जास्त ताप, श्वास घेण्यात त्रास, नाकातून रक्त — ताबडतोब डॉक्टरकडे जा. 📞 108`,
        en: `**Fever Management** 🌡️\n\nApply cold compress on forehead. Give Paracetamol (adults: 500mg, children: 15mg/kg). Give ORS. Rest and light food.\n\n🚨 **See doctor immediately if:** Fever > 3 days, difficulty breathing, bleeding, seizures, unconsciousness.\n📞 Emergency: 108`,
        sources: ['WHO Fever Guidelines', 'ASHA Field Guide'],
      },
      {
        patterns: ['दस्त', 'diarrhea', 'पतला', 'loose motion', 'पेचिश', 'ORS'],
        hi: `**दस्त (Diarrhea) — उपाय** 💧\n\n**ORS बनाने का तरीका:**\n1. 1 लीटर साफ उबला पानी लें\n2. 6 चम्मच चीनी + ½ चम्मच नमक मिलाएं\n3. थोड़ा-थोड़ा बार-बार पिलाते रहें\n\n**उम्र के अनुसार मात्रा:**\n- 2 साल से कम: हर दस्त के बाद 50-100ml\n- 2-10 साल: 100-200ml\n- वयस्क: जितना पी सकें\n\n**खाना खाते रहें** — भूखे न रखें!\n\n🚨 **तुरंत अस्पताल जाएं:**\n- खून वाले दस्त हों\n- बच्चा बेहोश जैसा लगे\n- 24 घंटे में 10 से ज़्यादा दस्त\n- आंखें धंसी लगें`,
        mr: `**जुलाब — उपाय** 💧\n\nORS बनवा: 1 लीटर उकडलेले पाणी + 6 चमचे साखर + ½ चमचे मीठ.\n\nदर जुलाबानंतर मुलांना 50-100ml ORS द्या. खाणे थांबवू नका!\n\n🚨 रक्तमिश्रित जुलाब, बेशुद्धपणा — लगेच रुग्णालयात जा.`,
        en: `**Diarrhea Treatment** 💧\n\n**Make ORS:** 1 litre boiled water + 6 tsp sugar + ½ tsp salt.\n\nAfter each stool: Under 2 yrs → 50-100ml, 2-10 yrs → 100-200ml.\n\n🚨 **Emergency:** Bloody stool, sunken eyes, unable to drink, >10 stools/day.`,
        sources: ['WHO ORS Guidelines', 'ASHA Field Guide Ch.4'],
      },
      {
        patterns: ['खांसी', 'cough', 'सर्दी', 'cold', 'नजला', 'गला'],
        hi: `**सर्दी-खांसी — घरेलू उपाय** 🤧\n\n**काढ़ा बनाएं:**\n- तुलसी के 5-7 पत्ते\n- 1 छोटा टुकड़ा अदरक\n- 1 चुटकी काली मिर्च\n- 2 लौंग\n- पानी में 5 मिनट उबालें → शहद मिलाकर पिएं\n\n**और उपाय:**\n- गर्म पानी की भाप लें (Steam)\n- हल्दी वाला दूध — रात को सोने से पहले\n- गले को गर्म कपड़े से ढकें\n- खूब पानी पिएं\n\n**दवाएं:**\n- Cetrizine 10mg — एलर्जी के लिए\n- Paracetamol — बुखार होने पर\n\n🚨 **डॉक्टर के पास जाएं:**\n- खांसी 2 हफ्ते से ज़्यादा हो\n- खून आ रहा हो\n- सांस फूल रही हो`,
        mr: `**सर्दी-खोकला** 🤧\n\nकड्यासाठी: तुलसी + आले + काळी मिरी + लवंग — 5 मिनिटे उकळा, मध घालून प्या.\nहळदीचे दूध रात्री प्या. वाफ घ्या.\n\n🚨 2 आठवड्यांपेक्षा जास्त खोकला, रक्त — डॉक्टरकडे जा.`,
        en: `**Cold & Cough Remedies** 🤧\n\n**Herbal Kadha:** Boil tulsi, ginger, black pepper, clove for 5 mins. Add honey.\n**Turmeric milk** at night. Steam inhalation.\n\n**Medicine:** Cetirizine for allergy, Paracetamol for fever.\n\n🚨 See doctor if: cough > 2 weeks, blood in sputum, breathlessness.`,
        sources: ['AYUSH Home Remedy Guide', 'ASHA Field Guide'],
      },
      {
        patterns: ['पेट', 'stomach', 'अपच', 'indigestion', 'acidity', 'एसिडिटी', 'गैस'],
        hi: `**पेट दर्द / अपच / एसिडिटी** 🤕\n\n**तुरंत राहत के लिए:**\n- जीरा गर्म पानी में उबालकर पिएं\n- अजवायन + काला नमक चबाएं\n- गर्म पानी पिएं, लेट जाएं\n\n**एसिडिटी:**\n- ठंडा दूध — तुरंत राहत\n- Antacid (Gelusil/Digene) लें\n- खाना छोटे-छोटे टुकड़ों में खाएं\n- मसाला, तेल, चाय कम करें\n\n🚨 **तुरंत डॉक्टर के पास:**\n- पेट में बहुत तेज़ दर्द जो कम न हो\n- उल्टियों में खून हो\n- पीलिया के लक्षण हों\n- 3 दिन से ज़्यादा दर्द`,
        mr: `**पोटदुखी / अपचन** 🤕\n\nजिरे गरम पाण्यात उकळून प्या. ओवा + काळे मीठ चावा. थंड दूध एसिडिटीसाठी.\n\n🚨 तीव्र दुखणे, उलटीत रक्त, कावीळ — ताबडतोब डॉक्टर.`,
        en: `**Stomach Pain / Indigestion** 🤕\n\nCumin water (boil cumin, drink warm). Ajwain + black salt for gas. Cold milk for acidity.\n\n**Medicine:** Antacid (Gelusil) for acidity.\n\n🚨 See doctor: severe unrelenting pain, blood in vomit, jaundice, pain > 3 days.`,
        sources: ['AYUSH Remedies', 'Medical Guidelines India'],
      },
    ],
  },

  edu: {
    id: 'edu',
    name: '📖 शिक्षा मित्र',
    nameEn: 'Education',
    desc: 'गणित, विज्ञान, भूगोल — सरल भाषा में',
    color: 'var(--edu)',
    cls: 'edu',
    icon: '📖',
    lang: 'hi-IN',
    suggested: {
      hi: ['प्रकाश संश्लेषण क्या है?', 'पाइथागोरस प्रमेय समझाओ', 'भारत की राजधानी क्या है?', 'ब्याज कैसे निकालते हैं?'],
      mr: ['प्रकाश संश्लेषण म्हणजे काय?', 'पायथागोरस प्रमेय सांगा'],
      en: ['What is photosynthesis?', 'Explain Pythagoras theorem'],
    },
    knowledge: [
      {
        patterns: ['प्रकाश संश्लेषण', 'photosynthesis', 'पत्तियां', 'chlorophyll', 'क्लोरोफिल'],
        hi: `**प्रकाश संश्लेषण (Photosynthesis)** 🌿\n\nपेड़-पौधे अपना खाना खुद बनाते हैं — इसी को प्रकाश संश्लेषण कहते हैं!\n\n**क्या चाहिए (सामग्री):**\n- ☀️ सूरज की रोशनी\n- 💧 पानी (जड़ों से)\n- 🌬️ कार्बन डाइऑक्साइड (हवा से)\n\n**क्या बनता है (उत्पाद):**\n- 🍬 ग्लूकोज (पौधे का खाना)\n- 🫧 ऑक्सीजन (हम सांस लेते हैं!)\n\n**सूत्र:**\n6CO₂ + 6H₂O + सूर्यप्रकाश → C₆H₁₂O₆ + 6O₂\n\n**कहां होता है?** पत्तियों में मौजूद **क्लोरोप्लास्ट** में — यही हरा रंग देता है!\n\n💡 **मज़ेदार तथ्य:** जो ऑक्सीजन हम सांस लेते हैं, वो पेड़ों की देन है!`,
        mr: `**प्रकाश संश्लेषण** 🌿\n\nझाडे सूर्यप्रकाश, पाणी, CO₂ वापरून ग्लुकोज बनवतात व O₂ सोडतात.\n\n6CO₂ + 6H₂O + सूर्यप्रकाश → C₆H₁₂O₆ + 6O₂\n\nहे क्लोरोप्लास्टमध्ये होते — जे पानांना हिरवा रंग देते.`,
        en: `**Photosynthesis** 🌿\n\nPlants make food using sunlight + water + CO₂ → glucose + oxygen.\n\n**Formula:** 6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂\n\nHappens in **chloroplasts** (gives leaves their green color).`,
        sources: ['NCERT Science Grade 7', 'CBSE Biology'],
      },
      {
        patterns: ['पाइथागोरस', 'pythagoras', 'त्रिभुज', 'triangle', 'कर्ण', 'hypotenuse'],
        hi: `**पाइथागोरस प्रमेय** 📐\n\n**नियम:** समकोण त्रिभुज में —\n\n> **a² + b² = c²**\n\nजहां:\n- **c** = कर्ण (सबसे लंबी भुजा — समकोण के सामने)\n- **a, b** = दूसरी दो भुजाएं\n\n**उदाहरण:**\nयदि a = 3, b = 4 → c² = 9 + 16 = 25 → **c = 5** ✓\n\n**3-4-5 का त्रिकोण** सबसे प्रसिद्ध है!\n\n**व्यवहारिक उपयोग:**\n- बिल्डर इससे 90° का कोना जांचते हैं\n- खेत की माप में काम आता है\n- मकान की छत बनाने में\n\n💡 **याद करने का तरीका:** कर्ण = राजा, बाकी दो = साथी`,
        mr: `**पायथागोरस प्रमेय** 📐\n\nकाटकोन त्रिकोणात: **a² + b² = c²**\n\nc = कर्ण (सर्वात मोठी बाजू)\n\nउदाहरण: a=3, b=4 → c=5 (प्रसिद्ध 3-4-5 त्रिकोण)`,
        en: `**Pythagoras Theorem** 📐\n\nIn a right-angled triangle: **a² + b² = c²**\n\nc = hypotenuse (longest side, opposite the right angle).\n\nExample: 3² + 4² = 5² (9 + 16 = 25) ✓`,
        sources: ['NCERT Math Grade 8'],
      },
      {
        patterns: ['ब्याज', 'interest', 'साधारण', 'simple interest', 'चक्रवृद्धि'],
        hi: `**साधारण ब्याज (Simple Interest)** 💰\n\n**सूत्र:**\n> **SI = (P × R × T) / 100**\n\nजहां:\n- **P** = मूलधन (जितने पैसे लगाए)\n- **R** = ब्याज दर (% प्रति वर्ष)\n- **T** = समय (वर्षों में)\n\n**उदाहरण:**\nP = ₹10,000, R = 8%, T = 3 साल\nSI = (10,000 × 8 × 3) / 100 = **₹2,400**\nकुल राशि = 10,000 + 2,400 = **₹12,400**\n\n**चक्रवृद्धि ब्याज (Compound Interest):**\n> A = P × (1 + R/100)ᵀ\n\n💡 **महत्वपूर्ण:** बैंक लोन में ब्याज समझकर ही लें!`,
        mr: `**साधारण व्याज** 💰\n\nSI = (मुद्दल × दर × वेळ) / 100\n\nउदा: ₹10,000, 8%, 3 वर्षे → SI = ₹2,400`,
        en: `**Simple Interest** 💰\n\n**Formula:** SI = (P × R × T) / 100\n\nExample: P=₹10,000, R=8%, T=3 years → SI = ₹2,400, Total = ₹12,400`,
        sources: ['NCERT Math Grade 7-8'],
      },
      {
        patterns: ['भारत', 'india', 'राजधानी', 'capital', 'राज्य', 'state', 'geography', 'भूगोल'],
        hi: `**भारत — महत्वपूर्ण जानकारी** 🇮🇳\n\n**राजधानी:** नई दिल्ली\n**क्षेत्रफल:** 32.8 लाख वर्ग किमी (विश्व में 7वां)\n**जनसंख्या:** ~140 करोड़ (विश्व में प्रथम)\n**राज्य:** 28 राज्य + 8 केंद्र शासित प्रदेश\n**भाषाएं:** 22 अनुसूचित भाषाएं\n\n**प्रमुख नदियां:** गंगा, यमुना, ब्रह्मपुत्र, नर्मदा, गोदावरी\n**सबसे ऊंची चोटी:** K2 (जम्मू-कश्मीर में भारत का हिस्सा)\n\n**भारत का संविधान:** 26 जनवरी 1950 को लागू हुआ\n**राष्ट्रीय पशु:** बाघ | **राष्ट्रीय पक्षी:** मोर\n**राष्ट्रीय फल:** आम | **राष्ट्रीय फूल:** कमल`,
        mr: `**भारत** 🇮🇳\n\nराजधानी: नवी दिल्ली | क्षेत्रफळ: 32.8 लाख चौ.किमी | लोकसंख्या: ~140 कोटी\n28 राज्ये + 8 केंद्रशासित प्रदेश | राष्ट्रीय प्राणी: वाघ | राष्ट्रीय पक्षी: मोर`,
        en: `**India Facts** 🇮🇳\n\nCapital: New Delhi | Area: 3.28 million km² | Population: ~1.4 billion\n28 States + 8 UTs | National Animal: Tiger | National Bird: Peacock`,
        sources: ['NCERT Geography', 'General Knowledge India'],
      },
    ],
  },
};

/** Match query to a knowledge entry */
export const findAnswer = (query, moduleId, lang = 'hi') => {
  const mod = MODULES[moduleId];
  if (!mod) return null;
  const q = query.toLowerCase().trim();
  for (const entry of mod.knowledge) {
    if (entry.patterns.some(p => q.includes(p.toLowerCase()))) {
      return { text: entry[lang] || entry.hi, sources: entry.sources };
    }
  }
  // Fallback
  const fallback = {
    hi: `मैं GramSathi AI हूं — आपका गाँव का साथी! 🌿\n\nआपने पूछा: "${query}"\n\nमुझे इस सवाल का जवाब अभी नहीं मिला। कृपया इन विषयों पर पूछें:\n${mod.suggested.hi.map(s => `• ${s}`).join('\n')}\n\n🔒 आपकी जानकारी सुरक्षित है — कोई डेटा बाहर नहीं जाता।`,
    mr: `मी GramSathi AI आहे! 🌿\n\nतुम्ही विचारले: "${query}"\n\nया विषयांवर विचारा:\n${(mod.suggested.mr || mod.suggested.hi).map(s => `• ${s}`).join('\n')}`,
    en: `I'm GramSathi AI! 🌿\n\nYou asked: "${query}"\n\nTry asking:\n${mod.suggested.en.map(s => `• ${s}`).join('\n')}`,
  };
  return { text: fallback[lang] || fallback.hi, sources: [] };
};
