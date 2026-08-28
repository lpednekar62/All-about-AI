/* ==========================================================================
   Wellness Blind Spot Score — Welocity Life Science
   Vanilla JS, no framework, no build step, no third-party scripts.

   Bilingual: English + Hindi. Every visitor-facing string carries {en, hi}.
   English is the canonical form — stored answers, category keys and the
   Google Sheet are ALWAYS English regardless of what the visitor read, so
   the data stays analysable and the Apps Script needs no language logic.
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------ CONFIG */
const CONFIG = {
  EVENT_LABEL: 'Welocity Life Science  ·  DNAWellCode',

  /* WhatsApp: country code + number, DIGITS ONLY. India = 91. */
  CONTACTS: [
    { key: 'mumtaz', label: { en:'Talk to Mumtaz', hi:'मुमताज़ से बात करें' }, number: '919082374527' },
    { key: 'laxman', label: { en:'Talk to Laxman', hi:'लक्ष्मण से बात करें' }, number: '919326082818' }
  ],

  SHEET_ENDPOINT: 'https://script.google.com/macros/s/AKfycbxU1JZDIZv40w9aWFyWj2h51-VExSdsTfoEfs9FTItJetW94HuYwtdk-36wORfkmwMunA/exec',

  VENUE: 'Welocity',
  DEFAULT_LANG: 'en',
  RESUME_WINDOW_MS: 20 * 60 * 1000,
  STORAGE_KEY: 'bss.welocity.v2'
};

/* --------------------------------------------------------------- ANALYTICS */
function track(name, props) {
  try { if (typeof window.__track === 'function') window.__track(name, props || {}); }
  catch (_) {}
}

/* ---------------------------------------------------------------------- UI
   Interface strings. Keys match data-i18n / data-i18n-html in index.html.
   These are developer-authored constants, never visitor input — which is
   why the few carrying markup may safely use innerHTML.
   ------------------------------------------------------------------------ */
