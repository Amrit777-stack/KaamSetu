import { getJobs } from "./jobService.js";
import { getWorkerProfile } from "./workerService.js";
import { calculateDistanceKm, roundedDistanceKm } from "./distanceService.js";

const CITY_COORDINATES = {
  pune: { latitude: 18.5204, longitude: 73.8567 },
  mumbai: { latitude: 19.0760, longitude: 72.8777 },
  chennai: { latitude: 13.0827, longitude: 80.2707 },
  vellore: { latitude: 12.9165, longitude: 79.1325 },
  katpadi: { latitude: 12.9707, longitude: 79.1637 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  bangalore: { latitude: 12.9716, longitude: 77.5946 },
  delhi: { latitude: 28.6139, longitude: 77.2090 },
  "new delhi": { latitude: 28.6139, longitude: 77.2090 },
  hyderabad: { latitude: 17.3850, longitude: 78.4867 },
  ahmedabad: { latitude: 23.0225, longitude: 72.5714 },
  kochi: { latitude: 9.9312, longitude: 76.2673 },
  patna: { latitude: 25.5941, longitude: 85.1376 },
  mysuru: { latitude: 12.2958, longitude: 76.6394 },
  bhubaneswar: { latitude: 20.2961, longitude: 85.8245 },
  coimbatore: { latitude: 11.0168, longitude: 76.9558 },
  lucknow: { latitude: 26.8467, longitude: 80.9462 },
  jaipur: { latitude: 26.9084, longitude: 75.7953 },
  ranipet: { latitude: 12.9309, longitude: 79.3373 },
};

const fields = ["occupation", "skills", "experience_years", "location", "expected_salary_min", "preferred_shift"];
const occupations = ["welder", "electrician", "plumber", "carpenter", "painter", "mason", "driver", "helper", "operator"];
const numberWords = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, "चार": 4, "पांच": 5, "पाँच": 5, "दो": 2, "तीन": 3, "एक": 1, "बीस": 20 };

const questionText = {
  "en-IN": {
    occupation: "What kind of work are you looking for?", skills: "What skills do you have for this work?", experience_years: "How many years of experience do you have in this work?", location: "Which city or area are you looking for work in?", expected_salary_min: "What is the minimum monthly salary you expect?", preferred_shift: "Which shift do you prefer — day, night, or any?",
  },
  "hi-IN": {
    occupation: "आप किस तरह का काम ढूंढ रहे हैं?", skills: "आप इस काम में कौन-कौन से काम कर लेते हैं?", experience_years: "आपको यह काम करते हुए कितने साल हो गए हैं?", location: "आप किस शहर या इलाके में काम ढूंढ रहे हैं?", expected_salary_min: "आपको कम से कम कितनी महीने की salary चाहिए?", preferred_shift: "आप किस shift में काम करना पसंद करेंगे — दिन, रात या कोई भी?",
  },
  "ta-IN": { occupation: "நீங்கள் எந்த வகையான வேலை தேடுகிறீர்கள்?", skills: "இந்த வேலைக்கு உங்களிடம் என்ன திறன்கள் உள்ளன?", experience_years: "இந்த வேலையில் உங்களுக்கு எத்தனை வருட அனுபவம் உள்ளது?", location: "எந்த நகரம் அல்லது பகுதியில் வேலை தேடுகிறீர்கள்?", expected_salary_min: "நீங்கள் எதிர்பார்க்கும் குறைந்தபட்ச மாத சம்பளம் என்ன?", preferred_shift: "எந்த ஷிப்டை விரும்புகிறீர்கள் — பகல், இரவு அல்லது எதுவும்?" },
  "te-IN": { occupation: "మీరు ఎలాంటి పని కోసం చూస్తున్నారు?", skills: "ఈ పనికి మీకు ఏ నైపుణ్యాలు ఉన్నాయి?", experience_years: "ఈ పనిలో మీకు ఎన్ని సంవత్సరాల అనుభవం ఉంది?", location: "మీరు ఏ నగరం లేదా ప్రాంతంలో పని కోసం చూస్తున్నారు?", expected_salary_min: "మీరు ఆశించే కనీస నెల జీతం ఎంత?", preferred_shift: "మీరు ఏ షిఫ్ట్‌ను ఇష్టపడతారు — పగలు, రాత్రి లేదా ఏదైనా?" },
  "kn-IN": { occupation: "ನೀವು ಯಾವ ರೀತಿಯ ಕೆಲಸವನ್ನು ಹುಡುಕುತ್ತಿದ್ದೀರಿ?", skills: "ಈ ಕೆಲಸಕ್ಕೆ ನಿಮಗೆ ಯಾವ ಕೌಶಲ್ಯಗಳಿವೆ?", experience_years: "ಈ ಕೆಲಸದಲ್ಲಿ ನಿಮಗೆ ಎಷ್ಟು ವರ್ಷಗಳ ಅನುಭವವಿದೆ?", location: "ನೀವು ಯಾವ ನಗರ ಅಥವಾ ಪ್ರದೇಶದಲ್ಲಿ ಕೆಲಸ ಹುಡುಕುತ್ತಿದ್ದೀರಿ?", expected_salary_min: "ನೀವು ನಿರೀಕ್ಷಿಸುವ ಕನಿಷ್ಠ ಮಾಸಿಕ ಸಂಬಳ ಎಷ್ಟು?", preferred_shift: "ನೀವು ಯಾವ ಶಿಫ್ಟ್ ಇಷ್ಟಪಡುತ್ತೀರಿ — ಹಗಲು, ರಾತ್ರಿ ಅಥವಾ ಯಾವುದಾದರೂ?" },
  "mr-IN": { occupation: "तुम्ही कोणत्या प्रकारचे काम शोधत आहात?", skills: "या कामासाठी तुमच्याकडे कोणती कौशल्ये आहेत?", experience_years: "या कामात तुम्हाला किती वर्षांचा अनुभव आहे?", location: "तुम्ही कोणत्या शहरात किंवा भागात काम शोधत आहात?", expected_salary_min: "तुम्हाला किमान किती मासिक पगार अपेक्षित आहे?", preferred_shift: "तुम्हाला कोणती शिफ्ट पसंत आहे — दिवस, रात्र की कोणतीही?" },
};

