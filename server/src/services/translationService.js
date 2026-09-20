import { SarvamAIClient } from "sarvamai";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const client = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
});

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const cacheDirectory = path.resolve(serviceDirectory, "../../data");
const cachePath = path.join(cacheDirectory, "translation-cache.json");
let cachePromise;
let cacheWritePromise = Promise.resolve();
const inFlightTranslations = new Map();

async function loadCache() {
  if (!cachePromise) {
    cachePromise = (async () => {
      await mkdir(cacheDirectory, { recursive: true });
      try {
        return new Map(Object.entries(JSON.parse(await readFile(cachePath, "utf8"))));
      } catch (error) {
        if (error.code === "ENOENT") return new Map();
        throw error;
      }
    })();
  }

  return cachePromise;
}

function saveCache(cache) {
  cacheWritePromise = cacheWritePromise.catch(() => undefined).then(async () => {
    const temporaryCachePath = `${cachePath}.tmp`;
    await writeFile(
      temporaryCachePath,
      `${JSON.stringify(Object.fromEntries(cache), null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryCachePath, cachePath);
  });
  return cacheWritePromise;
}

export const defaultTranslations = {
  "hi-IN": {
    "Hello! What is your name?": "नमस्ते! आपका नाम क्या है?",
    "What kind of work do you do?": "आप किस तरह का काम करते हैं?",
    "How much experience do you have?": "आपको इस काम का कितना अनुभव है?",
    "Fabrication work for industrial equipment.": "औद्योगिक उपकरणों के लिए फैब्रिकेशन कार्य।",
    "Precision welding for stainless steel assemblies.": "स्टेनलेस स्टील असेंबली के लिए सटीक वेल्डिंग।",
    "Site welding and structural repair work.": "साइट वेल्डिंग और संरचनात्मक मरम्मत कार्य।",
    "Install and maintain factory electrical systems.": "फैक्ट्री इलेक्ट्रिकल सिस्टम स्थापित और रखरखाव करें।",
    "Residential and commercial electrical installation.": "आवासीय और वाणिज्यिक विद्युत स्थापना।",
    "Maintain motors, cables, and electrical panels.": "मोटर, केबल और इलेक्ट्रिकल पैनल का रखरखाव करें।",
    "Commercial plumbing installation and repair.": "वाणिज्यिक प्लंबिंग स्थापना और मरम्मत।",
    "Plumbing work for an apartment construction site.": "अपार्टमेंट निर्माण स्थल के लिए प्लंबिंग कार्य।",
    "Operate CNC turning and milling machines.": "सीएनसी टर्निंग और मिलिंग मशीन संचालित करें।",
    "Operate production machinery and complete quality checks.": "उत्पादन मशीनरी संचालित करें और गुणवत्ता जांच पूरी करें।",
    "Assembly-line operation for precision components.": "सटीक घटकों के लिए असेंबली-लाइन संचालन।",
    "Support welding and fabrication teams on the shop floor.": "शॉप फ्लोर पर वेल्डिंग और फैब्रिकेशन टीमों का सहयोग करें।",
  },
  "en-IN": {
    "Hello! What is your name?": "Hello! What is your name?",
    "What kind of work do you do?": "What kind of work do you do?",
    "How much experience do you have?": "How much experience do you have?",
    "Fabrication work for industrial equipment.": "Fabrication work for industrial equipment.",
    "Precision welding for stainless steel assemblies.": "Precision welding for stainless steel assemblies.",
    "Site welding and structural repair work.": "Site welding and structural repair work.",
    "Install and maintain factory electrical systems.": "Install and maintain factory electrical systems.",
    "Residential and commercial electrical installation.": "Residential and commercial electrical installation.",
    "Maintain motors, cables, and electrical panels.": "Maintain motors, cables, and electrical panels.",
    "Commercial plumbing installation and repair.": "Commercial plumbing installation and repair.",
    "Plumbing work for an apartment construction site.": "Plumbing work for an apartment construction site.",
    "Operate CNC turning and milling machines.": "Operate CNC turning and milling machines.",
    "Operate production machinery and complete quality checks.": "Operate production machinery and complete quality checks.",
    "Assembly-line operation for precision components.": "Assembly-line operation for precision components.",
    "Support welding and fabrication teams on the shop floor.": "Support welding and fabrication teams on the shop floor.",
  },
  "ta-IN": {
    "Hello! What is your name?": "வணக்கம்! உங்கள் பெயர் என்ன?",
    "What kind of work do you do?": "நீங்கள் என்ன வேலை செய்கிறீர்கள்?",
    "How much experience do you have?": "உங்களுக்கு எவ்வளவு அனுபவம் உள்ளது?",
    "Fabrication work for industrial equipment.": "தொழில்துறை உபகரணங்களுக்கான ஃபேப்ரிகேஷன் வேலை.",
    "Precision welding for stainless steel assemblies.": "துருப்பிடிக்காத எஃகு கூட்டங்களுக்கான துல்லியமான வெல்டிங்.",
    "Site welding and structural repair work.": "தள வெல்டிங் மற்றும் கட்டமைப்பு பழுதுபார்க்கும் வேலை.",
    "Install and maintain factory electrical systems.": "தொழிற்சாலை மின் அமைப்புகளை நிறுவி பராமரித்தல்.",
    "Residential and commercial electrical installation.": "குடியிருப்பு மற்றும் வணிக மின் நிறுவல்.",
    "Maintain motors, cables, and electrical panels.": "மோட்டார்கள், கேபிள்கள் மற்றும் மின் பலகைகளை பராமரித்தல்.",
    "Commercial plumbing installation and repair.": "வணிக பிளம்பிங் நிறுவல் மற்றும் பழுதுபார்ப்பு.",
    "Plumbing work for an apartment construction site.": "அபார்ட்மெண்ட் கட்டுமான தளத்திற்கான பிளம்பிங் வேலை.",
    "Operate CNC turning and milling machines.": "சிஎன்சி திருப்புதல் மற்றும் அரைக்கும் இயந்திரங்களை இயக்குதல்.",
    "Operate production machinery and complete quality checks.": "உற்பத்தி இயந்திரங்களை இயக்கி தர சோதனைகளை முடிக்கவும்.",
    "Assembly-line operation for precision components.": "துல்லியமான கூறுகளுக்கான அசெம்பிளி-லைன் செயல்பாடு.",
    "Support welding and fabrication teams on the shop floor.": "ஷாப் தளத்தில் வெல்டிங் மற்றும் ஃபேப்ரிகேஷன் குழுக்களுக்கு ஆதரவு அளித்தல்.",
  },
  "te-IN": {
    "Hello! What is your name?": "నమస్కారం! మీ పేరు ఏమిటి?",
    "What kind of work do you do?": "మీరు ఎలాంటి పని చేస్తారు?",
    "How much experience do you have?": "మీకు ఎంత అనుభవం ఉంది?",
    "Fabrication work for industrial equipment.": "పారిశ్రామిక పరికరాల కోసం ఫ్యాబ్రికేషన్ పని.",
    "Precision welding for stainless steel assemblies.": "స్టెయిన్‌లెస్ స్టీల్ అసెంబ్లీల కోసం ఖచ్చితమైన వెల్డింగ్.",
    "Site welding and structural repair work.": "సైట్ వెల్డింగ్ మరియు నిర్మాణ మరమ్మతు పని.",
    "Install and maintain factory electrical systems.": "ఫ్యాక్టరీ ఎలక్ట్రికల్ సిస్టమ్‌లను ఇన్‌స్టాల్ చేయడం మరియు నిర్వహించడం.",
    "Residential and commercial electrical installation.": "నివాస మరియు వాణిజ్య విద్యుత్ సంస్థాపన.",
    "Maintain motors, cables, and electrical panels.": "మోటార్లు, కేబుల్స్ మరియు ఎలక్ట్రికల్ ప్యానెల్స్ నిర్వహణ.",
    "Commercial plumbing installation and repair.": "వాణిజ్య ప్లంబింగ్ సంస్థాపన మరియు మరమ్మతు.",
    "Plumbing work for an apartment construction site.": "అపార్ట్మెంట్ నిర్మాణ సైట్ కోసం ప్లంబింగ్ పని.",
    "Operate CNC turning and milling machines.": "సిఎన్‌సి టర్నింగ్ మరియు మిల్లింగ్ యంత్రాలను ఆపరేట్ చేయండి.",
    "Operate production machinery and complete quality checks.": "ఉత్పత్తి యంత్రాలను ఆపరేట్ చేయండి మరియు నాణ్యత తనిఖీలను పూర్తి చేయండి.",
    "Assembly-line operation for precision components.": "ఖచ్చితమైన భాగాల కోసం అసెంబ్లీ లైన్ ఆపరేషన్.",
    "Support welding and fabrication teams on the shop floor.": "షాప్ ఫ్లోర్‌పై వెల్డింగ్ మరియు ఫ్యాబ్రికేషన్ బృందాలకు మద్దతు ఇవ్వండి.",
  },
  "kn-IN": {
    "Hello! What is your name?": "ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಹೆಸರೇನು?",
    "What kind of work do you do?": "ನೀವು ಯಾವ ರೀತಿಯ ಕೆಲಸ ಮಾಡುತ್ತೀರಿ?",
    "How much experience do you have?": "ನಿಮಗೆ ಎಷ್ಟು ಅನುಭವವಿದೆ?",
    "Fabrication work for industrial equipment.": "ಕೈಗಾರಿಕಾ ಸಲಕರಣೆಗಳಿಗಾಗಿ ಫ್ಯಾಬ್ರಿಕೇಶನ್ ಕೆಲಸ.",
    "Precision welding for stainless steel assemblies.": "ಸ್ಟೇನ್‌ಲೆಸ್ ಸ್ಟೀಲ್ ಜೋಡಣೆಗಳಿಗಾಗಿ ನಿಖರವಾದ ವೆಲ್ಡಿಂಗ್.",
    "Site welding and structural repair work.": "ಸೈಟ್ ವೆಲ್ಡಿಂಗ್ ಮತ್ತು ರಚನಾತ್ಮಕ ದುರಸ್ತಿ ಕೆಲಸ.",
    "Install and maintain factory electrical systems.": "ಫ್ಯಾಕ್ಟರಿ ವಿದ್ಯುತ್ ವ್ಯವಸ್ಥೆಗಳನ್ನು ಅಳವಡಿಸಿ ಮತ್ತು ನಿರ್ವಹಿಸಿ.",
    "Residential and commercial electrical installation.": "ವಸತಿ ಮತ್ತು ವಾಣಿಜ್ಯ ವಿದ್ಯುತ್ ಅಳವಡಿಕೆ.",
    "Maintain motors, cables, and electrical panels.": "ಮೋಟಾರ್‌ಗಳು, ಕೇಬಲ್‌ಗಳು ಮತ್ತು ವಿದ್ಯುತ್ ಪ್ಯಾನೆಲ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
    "Commercial plumbing installation and repair.": "ವಾಣಿಜ್ಯ ಪ್ಲಂಬಿಂಗ್ ಅಳವಡಿಕೆ ಮತ್ತು ದುರಸ್ತಿ.",
    "Plumbing work for an apartment construction site.": "ಅಪಾರ್ಟ್ಮೆಂಟ್ ನಿರ್ಮಾಣ ಸೈಟ್‌ಗಾಗಿ ಪ್ಲಂಬಿಂಗ್ ಕೆಲಸ.",
    "Operate CNC turning and milling machines.": "ಸಿಎನ್‌ಸಿ ಟರ್ನಿಂಗ್ ಮತ್ತು ಮಿಲ್ಲಿಂಗ್ ಯಂತ್ರಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
    "Operate production machinery and complete quality checks.": "ಉತ್ಪಾದನಾ ಯಂತ್ರೋಪಕರಣಗಳನ್ನು ನಿರ್ವಹಿಸಿ ಮತ್ತು ಗುಣಮಟ್ಟ ಪರಿಶೀಲನೆ ಪೂರ್ಣಗೊಳಿಸಿ.",
    "Assembly-line operation for precision components.": "ನಿಖರವಾದ ಘಟಕಗಳಿಗಾಗಿ ಅಸೆಂಬ್ಲಿ-ಲೈನ್ ಕಾರ್ಯಾಚರಣೆ.",
    "Support welding and fabrication teams on the shop floor.": "ಶಾಪ್ ಫ್ಲೋರ್‌ನಲ್ಲಿ ವೆಲ್ಡಿಂಗ್ ಮತ್ತು ಫ್ಯಾಬ್ರಿಕೇಶನ್ ತಂಡಗಳಿಗೆ ಬೆಂಬಲ ನೀಡಿ.",
  },
  "mr-IN": {
    "Hello! What is your name?": "नमस्ते! तुमचे नाव काय आहे?",
    "What kind of work do you do?": "तुम्ही कोणत्या प्रकारचे काम करता?",
    "How much experience do you have?": "तुम्हाला किती कामाचा अनुभव आहे?",
    "Fabrication work for industrial equipment.": "औद्योगिक उपकरणांसाठी फॅब्रिकेशन काम.",
    "Precision welding for stainless steel assemblies.": "स्टेनलेस स्टील असेंब्लीसाठी अचूक वेल्डिंग.",
    "Site welding and structural repair work.": "साइट वेल्डिंग आणि स्ट्रक्चरल दुरुस्ती काम.",
    "Install and maintain factory electrical systems.": "कारखाना इलेक्ट्रिकल सिस्टीम स्थापित आणि देखभाल करा.",
    "Residential and commercial electrical installation.": "निवासी आणि व्यावसायिक विद्युत इन्स्टॉलेशन.",
    "Maintain motors, cables, and electrical panels.": "मोटार, केबल्स आणि इलेक्ट्रिकल पॅनेल्सची देखभाल करा.",
    "Commercial plumbing installation and repair.": "व्यावसायिक प्लंबिंग इन्स्टॉलेशन आणि दुरुस्ती.",
    "Plumbing work for an apartment construction site.": "अपार्टमेंट बांधकाम साइटसाठी प्लंबिंग काम.",
    "Operate CNC turning and milling machines.": "सीएनसी टर्निंग आणि मिलिंग मशीन चालवा.",
    "Operate production machinery and complete quality checks.": "उत्पादन यंत्रसामग्री चालवा आणि गुणवत्ता तपासणी पूर्ण करा.",
    "Assembly-line operation for precision components.": "अचूक घटकांसाठी असेंब्ली-लाइन ऑपरेशन.",
    "Support welding and fabrication teams on the shop floor.": "शॉप फ्लोअरवर वेल्डिंग आणि फॅब्रिकेशन टीम्सना मदत करा.",
  },
};

export async function translateText({
  text,
  sourceLanguageCode = "en-IN",
  targetLanguageCode,
}) {
  const key = JSON.stringify([sourceLanguageCode, targetLanguageCode, text]);
  const cache = await loadCache();
  const cachedTranslation = cache.get(key);

  if (cachedTranslation) {
    return { translatedText: cachedTranslation, cached: true };
  }

  if (defaultTranslations[targetLanguageCode]?.[text]) {
    const defaultText = defaultTranslations[targetLanguageCode][text];
    cache.set(key, defaultText);
    saveCache(cache).catch(() => undefined);
    return { translatedText: defaultText, cached: true };
  }

  if (sourceLanguageCode === targetLanguageCode) {
    return { translatedText: text, cached: true };
  }

  if (inFlightTranslations.has(key)) {
    return inFlightTranslations.get(key);
  }

  const translationPromise = (async () => {
    let translatedText;
    if (process.env.SARVAM_API_KEY) {
      try {
        const response = await client.text.translate({
          input: text,
          source_language_code: sourceLanguageCode,
          target_language_code: targetLanguageCode,
          model: "mayura:v1",
          mode: "formal",
          output_script: "fully-native",
        });
        translatedText = response?.translated_text;
      } catch (err) {
        console.warn("Sarvam translation call failed:", err.message);
      }
    }

    if (!translatedText) {
      translatedText = defaultTranslations[targetLanguageCode]?.[text] || text;
    }

    cache.set(key, translatedText);
    await saveCache(cache);
    return { translatedText, cached: false };
  })();

  inFlightTranslations.set(key, translationPromise);
  try {
    return await translationPromise;
  } finally {
    inFlightTranslations.delete(key);
  }
}