const UI = {
  skipLink:   { en:'Skip to content', hi:'मुख्य सामग्री पर जाएँ' },

  introH:     { en:'How much of your health<br>are you still <em>guessing</em>?',
                hi:'अपनी सेहत का कितना हिस्सा<br>आप अब भी <em>अंदाज़े</em> से चला रहे हैं?' },
  introLede:  { en:'You may eat carefully, stay active and spend real money on your health — and still have important things about your body that you have never measured or personalised.',
                hi:'हो सकता है आप सोच-समझकर खाते हों, चुस्त रहते हों और सेहत पर अच्छा-ख़ासा ख़र्च भी करते हों — फिर भी अपने शरीर की कई ज़रूरी बातें ऐसी हों जो आपने कभी नापी ही नहीं।' },
  introLede2: { en:'Answer a few simple questions to find your <strong>Wellness Blind Spot Score</strong>.',
                hi:'कुछ आसान सवालों के जवाब दीजिए और अपना <strong>वेलनेस ब्लाइंड स्पॉट स्कोर</strong> जानिए।' },
  fact1k:     { en:'15 questions', hi:'15 सवाल' },
  fact1v:     { en:'about two minutes', hi:'लगभग दो मिनट' },
  fact2k:     { en:'No medical records', hi:'कोई मेडिकल रिपोर्ट नहीं' },
  fact2v:     { en:'nothing to look up', hi:'कुछ ढूँढने की ज़रूरत नहीं' },
  fact3k:     { en:'Free', hi:'नि:शुल्क' },
  fact3v:     { en:'no charge, no obligation', hi:'कोई शुल्क नहीं, कोई बाध्यता नहीं' },
  startBtn:   { en:'Start my free assessment', hi:'मेरा नि:शुल्क आकलन शुरू करें' },
  introMicro: { en:'Free. Takes about two minutes.', hi:'नि:शुल्क। लगभग दो मिनट लगेंगे।' },
  introNote:  { en:'This is an educational awareness assessment, not a medical test. A higher score means there may be more areas where you currently lack personalised information — it does <strong>not</strong> mean you are unhealthy.',
                hi:'यह जागरूकता के लिए बनाया गया शैक्षिक आकलन है, कोई मेडिकल टेस्ट नहीं। ज़्यादा स्कोर का मतलब सिर्फ़ इतना है कि ऐसे क्षेत्र ज़्यादा हैं जहाँ आपके पास अपने बारे में जानकारी कम है — इसका मतलब <strong>यह नहीं</strong> कि आप अस्वस्थ हैं।' },

  detailsEyebrow:  { en:'Before we start', hi:'शुरू करने से पहले' },
  detailsH:        { en:'Your details', hi:'आपकी जानकारी' },
  detailsLede:     { en:'We need these so our team can share your result with you and answer your questions afterwards. They are not shown to anyone else.',
                     hi:'ये इसलिए चाहिए ताकि हमारी टीम आपका नतीजा आप तक पहुँचा सके और बाद में आपके सवालों के जवाब दे सके। यह किसी और को नहीं दिखाई जाती।' },
  labelName:       { en:'Full name', hi:'पूरा नाम' },
  labelPhone:      { en:'Mobile number', hi:'मोबाइल नंबर' },
  labelEmail:      { en:'Email address', hi:'ईमेल पता' },
  labelAge:        { en:'Age range', hi:'आयु वर्ग' },
  labelGoal:       { en:'What matters most to you right now?', hi:'अभी आपके लिए सबसे ज़रूरी क्या है?' },
  optional:        { en:'optional', hi:'वैकल्पिक' },
  detailsContinue: { en:'Continue to the questions', hi:'सवालों पर आगे बढ़ें' },
  detailsNote:     { en:'We never ask for medical history, conditions or medication. Your details are used only by Welocity to share your result and follow up — never sold or passed to anyone else.',
                     hi:'हम आपकी बीमारी, इलाज या दवा के बारे में कभी नहीं पूछते। आपकी जानकारी सिर्फ़ वेलोसिटी आपका नतीजा भेजने और आगे बात करने के लिए इस्तेमाल करती है — न बेची जाती है, न किसी और को दी जाती है।' },

  errName:    { en:'Please enter your name.', hi:'कृपया अपना नाम भरें।' },
  errPhone:   { en:'Please enter a 10-digit mobile number.', hi:'कृपया 10 अंकों का मोबाइल नंबर भरें।' },
  errEmail:   { en:'Please enter a valid email address.', hi:'कृपया सही ईमेल पता भरें।' },

  qErr:       { en:'Please choose an option to continue.', hi:'आगे बढ़ने के लिए कोई विकल्प चुनें।' },
  backBtn:    { en:'Back', hi:'पीछे' },
  nextBtn:    { en:'Next', hi:'आगे' },
  seeScore:   { en:'See my score', hi:'मेरा स्कोर देखें' },
  qOf:        { en:'Question # of #', hi:'सवाल # / #' },

  resultEyebrow:  { en:'Your result', hi:'आपका नतीजा' },
  resultHeading:  { en:'Your Wellness Blind Spot Score is:', hi:'आपका वेलनेस ब्लाइंड स्पॉट स्कोर है:' },
  resultHeadingN: { en:'#, your Wellness Blind Spot Score is:', hi:'#, आपका वेलनेस ब्लाइंड स्पॉट स्कोर है:' },
  resultNote:     { en:'This score reflects how much <strong>personalised clarity</strong> you currently have — not whether you are healthy or unhealthy.',
                    hi:'यह स्कोर बताता है कि आपके पास अपने बारे में <strong>कितनी व्यक्तिगत स्पष्टता</strong> है — यह नहीं कि आप स्वस्थ हैं या नहीं।' },
  resultCatsH:    { en:'Where your uncertainty is concentrated', hi:'आपकी अनिश्चितता कहाँ सबसे ज़्यादा है' },
  resultCatsSub:  { en:'Your three largest blind-spot areas, based on your own answers.',
                    hi:'आपके अपने जवाबों के आधार पर, तीन सबसे बड़े ब्लाइंड स्पॉट।' },
  unexamined:     { en:'# unexamined', hi:'# अनदेखा' },
  discloseSummary:{ en:'See all six areas and how this was calculated', hi:'सभी छह क्षेत्र और गणना का तरीक़ा देखें' },
  discloseNote:   { en:'Every answer carries a published blind-spot value from 0 (fully personalised) to 4 (entirely unexamined). Your score is your total divided by the maximum possible for the questions that applied to you. Questions you marked as not applicable are excluded from both sides of that calculation.',
                    hi:'हर जवाब का एक तय ब्लाइंड-स्पॉट मान होता है — 0 (पूरी तरह व्यक्तिगत) से 4 (बिलकुल अनदेखा) तक। आपका स्कोर = आपके कुल अंक ÷ उन सवालों के अधिकतम संभव अंक जो आप पर लागू हुए। जिन सवालों को आपने "लागू नहीं" चुना, वे गणना के दोनों तरफ़ से हटा दिए जाते हैं।' },

  turnH:  { en:"The real question isn't whether you're trying.<br>It's whether your routine actually knows you.",
            hi:'असली सवाल यह नहीं कि आप कोशिश कर रहे हैं या नहीं।<br>सवाल यह है कि आपकी दिनचर्या आपको जानती भी है या नहीं।' },
  turnP:  { en:'Two people can eat the same food, follow the same advice and get completely different results. Genetics, lifestyle, environment, sleep, stress, age and medical history all play a part. Genetics is one factor among several — it influences how you respond, it does not decide your outcome.',
            hi:'दो लोग एक ही खाना खाकर, एक ही सलाह मानकर भी बिलकुल अलग नतीजे पा सकते हैं। जेनेटिक्स, जीवनशैली, माहौल, नींद, तनाव, उम्र और सेहत का इतिहास — सबका हिस्सा होता है। जेनेटिक्स कई कारकों में से एक है — यह असर डालता है, नतीजा तय नहीं करता।' },

  ctaH:      { en:'Want to know where to begin?', hi:'जानना चाहते हैं कि शुरुआत कहाँ से करें?' },
  ctaP:      { en:"Have a free introductory conversation with our team about what your answers suggest. Sometimes the honest answer is that you don't need anything further.",
               hi:'हमारी टीम से एक नि:शुल्क शुरुआती बातचीत कीजिए कि आपके जवाब क्या इशारा करते हैं। कई बार ईमानदार जवाब यही होता है कि आपको और कुछ करने की ज़रूरत नहीं।' },
  ctaMicro:  { en:'Opens WhatsApp with your score filled in. Free · No obligation.',
               hi:'व्हाट्सएप खुलेगा, आपका स्कोर पहले से भरा होगा। नि:शुल्क · कोई बाध्यता नहीं।' },
  minorNote: { en:"You told us you're under 18. Please ask a parent or guardian to start this conversation with you — we don't discuss personalised wellness with minors directly.",
               hi:'आपने बताया कि आपकी उम्र 18 से कम है। कृपया माता-पिता या अभिभावक से यह बातचीत शुरू करवाइए — हम नाबालिगों से सीधे व्यक्तिगत सेहत पर चर्चा नहीं करते।' },
  retakeBtn: { en:'Retake assessment', hi:'दोबारा आकलन करें' },

  footLegal1: { en:'<strong>This assessment is for educational and wellness-awareness purposes only.</strong> It does not provide medical advice, diagnosis or treatment, and it does not predict health outcomes. It is not a substitute for a doctor, dietitian or other qualified professional. Speak with a qualified healthcare professional about any medical concern.',
                hi:'<strong>यह आकलन केवल शैक्षिक और जागरूकता के उद्देश्य से है।</strong> यह न चिकित्सकीय सलाह देता है, न निदान, न इलाज, और न ही सेहत के नतीजों की भविष्यवाणी करता है। यह डॉक्टर, डाइटीशियन या किसी योग्य विशेषज्ञ का विकल्प नहीं है। किसी भी चिकित्सकीय चिंता के लिए योग्य स्वास्थ्य विशेषज्ञ से बात करें।' },
  footLegal2: { en:'<strong>Your privacy.</strong> The name, mobile number and email you enter, together with your answers, are recorded securely by Welocity Life Science so our team can share your result and follow up. We never sell your information or pass it to anyone outside Welocity. To have your entry removed, message us on WhatsApp or write to',
                hi:'<strong>आपकी निजता।</strong> आपका नाम, मोबाइल नंबर और ईमेल, आपके जवाबों के साथ, वेलोसिटी लाइफ़ साइंस द्वारा सुरक्षित रूप से दर्ज किए जाते हैं ताकि हमारी टीम आपका नतीजा भेज सके और आगे बात कर सके। हम आपकी जानकारी न बेचते हैं, न वेलोसिटी के बाहर किसी को देते हैं। अपनी प्रविष्टि हटवाने के लिए व्हाट्सएप पर संदेश भेजें या यहाँ लिखें' },
  clearBtn:   { en:'Clear my answers on this device', hi:'इस डिवाइस से मेरे जवाब मिटाएँ' },
  cleared:    { en:'Cleared', hi:'मिटा दिए गए' }
};

/* --------------------------------------------------------------- CATEGORIES
   Keys are canonical and must not change — the deployed Apps Script and the
   sheet's header row are positioned on them.
   ------------------------------------------------------------------------ */