function clean(value) { return String(value || "").trim(); }
function numberIn(text) {
  const numeric = text.replace(/[,₹]/g, "").match(/\b(\d+(?:\.\d+)?)\b/);
  if (numeric) return Number(numeric[1]);
  const word = Object.keys(numberWords).find((key) => text.toLowerCase().includes(key));
  return word == null ? null : numberWords[word];
}

function extract(answer, current) {
  const text = clean(answer);
  const lower = text.toLowerCase();
  const next = { ...current, skills: [...(current.skills || [])] };
  const occupation = occupations.find((value) => lower.includes(value));
  if (occupation) next.occupation = occupation[0].toUpperCase() + occupation.slice(1);
  if (!next.occupation && /\bwelding\b/i.test(text)) next.occupation = "Welder";
  if (/\b(mig|tig|arc|welding|fabrication|wiring|panel|plumbing|pipe|carpentry|masonry|brick|concrete)\b/i.test(text)) {
    const skills = text.match(/\b(mig welding|tig welding|arc welding|fabrication|wiring|panel maintenance|plumbing|pipe fitting|carpentry|masonry|brick laying|concrete work)\b/gi) || [];
    next.skills = [...new Set([...next.skills, ...skills.map((skill) => skill.toLowerCase())])];
  }
  if (/\b(year|years|experience|साल|वर्ष)\b/i.test(text) || /नया|new/i.test(text)) next.experience_years = /नया|new/i.test(text) ? 0 : numberIn(text);
  const city = text.match(/\b(pune|mumbai|chennai|vellore|bengaluru|bangalore|delhi|hyderabad)\b/i);
  if (city) next.location = city[1].replace(/^./, (char) => char.toUpperCase());
  if (/\b(salary|pay|rupee|₹|हजार|हज़ार|salary)\b/i.test(text)) {
    const amount = numberIn(text);
    if (amount != null) next.expected_salary_min = amount < 1000 ? amount * 1000 : amount;
  }
  if (/day|दिन|morning/i.test(text)) next.preferred_shift = "day";
  if (/night|रात/i.test(text)) next.preferred_shift = "night";
  if (/any|either|कोई भी/i.test(text)) next.preferred_shift = "any";

  // An answer belongs to the question currently being asked even when it uses no cue words.
  if (current._asked === "occupation" && !next.occupation && text) next.occupation = text;
  if (current._asked === "skills" && next.skills.length === (current.skills || []).length && text) next.skills = [...new Set([...next.skills, text.toLowerCase()])];
  if (current._asked === "experience_years" && next.experience_years == null) next.experience_years = numberIn(text);
  if (current._asked === "location" && !next.location && text) next.location = text;
  if (current._asked === "expected_salary_min" && next.expected_salary_min == null) { const amount = numberIn(text); if (amount != null) next.expected_salary_min = amount < 1000 ? amount * 1000 : amount; }
  return next;
}

function questionFor(field, search, language) {
  const localized = questionText[language] || questionText["en-IN"];
  if (field !== "skills") return localized[field];
  if (String(search.occupation || "").toLowerCase() === "welder") {
    return language === "hi-IN" ? "आप किस तरह की welding कर लेते हैं?" : "What type of welding can you do?";
  }
  return localized.skills;
}