const CATS = {
  nutrition: { name:{ en:'Food & digestion', hi:'खाना और पाचन' },
               note:{ en:'How well you understand what your body specifically does with what you eat.',
                      hi:'आप जो खाते हैं, आपका शरीर उसके साथ क्या करता है — यह आप कितना समझते हैं।' } },
  fitness:   { name:{ en:'Movement & daily activity', hi:'हलचल और रोज़ की गतिविधि' },
               note:{ en:'Whether you know what your body actually needs to move and feel well.',
                      hi:'आपके शरीर को असल में कितनी हलचल और आराम चाहिए, यह आपको पता है या नहीं।' } },
  sleep:     { name:{ en:'Sleep & energy', hi:'नींद और एनर्जी' },
               note:{ en:'How well you understand your own energy dips, sleep and tea/coffee response.',
                      hi:'अपनी एनर्जी की गिरावट, नींद और चाय-कॉफ़ी के असर को आप कितना समझते हैं।' } },
  stress:    { name:{ en:'Stress & mood', hi:'तनाव और मन' },
               note:{ en:'Whether you know how pressure actually shows up in your body.',
                      hi:'तनाव आपके शरीर में असल में कैसे दिखता है, यह आपको पता है या नहीं।' } },
  prevent:   { name:{ en:'Preventive & family awareness', hi:'बचाव और पारिवारिक जानकारी' },
               note:{ en:'Whether family health patterns and check-ups have become knowledge you act on.',
                      hi:'परिवार की सेहत और चेक-अप की जानकारी पर आप अमल करते हैं या नहीं।' } },
  genetics:  { name:{ en:'Personalisation & genetics', hi:'व्यक्तिगत जानकारी और जेनेटिक्स' },
               note:{ en:'How much of your routine rests on measured information about you.',
                      hi:'आपकी दिनचर्या कितनी आपके अपने मापे गए डेटा पर टिकी है।' } }
};

/* ---------------------------------------------------------------- QUESTIONS
   p = blind-spot points, 0 (fully personalised) .. 4 (entirely unexamined).
   na:true removes the question from BOTH sides of the score.
   ------------------------------------------------------------------------ */
const QUESTIONS = [
  { id:'q1', cat:'nutrition',
    text:{ en:'How did you decide what you eat on a normal day?',
           hi:'आप रोज़ जो खाते हैं, वह तय कैसे हुआ?' }, opts:[
    { t:{ en:'It was planned for me using professional input and my own test results',
          hi:'किसी विशेषज्ञ ने मेरी जाँच रिपोर्ट देखकर बनाया है' }, p:0 },
    { t:{ en:'I worked it out over time from what I noticed suits me',
          hi:'समय के साथ मैंने खुद समझा कि मुझे क्या सूट करता है' }, p:1 },
    { t:{ en:'From general advice about what is supposed to be healthy',
          hi:'जो आम तौर पर हेल्दी कहा जाता है, उसी हिसाब से' }, p:2 },
    { t:{ en:'I eat whatever is cooked or whatever is available',
          hi:'घर में जो बनता है या जो मिल जाए, वही खा लेता/लेती हूँ' }, p:3 },
    { t:{ en:'I follow a diet I picked up online or from someone else',
          hi:'ऑनलाइन या किसी और से लिया हुआ डाइट प्लान फ़ॉलो करता/करती हूँ' }, p:4 }
  ]},
  { id:'q2', cat:'nutrition',
    text:{ en:'After a heavy meal you feel heavy, sleepy or bloated — do you know which foods do that to you?',
           hi:'भारी खाने के बाद सुस्ती, भारीपन या पेट फूलना — क्या आप जानते हैं कौन-सी चीज़ें आपके साथ ऐसा करती हैं?' }, opts:[
    { t:{ en:'Yes — I know exactly which foods affect me and why',
          hi:'हाँ — मुझे ठीक-ठीक पता है कौन-सा खाना मुझ पर क्या असर करता है' }, p:0 },
    { t:{ en:'Mostly', hi:'ज़्यादातर पता है' }, p:1 },
    { t:{ en:'I have noticed a pattern but cannot explain it',
          hi:'पैटर्न दिखता है, पर वजह समझ नहीं आती' }, p:2 },
    { t:{ en:'I just accept it as normal', hi:'इसे सामान्य मानकर छोड़ देता/देती हूँ' }, p:3 },
    { t:{ en:'I have never thought about it', hi:'कभी इस बारे में सोचा ही नहीं' }, p:4 }
  ]},
  { id:'q3', cat:'nutrition',
    text:{ en:'How were the supplements, vitamins or health powders you take chosen?',
           hi:'आप जो सप्लीमेंट, विटामिन या हेल्थ पाउडर लेते हैं, वे कैसे चुने गए?' }, opts:[
    { t:{ en:'From test results plus professional guidance', hi:'जाँच रिपोर्ट और विशेषज्ञ की सलाह से' }, p:0 },
    { t:{ en:'On a doctor’s or dietitian’s advice', hi:'डॉक्टर या डाइटीशियन की सलाह पर' }, p:1 },
    { t:{ en:'From general recommendations', hi:'आम सिफ़ारिशों के आधार पर' }, p:2 },
    { t:{ en:'Suggested by family, friends or social media', hi:'घरवालों, दोस्तों या सोशल मीडिया के कहने पर' }, p:3 },
    { t:{ en:'I am not sure whether I actually need them', hi:'पक्का नहीं कि मुझे इनकी ज़रूरत भी है या नहीं' }, p:4 },
    { t:{ en:'I do not take any', hi:'मैं कुछ नहीं लेता/लेती' }, na:true }
  ]},
  { id:'q4', cat:'fitness',
    text:{ en:'Do you know how much movement your body actually needs in a day — and whether you are getting it?',
           hi:'क्या आप जानते हैं कि दिन भर में आपके शरीर को कितनी हलचल चाहिए — और क्या वह हो रही है?' }, opts:[
    { t:{ en:'Yes — I know what my body needs and I get it', hi:'हाँ — मुझे पता है कितनी चाहिए और वह हो जाती है' }, p:0 },
    { t:{ en:'Roughly, and mostly yes', hi:'मोटे तौर पर, और ज़्यादातर हो जाती है' }, p:1 },
    { t:{ en:'I know I should move more, but not how much', hi:'पता है ज़्यादा चलना चाहिए, पर कितना — यह नहीं' }, p:2 },
    { t:{ en:'I only think about it when something starts hurting', hi:'जब कहीं दर्द होने लगे, तभी ध्यान जाता है' }, p:3 },
    { t:{ en:'I have never really thought about it', hi:'कभी इस बारे में सोचा ही नहीं' }, p:4 }
  ]},
  { id:'q5', cat:'fitness',
    text:{ en:'When your body feels stiff, heavy or tired for a few days, do you usually know why — and what to change?',
           hi:'जब कुछ दिनों तक शरीर अकड़ा, भारी या थका हुआ लगे — क्या आपको वजह और उपाय पता होता है?' }, opts:[
    { t:{ en:'Usually, and I know exactly what to change', hi:'आमतौर पर हाँ, और पता होता है क्या बदलना है' }, p:0 },
    { t:{ en:'Often', hi:'अक्सर पता होता है' }, p:1 },
    { t:{ en:'Sometimes', hi:'कभी-कभी' }, p:2 },
    { t:{ en:'Rarely', hi:'कम ही' }, p:3 },
    { t:{ en:'I just wait for it to pass', hi:'बस इंतज़ार करता/करती हूँ कि ठीक हो जाए' }, p:4 }
  ]},
  { id:'q6', cat:'sleep',
    text:{ en:'That drop in energy in the afternoon — do you know what causes yours?',
           hi:'दोपहर में जो एनर्जी गिरती है — क्या आपको पता है आपके साथ ऐसा क्यों होता है?' }, opts:[
    { t:{ en:'Yes — I know my pattern and what triggers it', hi:'हाँ — मुझे अपना पैटर्न और उसकी वजह पता है' }, p:0 },
    { t:{ en:'Mostly', hi:'ज़्यादातर पता है' }, p:1 },
    { t:{ en:'I notice it every day but cannot explain it', hi:'रोज़ होता है, पर वजह समझ नहीं आती' }, p:2 },
    { t:{ en:'I just push through it with tea, coffee or something sweet',
          hi:'चाय, कॉफ़ी या कुछ मीठा लेकर काम चला लेता/लेती हूँ' }, p:3 },
    { t:{ en:'I have never thought about why it happens', hi:'कभी सोचा ही नहीं कि ऐसा क्यों होता है' }, p:4 }
  ]},
  { id:'q7', cat:'sleep',
    text:{ en:'How well do you know what your tea or coffee actually does to your sleep and energy?',
           hi:'आपकी चाय या कॉफ़ी आपकी नींद और एनर्जी पर असल में क्या असर करती है — कितना पता है?' }, opts:[
    { t:{ en:'Very well — I have deliberately tested it', hi:'अच्छी तरह — मैंने जान-बूझकर परखा है' }, p:0 },
    { t:{ en:'Fairly well', hi:'ठीक-ठाक पता है' }, p:1 },
    { t:{ en:'I notice something but I am not sure', hi:'कुछ असर लगता है, पर पक्का नहीं' }, p:2 },
    { t:{ en:'I drink it without tracking the effect', hi:'पीता/पीती हूँ, असर पर ध्यान नहीं देता/देती' }, p:3 },
    { t:{ en:'I have never considered it', hi:'कभी सोचा ही नहीं' }, p:4 },
    { t:{ en:'I do not drink tea or coffee', hi:'मैं चाय या कॉफ़ी नहीं पीता/पीती' }, na:true }
  ]},
  { id:'q8', cat:'sleep',
    text:{ en:'On mornings when you wake up still tired, do you know what caused it?',
           hi:'जिन सुबहों में आप उठकर भी थके हुए महसूस करते हैं — क्या वजह पता होती है?' }, opts:[
    { t:{ en:'Yes — I understand my own sleep well', hi:'हाँ — मैं अपनी नींद अच्छी तरह समझता/समझती हूँ' }, p:0 },
    { t:{ en:'I understand parts of it', hi:'कुछ हद तक समझता/समझती हूँ' }, p:1 },
    { t:{ en:'I know something is off, but not what', hi:'कुछ गड़बड़ है यह पता है, पर क्या — यह नहीं' }, p:2 },
    { t:{ en:'I mostly guess', hi:'ज़्यादातर अंदाज़ा ही लगाता/लगाती हूँ' }, p:3 },
    { t:{ en:'I have never looked into it', hi:'कभी इस पर ध्यान नहीं दिया' }, p:4 }
  ]},
  { id:'q9', cat:'stress',
    text:{ en:'When pressure builds up, do you know how it shows up in your body — appetite, sleep, digestion, temper?',
           hi:'जब तनाव बढ़ता है, क्या आपको पता है वह आपके शरीर में कैसे दिखता है — भूख, नींद, पाचन, गुस्सा?' }, opts:[
    { t:{ en:'Yes — I know my own pattern', hi:'हाँ — मुझे अपना पैटर्न पता है' }, p:0 },
    { t:{ en:'Mostly', hi:'ज़्यादातर' }, p:1 },
    { t:{ en:'I notice changes but cannot explain them', hi:'बदलाव दिखते हैं, पर वजह समझ नहीं आती' }, p:2 },
    { t:{ en:'I usually only realise afterwards', hi:'आमतौर पर बाद में समझ आता है' }, p:3 },
    { t:{ en:'I have never connected the two', hi:'दोनों को कभी जोड़कर देखा ही नहीं' }, p:4 }
  ]},
  { id:'q10', cat:'stress',
    text:{ en:'Do you know what genuinely helps you switch off and feel normal again?',
           hi:'क्या आपको पता है कि असल में किस चीज़ से आप शांत होकर फिर सामान्य महसूस करते हैं?' }, opts:[
    { t:{ en:'Yes — I have worked out what actually works for me', hi:'हाँ — मैंने समझ लिया है मुझ पर क्या काम करता है' }, p:0 },
    { t:{ en:'Fairly well', hi:'ठीक-ठाक पता है' }, p:1 },
    { t:{ en:'I have a rough idea', hi:'मोटा-मोटा अंदाज़ा है' }, p:2 },
    { t:{ en:'I try whatever is popular and hope it works', hi:'जो चलन में हो वही आज़मा लेता/लेती हूँ' }, p:3 },
    { t:{ en:'I have not looked into it', hi:'इस पर कभी ध्यान नहीं दिया' }, p:4 }
  ]},
  { id:'q11', cat:'prevent',
    text:{ en:'How well do you know which health conditions run in your family?',
           hi:'आपके परिवार में कौन-सी बीमारियाँ चली आ रही हैं — कितना पता है?' }, opts:[
    { t:{ en:'Very well, and I have had professional guidance on it', hi:'अच्छी तरह, और इस पर विशेषज्ञ की सलाह भी ली है' }, p:0 },
    { t:{ en:'I know the history but have had no guidance on it', hi:'इतिहास पता है, पर कोई सलाह नहीं ली' }, p:1 },
    { t:{ en:'I know a few details', hi:'कुछ बातें पता हैं' }, p:2 },
    { t:{ en:'We rarely discuss it at home', hi:'घर में इस पर बात कम ही होती है' }, p:3 },
    { t:{ en:'I am not really aware of it', hi:'मुझे ख़ास पता नहीं' }, p:4 }
  ]},
  { id:'q12', cat:'prevent',
    text:{ en:'The last time you had a health check-up, did you understand what the numbers actually meant for you?',
           hi:'पिछली बार जब हेल्थ चेक-अप कराया, क्या आपको समझ आया कि वे नंबर आपके लिए क्या मायने रखते हैं?' }, opts:[
    { t:{ en:'Yes — someone explained what each result meant for me', hi:'हाँ — किसी ने हर रिपोर्ट का मतलब समझाया था' }, p:0 },
    { t:{ en:'I understood the main points', hi:'मुख्य बातें समझ आ गई थीं' }, p:1 },
    { t:{ en:'I was told it was normal, and left it there', hi:'बता दिया गया “सब सामान्य है”, बात वहीं ख़त्म' }, p:2 },
    { t:{ en:'I saw the report but did not really follow it', hi:'रिपोर्ट देखी, पर ठीक से समझ नहीं आई' }, p:3 },
    { t:{ en:'I have not had a check-up in a long time', hi:'बहुत समय से चेक-अप कराया ही नहीं' }, p:4 }
  ]},
  { id:'q13', cat:'prevent',
    text:{ en:'Have you turned what you know about your family’s health into anything you actually do differently?',
           hi:'परिवार की सेहत के बारे में जो पता है, क्या उससे आपने अपनी ज़िंदगी में कुछ सच में बदला है?' }, opts:[
    { t:{ en:'Yes — a clear plan made with professional input', hi:'हाँ — विशेषज्ञ के साथ मिलकर एक साफ़ योजना बनाई है' }, p:0 },
    { t:{ en:'Yes — a few deliberate changes', hi:'हाँ — कुछ बदलाव जान-बूझकर किए हैं' }, p:1 },
    { t:{ en:'I have thought about it but not acted', hi:'सोचा है, पर किया कुछ नहीं' }, p:2 },
    { t:{ en:'Not yet', hi:'अभी तक नहीं' }, p:3 },
    { t:{ en:'I have never considered it', hi:'कभी सोचा ही नहीं' }, p:4 }
  ]},
  { id:'q14', cat:'genetics',
    text:{ en:'Have you ever had health guidance based on your own body’s data rather than general advice?',
           hi:'क्या आपको कभी आम सलाह की जगह अपने शरीर के अपने डेटा के आधार पर सेहत की सलाह मिली है?' }, opts:[
    { t:{ en:'Yes, and it was properly explained to me', hi:'हाँ, और मुझे ठीक से समझाया भी गया' }, p:0 },
    { t:{ en:'Yes, but I did not fully understand the report', hi:'हाँ, पर रिपोर्ट पूरी समझ नहीं आई' }, p:1 },
    { t:{ en:'I have read about it but never done it', hi:'इसके बारे में पढ़ा है, पर कराया कभी नहीं' }, p:2 },
    { t:{ en:'No', hi:'नहीं' }, p:3 },
    { t:{ en:'I do not know how that works', hi:'मुझे पता ही नहीं यह कैसे होता है' }, p:4 }
  ]},
  { id:'q15', cat:'genetics',
    text:{ en:'How much of what you do for your health is based on something actually measured about you?',
           hi:'सेहत के लिए आप जो करते हैं, उसमें से कितना आपके अपने मापे गए डेटा पर आधारित है?' }, opts:[
    { t:{ en:'Most of it', hi:'ज़्यादातर' }, p:0 },
    { t:{ en:'Some of it', hi:'कुछ हिस्सा' }, p:1 },
    { t:{ en:'Very little', hi:'बहुत कम' }, p:2 },
    { t:{ en:'Almost none — it is mostly trial and error', hi:'लगभग कुछ नहीं — ज़्यादातर आज़माइश ही है' }, p:3 },
    { t:{ en:'I have never evaluated this', hi:'कभी इस तरह सोचा ही नहीं' }, p:4 }
  ]}
];