function scoreJob(job, search) {
  const titleAndSkills = `${job.title || ""} ${(job.skills || job.required_skills || []).toString()}`.toLowerCase();
  const breakdown = { skills: 0, experience: 0, location: 0, salary: 0, shift: 0 };
  const reasons = [];
  const desiredSkills = search.skills || [];
  const skillMatch = desiredSkills.some((skill) => titleAndSkills.includes(skill.toLowerCase())) || titleAndSkills.includes((search.occupation || "").toLowerCase());
  if (skillMatch) { breakdown.skills = 40; reasons.push("Your work skills match this job"); }
  const requiredExperience = Number(job.experience_required ?? job.required_experience ?? 0);
  if (search.experience_years != null && search.experience_years >= requiredExperience) { breakdown.experience = 20; reasons.push("Your experience meets the requirement"); }
  if (search.location && String(job.location || "").toLowerCase() === search.location.toLowerCase()) { breakdown.location = 15; reasons.push(`The job is in ${job.location}`); }
  if (search.expected_salary_min != null && Number(job.salary_max || 0) >= search.expected_salary_min) { breakdown.salary = Number(job.salary_min || 0) >= search.expected_salary_min ? 15 : 8; reasons.push("The salary meets your minimum expectation"); }
  if (search.preferred_shift && (search.preferred_shift === "any" || String(job.shift || "").toLowerCase() === search.preferred_shift)) { breakdown.shift = search.preferred_shift === "any" ? 10 : 10; reasons.push("The shift matches your preference"); }
  return { job, matchScore: Object.values(breakdown).reduce((sum, value) => sum + value, 0), breakdown, reasons };
}

export function startVoiceJobSearch(language = "en-IN") {
  const search = { occupation: null, skills: [], experience_years: null, location: null, expected_salary_min: null, preferred_shift: null, employment_type: null, _asked: "occupation" };
  return { search, nextQuestion: (questionText[language] || questionText["en-IN"]).occupation, isComplete: false };
}

export async function continueVoiceJobSearch({
  answer,
  search,
  language = "en-IN",
  workerId,
  latitude,
  longitude,
  location,
}) {
  const next = extract(answer, search || {});
  const nextField = fields.find((field) => field === "skills" ? !next.skills?.length : next[field] == null);
  if (nextField) {
    next._asked = nextField;
    return { search: next, nextQuestion: questionFor(nextField, next, language), isComplete: false };
  }

  // Determine reference coordinates for distance calculations
  let workerLat = Number.isFinite(Number(latitude)) ? Number(latitude) : null;
  let workerLon = Number.isFinite(Number(longitude)) ? Number(longitude) : null;

  if ((workerLat === null || workerLon === null) && workerId) {
    try {
      const profile = await getWorkerProfile(workerId);
      if (Number.isFinite(Number(profile?.latitude)) && Number.isFinite(Number(profile?.longitude))) {
        workerLat = Number(profile.latitude);
        workerLon = Number(profile.longitude);
      } else if (profile?.location) {
        const cityKey = profile.location.toLowerCase().trim();
        if (CITY_COORDINATES[cityKey]) {
          workerLat = CITY_COORDINATES[cityKey].latitude;
          workerLon = CITY_COORDINATES[cityKey].longitude;
        }
      }
    } catch {
      // Profile lookup is non-blocking
    }
  }

  if ((workerLat === null || workerLon === null) && (location || next.location)) {
    const locKey = String(location || next.location).toLowerCase().trim();
    if (CITY_COORDINATES[locKey]) {
      workerLat = CITY_COORDINATES[locKey].latitude;
      workerLon = CITY_COORDINATES[locKey].longitude;
    }
  }

  const { data: jobs } = await getJobs({
    open_only: true,
    unique: true,
    limit: 50,
    latitude: workerLat,
    longitude: workerLon,
    order_by: workerLat !== null && workerLon !== null ? "distance" : undefined,
  });

  const matches = jobs
    .map((job) => {
      let dist = job.distance_km;
      if (
        !Number.isFinite(dist) &&
        workerLat !== null &&
        workerLon !== null &&
        Number.isFinite(Number(job.latitude)) &&
        Number.isFinite(Number(job.longitude))
      ) {
        const raw = calculateDistanceKm(workerLat, workerLon, Number(job.latitude), Number(job.longitude));
        dist = roundedDistanceKm(raw);
      }
      const jobWithDist = { ...job, distance_km: dist };
      return scoreJob(jobWithDist, next);
    })
    .filter((match) => match.matchScore > 0);

  matches.sort((a, b) => {
    const aDist = Number.isFinite(a.job.distance_km) ? a.job.distance_km : Infinity;
    const bDist = Number.isFinite(b.job.distance_km) ? b.job.distance_km : Infinity;
    if (aDist !== bDist) return aDist - bDist; // Ascending distance (least to max distance)
    return b.matchScore - a.matchScore; // Higher suitability first when distance is equal
  });

  delete next._asked;
  return { search: next, nextQuestion: null, isComplete: true, matches };
}