/* -------------------------------------------------------------- SCORE BANDS */
const BANDS = [
  { max:24,  name:{ en:'Strong personal awareness', hi:'अपने बारे में अच्छी समझ' },
    blurb:{ en:'You already understand several areas of your wellness well. Your opportunity is the handful of areas where more personalised information could still help.',
            hi:'आप अपनी सेहत के कई पहलू पहले से अच्छी तरह समझते हैं। बस कुछ ही क्षेत्र बचे हैं जहाँ और व्यक्तिगत जानकारी काम आ सकती है।' } },
  { max:49,  name:{ en:'A few important gaps', hi:'कुछ ज़रूरी कमियाँ' },
    blurb:{ en:'You have built genuinely useful awareness, though parts of your food, rest, sleep or lifestyle still rest on trial and error.',
            hi:'आपने वाक़ई काम की समझ बनाई है, फिर भी खाने, आराम, नींद या दिनचर्या के कुछ हिस्से अब भी आज़माइश पर टिके हैं।' } },
  { max:69,  name:{ en:'Several unanswered questions', hi:'कई सवाल अब भी अनसुलझे' },
    blurb:{ en:'You are clearly putting effort in, but a number of your decisions are still based on general advice rather than information about you.',
            hi:'आप मेहनत साफ़ कर रहे हैं, पर आपके कई फ़ैसले अब भी आम सलाह पर टिके हैं, आपके अपने बारे में जानकारी पर नहीं।' } },
  { max:84,  name:{ en:'High personalisation blind spot', hi:'व्यक्तिगत जानकारी की बड़ी कमी' },
    blurb:{ en:'You may be working hard on your health without much personalised clarity about how your body responds. That does not mean anything is wrong — it means there are useful questions worth exploring.',
            hi:'हो सकता है आप सेहत पर मेहनत कर रहे हों, पर यह साफ़ न हो कि आपका शरीर किस तरह प्रतिक्रिया करता है। इसका मतलब यह नहीं कि कुछ ग़लत है — बस कुछ काम के सवाल हैं जिन्हें समझना फ़ायदेमंद होगा।' } },
  { max:100, name:{ en:'Mostly guesswork', hi:'ज़्यादातर अंदाज़े पर' },
    blurb:{ en:'Much of your current approach depends on generic advice, assumptions or repeated trial and error. A guided conversation would help you work out where to start.',
            hi:'आपका मौजूदा तरीक़ा काफ़ी हद तक आम सलाह, अंदाज़ों और बार-बार की आज़माइश पर टिका है। एक मार्गदर्शित बातचीत से पता चलेगा कि शुरुआत कहाँ से करें।' } }
];

/* English value is the canonical stored form; Hindi is display only. */
const AGES = [
  { en:'Below 18', hi:'18 से कम' }, { en:'18–29', hi:'18–29' }, { en:'30–39', hi:'30–39' },
  { en:'40–49', hi:'40–49' }, { en:'50–59', hi:'50–59' }, { en:'60+', hi:'60+' }
];
const GOALS = [
  { en:'Weight management', hi:'वज़न संभालना' },
  { en:'Fitness performance', hi:'फ़िटनेस और परफ़ॉर्मेंस' },
  { en:'More energy', hi:'ज़्यादा एनर्जी' },
  { en:'Better sleep', hi:'बेहतर नींद' },
  { en:'Stress management', hi:'तनाव संभालना' },
  { en:'Healthy ageing', hi:'सेहतमंद उम्र बढ़ना' },
  { en:'Family wellness', hi:'परिवार की सेहत' },
  { en:'General preventive wellness', hi:'सामान्य बचाव और सेहत' }
];

/* ------------------------------------------------------------------- STATE */
const state = { id:'', lang:CONFIG.DEFAULT_LANG, name:'', phone:'', email:'',
                age:'', goal:'', answers:{}, idx:0, result:null, sent:false };

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

/* Pick the active language out of a {en, hi} pair. */
function t(pair) {
  if (pair == null) return '';
  if (typeof pair === 'string') return pair;
  return pair[state.lang] || pair.en || '';
}
/* Fill "#" placeholders in order. */
function fill(str) {
  const args = Array.prototype.slice.call(arguments, 1);
  let i = 0;
  return String(str).replace(/#/g, () => (i < args.length ? String(args[i++]) : '#'));
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function newId() {
  try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
  return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/* -------------------------------------------------------------- LANGUAGE */
function applyLang() {
  document.documentElement.lang = state.lang;
  document.body.classList.toggle('lang-hi', state.lang === 'hi');

  $$('[data-i18n]').forEach(n => {
    const s = UI[n.dataset.i18n];
    if (s) n.textContent = t(s);
  });
  // Only developer-authored constants from UI reach innerHTML — never visitor input.
  $$('[data-i18n-html]').forEach(n => {
    const s = UI[n.dataset.i18nHtml];
    if (s) n.innerHTML = t(s);
  });

  $$('#langsw .langsw__btn').forEach(b => {
    const on = b.dataset.lang === state.lang;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  renderChips($('#f-age'),  AGES,  'age');
  renderChips($('#f-goal'), GOALS, 'goal');

  if (!$('#s-quiz').hidden)   renderQuestion();
  if (!$('#s-result').hidden && state.result) renderResult();
}

function setLang(lang) {
  if (lang !== 'en' && lang !== 'hi') return;
  state.lang = lang;
  save();
  applyLang();
  track('language_changed', { lang });
}

/* ------------------------------------------------------------------ STORAGE */
function save() {
  try {
    sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
      id:state.id, lang:state.lang, name:state.name, phone:state.phone, email:state.email,
      age:state.age, goal:state.goal, answers:state.answers, idx:state.idx,
      sent:state.sent, ts:Date.now()
    }));
  } catch (_) {}
}

/* Resume only the SAME person's unfinished, recent run — a shared booth
   device must never hand one visitor's answers to the next. */
function restore() {
  try {
    const raw = sessionStorage.getItem(CONFIG.STORAGE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return false;
    if (d.lang === 'hi' || d.lang === 'en') state.lang = d.lang;
    if (d.sent === true) { wipe(); return false; }
    const ts = parseInt(d.ts, 10);
    if (!ts || Date.now() - ts > CONFIG.RESUME_WINDOW_MS) { wipe(); return false; }
    state.id      = typeof d.id === 'string' ? d.id.slice(0, 60) : newId();
    state.name    = typeof d.name === 'string' ? d.name.slice(0, 60) : '';
    state.phone   = typeof d.phone === 'string' ? d.phone.slice(0, 18) : '';
    state.email   = typeof d.email === 'string' ? d.email.slice(0, 80) : '';
    state.age     = AGES.some(a => a.en === d.age)  ? d.age  : '';
    state.goal    = GOALS.some(g => g.en === d.goal) ? d.goal : '';
    state.answers = (d.answers && typeof d.answers === 'object') ? d.answers : {};
    state.idx     = Math.min(Math.max(parseInt(d.idx, 10) || 0, 0), QUESTIONS.length - 1);
    state.sent    = false;
    return Object.keys(state.answers).length > 0;
  } catch (_) { return false; }
}
function wipe() {
  try { sessionStorage.removeItem(CONFIG.STORAGE_KEY); } catch (_) {}
  state.id = newId();
  state.name = state.phone = state.email = state.age = state.goal = '';
  state.answers = {}; state.idx = 0; state.result = null; state.sent = false;
}

/* ------------------------------------------------------------------ SCREENS */
function show(id) {
  $$('.screen').forEach(s => {
    const on = s.id === id;
    s.classList.toggle('is-active', on);
    s.hidden = !on;
  });
  window.scrollTo({ top:0, behavior:'auto' });
}

/* ------------------------------------------------------------------ SCORING */
function calculate() {
  let got = 0, max = 0;
  const per = {};
  Object.keys(CATS).forEach(k => { per[k] = { got:0, max:0 }; });

  QUESTIONS.forEach(q => {
    const pick = state.answers[q.id];
    if (pick == null) return;
    const opt = q.opts[pick];
    if (!opt || opt.na) return;
    got += opt.p; max += 4;
    per[q.cat].got += opt.p; per[q.cat].max += 4;
  });

  const pct  = max > 0 ? Math.round((got / max) * 100) : 0;
  const band = BANDS.find(b => pct <= b.max) || BANDS[BANDS.length - 1];

  const cats = Object.keys(CATS)
    .map(k => ({ key:k, name:CATS[k].name, note:CATS[k].note,
                 pct: per[k].max > 0 ? Math.round((per[k].got / per[k].max) * 100) : null }))
    .filter(c => c.pct !== null)
    .sort((a, b) => b.pct - a.pct);

  return { pct, band, cats, top: cats.slice(0, 3), answered: Object.keys(state.answers).length };
}

/* ------------------------------------------------------- GOOGLE SHEET SAVE */
function postToSheet(payload) {
  const url = String(CONFIG.SHEET_ENDPOINT || '').trim();
  if (!url) return false;
  let body;
  try { body = JSON.stringify(payload); } catch (_) { return false; }

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type:'text/plain;charset=UTF-8' });
      if (navigator.sendBeacon(url, blob)) return true;
    }
  } catch (_) {}

  try {
    fetch(url, { method:'POST', mode:'no-cors', keepalive:true,
                 headers:{ 'Content-Type':'text/plain;charset=UTF-8' }, body:body }).catch(() => {});
    return true;
  } catch (_) { return false; }
}

/* Answers are always stored in English so the sheet stays analysable. */
function answerSummary() {
  const out = {};
  QUESTIONS.forEach(q => {
    const pick = state.answers[q.id];
    const opt  = (pick != null) ? q.opts[pick] : null;
    out[q.id] = opt ? opt.t.en : '';
  });
  return out;
}

function sendResult(r) {
  if (state.sent) return;
  const catPct = {};
  r.cats.forEach(c => { catPct[c.key] = c.pct; });

  const ok = postToSheet({
    type:'result',
    id:state.id,
    submittedAt:new Date().toISOString(),
    // language is folded into Event so the sheet needs no extra column
    event:CONFIG.VENUE + ' (' + state.lang.toUpperCase() + ')',
    name:state.name, phone:state.phone, email:state.email,
    age:state.age, goal:state.goal,
    score:r.pct, band:r.band.name.en,
    top1:r.top[0] ? r.top[0].name.en : '',
    top2:r.top[1] ? r.top[1].name.en : '',
    top3:r.top[2] ? r.top[2].name.en : '',
    categories:catPct, answers:answerSummary(), answered:r.answered
  });

  if (ok) { state.sent = true; save(); }
}

/* ------------------------------------------------------------------- RENDER */
function renderChips(host, values, key) {
  if (!host) return;
  host.innerHTML = '';
  values.forEach((v, i) => {
    const lab = el('label', 'chip');
    const inp = document.createElement('input');
    inp.type = 'radio'; inp.name = key; inp.id = key + '-' + i; inp.value = v.en;
    inp.checked = state[key] === v.en;
    inp.addEventListener('change', () => { state[key] = v.en; save(); });
    lab.appendChild(inp);
    lab.appendChild(el('span', null, t(v)));
    host.appendChild(lab);
  });
}

function renderQuestion() {
  const q    = QUESTIONS[state.idx];
  const host = $('#q-host');
  host.innerHTML = '';

  const wrap = el('div', 'q');
  const fs   = document.createElement('fieldset');
  fs.className = 'opts';
  const lg = document.createElement('legend');
  lg.className = 'q__text';
  lg.textContent = t(q.text);
  fs.appendChild(lg);

  q.opts.forEach((o, i) => {
    const lab = el('label', 'opt-row');
    const inp = document.createElement('input');
    inp.type = 'radio'; inp.name = q.id; inp.value = String(i);
    inp.checked = state.answers[q.id] === i;
    inp.addEventListener('change', () => {
      state.answers[q.id] = i;
      $('#q-err').hidden = true;
      save();
      track('question_completed', { id:q.id, index:state.idx + 1 });
    });
    lab.appendChild(inp);
    lab.appendChild(el('span', null, t(o.t)));
    fs.appendChild(lab);
  });

  wrap.appendChild(fs);
  host.appendChild(wrap);

  const n = state.idx + 1, total = QUESTIONS.length;
  $('#p-count').textContent = n + ' / ' + total;
  $('#p-cat').textContent   = t(CATS[q.cat].name);
  $('#p-fill').style.width  = (n / total * 100) + '%';
  const bar = $('#p-bar');
  bar.setAttribute('aria-valuemax', String(total));
  bar.setAttribute('aria-valuenow', String(n));
  bar.setAttribute('aria-valuetext', fill(t(UI.qOf), n, total));
  $('#q-live').textContent = fill(t(UI.qOf), n, total) + '. ' + t(q.text);

  $('[data-action="prev"]').disabled = state.idx === 0;
  $('[data-action="next"]').textContent = state.idx === total - 1 ? t(UI.seeScore) : t(UI.nextBtn);
}

function renderResult() {
  const r = state.result = calculate();

  $('[data-role="result-heading"]').textContent = state.name
    ? fill(t(UI.resultHeadingN), state.name)
    : t(UI.resultHeading);

  $('[data-role="gauge-title"]').textContent =
    t(UI.resultHeading) + ' ' + r.pct + '%. ' + t(r.band.name) + '.';
  $('#score-band').textContent  = t(r.band.name);
  $('#score-blurb').textContent = t(r.band.blurb);

  const arc = $('#gauge-arc');
  const C   = 2 * Math.PI * 52;
  arc.style.stroke = r.pct >= 70 ? 'var(--gold)' : r.pct >= 50 ? 'var(--plum)' : 'var(--teal-deep)';
  arc.style.strokeDashoffset = String(C);
  requestAnimationFrame(() => { arc.style.strokeDashoffset = String(C - (C * r.pct / 100)); });

  const num    = $('#score-num');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { num.textContent = String(r.pct); }
  else {
    let cur = 0;
    const step = () => {
      cur += Math.max(1, Math.ceil((r.pct - cur) / 8));
      if (cur >= r.pct) { num.textContent = String(r.pct); return; }
      num.textContent = String(cur);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const card = c => {
    const li  = el('li', 'cat');
    const top = el('div', 'cat__top');
    top.appendChild(el('span', 'cat__name', t(c.name)));
    top.appendChild(el('span', 'cat__val', fill(t(UI.unexamined), c.pct + '%')));
    li.appendChild(top);
    const trackEl = el('div', 'cat__track');
    const f = el('div', 'cat__fill');
    trackEl.appendChild(f);
    li.appendChild(trackEl);
    li.appendChild(el('p', 'cat__note', t(c.note)));
    requestAnimationFrame(() => { f.style.width = c.pct + '%'; });
    return li;
  };

  const topList = $('#cat-list'); topList.innerHTML = '';
  r.top.forEach(c => topList.appendChild(card(c)));
  const allList = $('#cat-all'); allList.innerHTML = '';
  r.cats.forEach(c => allList.appendChild(card(c)));

  buildWhatsApp(r);
  sendResult(r);

  track('assessment_completed', { score:r.pct, band:r.band.name.en });
}

/* ----------------------------------------------------------------- WHATSAPP */
function digits(number) { return String(number).replace(/\D/g, ''); }
function isConfigured(number) { return digits(number).length >= 10; }
function waLink(number, message) {
  return 'https://wa.me/' + digits(number) + '?text=' + encodeURIComponent(message);
}

const WA_MSG = {
  en: r => {
    const p = ['Hi, I completed the ' + CONFIG.VENUE + ' Wellness Blind Spot Assessment.'];
    if (state.name) p.push('My name is ' + state.name + '.');
    p.push('My score was ' + r.pct + '% (' + r.band.name.en + ').');
    p.push('My main blind-spot areas were: ' + r.top.map(c => c.name.en).join(', ') + '.');
    if (state.goal) p.push('What matters most to me right now is ' + state.goal.toLowerCase() + '.');
    if (state.age)  p.push('Age range: ' + state.age + '.');
    p.push('I would like to understand what this means and explore the free expert discussion.');
    return p.join(' ');
  },
  hi: r => {
    const p = ['नमस्ते, मैंने ' + CONFIG.VENUE + ' वेलनेस ब्लाइंड स्पॉट आकलन पूरा किया है।'];
    if (state.name) p.push('मेरा नाम ' + state.name + ' है।');
    p.push('मेरा स्कोर ' + r.pct + '% रहा (' + t(r.band.name) + ')।');
    p.push('मेरे मुख्य ब्लाइंड स्पॉट क्षेत्र थे: ' + r.top.map(c => t(c.name)).join(', ') + '।');
    if (state.goal) {
      const g = GOALS.find(x => x.en === state.goal);
      p.push('अभी मेरे लिए सबसे ज़रूरी है: ' + (g ? t(g) : state.goal) + '।');
    }
    if (state.age) {
      const a = AGES.find(x => x.en === state.age);
      p.push('आयु वर्ग: ' + (a ? t(a) : state.age) + '।');
    }
    p.push('मैं समझना चाहता/चाहती हूँ कि इसका क्या मतलब है और नि:शुल्क विशेषज्ञ बातचीत के बारे में जानना चाहता/चाहती हूँ।');
    return p.join(' ');
  }
};

function buildWhatsApp(r) {
  const minor = state.age === 'Below 18';
  $('#minor-note').hidden = !minor;
  $('#cta-row').hidden    = minor;
  if (minor) { $('#wa-unset').hidden = true; return; }

  const msg   = (WA_MSG[state.lang] || WA_MSG.en)(r);
  const slots = [$('#wa-1'), $('#wa-2')];
  let live = 0;

  slots.forEach((a, i) => {
    const c = CONFIG.CONTACTS[i];
    if (c && isConfigured(c.number)) {
      const label = $('[data-role="wa-' + (i + 1) + '-label"]', a);
      if (label) label.textContent = t(c.label);
      a.hidden  = false;
      a.href    = waLink(c.number, msg);
      a.onclick = () => {
        track('wa_clicked', { who:c.key, score:r.pct });
        postToSheet({ type:'contact_click', id:state.id, contact:c.key,
                      clickedAt:new Date().toISOString() });
      };
      live++;
    } else {
      a.hidden = true;
      a.removeAttribute('href');
    }
  });

  $('#wa-unset').hidden = live > 0;
}

/* ---------------------------------------------------------------- VALIDATION
   Name, mobile and email are required. Deliberately forgiving on format:
   the cost of rejecting a real visitor at a busy stand is far higher than
   the cost of one malformed row.
   ------------------------------------------------------------------------ */
function showFieldErr(inputId, errId, msg) {
  const e = $('#' + errId);
  e.textContent = msg;
  e.hidden = false;
  $('#' + inputId).setAttribute('aria-invalid', 'true');
}
function clearFieldErr(inputId, errId) {
  $('#' + errId).hidden = true;
  $('#' + inputId).removeAttribute('aria-invalid');
}

function validateDetails() {
  let firstBad = null;

  const name = $('#f-name').value.trim().slice(0, 60);
  if (name.length < 2) { showFieldErr('f-name', 'e-name', t(UI.errName)); firstBad = firstBad || '#f-name'; }
  else clearFieldErr('f-name', 'e-name');

  // 10 digits for an Indian mobile; 12 once "91" is typed in front.
  const phone = digits($('#f-phone').value).slice(0, 15);
  if (phone.length < 10) { showFieldErr('f-phone', 'e-phone', t(UI.errPhone)); firstBad = firstBad || '#f-phone'; }
  else clearFieldErr('f-phone', 'e-phone');

  const email = $('#f-email').value.trim().slice(0, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    showFieldErr('f-email', 'e-email', t(UI.errEmail)); firstBad = firstBad || '#f-email';
  } else clearFieldErr('f-email', 'e-email');

  if (firstBad) { $(firstBad).focus(); return false; }

  state.name = name; state.phone = phone; state.email = email;
  return true;
}

/* --------------------------------------------------------------- NAVIGATION */
function goQuiz() { show('s-quiz'); renderQuestion(); }

function next() {
  const q = QUESTIONS[state.idx];
  if (state.answers[q.id] == null) { $('#q-err').hidden = false; return; }
  if (state.idx < QUESTIONS.length - 1) { state.idx++; save(); renderQuestion(); }
  else { show('s-result'); renderResult(); }
}
function prev() {
  if (state.idx > 0) { state.idx--; save(); renderQuestion(); }
  else { show('s-details'); }
}

function resetInputs() {
  ['f-name', 'f-phone', 'f-email'].forEach(id => { $('#' + id).value = ''; });
  ['e-name', 'e-phone', 'e-email'].forEach(id => { $('#' + id).hidden = true; });
  $$('input[type="radio"]').forEach(i => { i.checked = false; });
}

/* --------------------------------------------------------------------- INIT */
document.addEventListener('DOMContentLoaded', () => {
  state.id = newId();
  const resumed = restore();

  const label = $('[data-role="event-label"]');
  if (label && CONFIG.EVENT_LABEL) label.textContent = CONFIG.EVENT_LABEL;

  applyLang();

  $('#langsw').addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (b) setLang(b.dataset.lang);
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const a = btn.dataset.action;

    if (a === 'start')  { track('assessment_started', {}); show('s-details'); }
    if (a === 'next')   next();
    if (a === 'prev')   prev();
    if (a === 'retake') { wipe(); resetInputs(); applyLang(); show('s-intro'); }
    if (a === 'clear')  {
      wipe(); resetInputs(); applyLang(); show('s-intro');
      btn.textContent = t(UI.cleared);
      setTimeout(() => { btn.textContent = t(UI.clearBtn); }, 2200);
    }
  });

  $('#details-form').addEventListener('submit', e => {
    e.preventDefault();
    if (!validateDetails()) return;
    save();
    goQuiz();
  });

  if (resumed) {
    $('#f-name').value  = state.name;
    $('#f-phone').value = state.phone;
    $('#f-email').value = state.email;
    goQuiz();
  }

  document.addEventListener('keydown', e => {
    if ($('#s-quiz').hidden) return;
    if (e.target.matches('input,textarea')) return;
    const q = QUESTIONS[state.idx];
    const k = parseInt(e.key, 10);
    if (k >= 1 && k <= q.opts.length) {
      const inp = $$('#q-host input')[k - 1];
      if (inp) { inp.checked = true; inp.dispatchEvent(new Event('change')); }
    }
    if (e.key === 'Enter') { e.preventDefault(); next(); }
  });
});
