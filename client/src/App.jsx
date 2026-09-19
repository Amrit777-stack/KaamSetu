import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, Building2, Check, ChevronDown, CircleHelp, Languages, MapPin, MessageCircle, Mic, PenLine, ShieldCheck, Sparkles, Volume2, X } from "lucide-react";
import { prefetchQuestionTranslations, speakText, translateQuestion } from "./services/questionSpeech";
import { submitVoiceResponse } from "./services/voiceResponse";
import { getUiTranslations, uiCopy } from "./services/uiTranslations";
import "./App.css";
import "./LanguageSelect.css";

const languages = [
  { name: "हिंदी", english: "Hindi", code: "HI", languageCode: "hi-IN" },
  { name: "English", english: "English", code: "EN", languageCode: "en-IN" },
  { name: "தமிழ்", english: "Tamil", code: "TA", languageCode: "ta-IN" },
  { name: "తెలుగు", english: "Telugu", code: "TE", languageCode: "te-IN" },
  { name: "ಕನ್ನಡ", english: "Kannada", code: "KN", languageCode: "kn-IN" },
  { name: "मराठी", english: "Marathi", code: "MR", languageCode: "mr-IN" },
];
const questions = ["What is your name?", "What kind of work do you do?", "How much experience do you have?"];
const responseFields = ["name", "occupation", "experienceYears"];

function Logo() { const navigate = useNavigate(); return <button className="brand" onClick={() => navigate("/")} aria-label="KaamSetu home"><span className="brand-mark">K</span><span>KaamSetu</span></button>; }
function Header({ back, progress, languageCode, onLanguageChange }) { const navigate = useNavigate(); return <header className="app-header"><Logo />{progress && <div className="progress"><span>Getting to know you</span><div><i style={{ width: `${progress}%` }} /></div></div>}{back ? <button className="text-button" onClick={() => navigate(back)}><ArrowLeft size={17} /> Back</button> : <label className="language-button"><Languages size={17} /><select value={languageCode} onChange={(event) => onLanguageChange(event.target.value)} aria-label="Site language">{languages.map((language) => <option key={language.languageCode} value={language.languageCode}>{language.english}</option>)}</select><ChevronDown size={15} /></label>}</header>; }

function Landing({ languageCode, onLanguageChange, labels }) { const navigate = useNavigate(); return <div className="site-shell"><Header languageCode={languageCode} onLanguageChange={onLanguageChange} /><main><section className="hero-section"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15} /> Work, made more human</div><h1>The right work.<br /><em>In your own words.</em></h1><p>KaamSetu connects skilled people with fair, nearby opportunities — in the language they are most comfortable with.</p><div className="hero-actions"><button className="button primary" onClick={() => navigate("/choose-role")}>{labels.findWork} <ArrowRight size={18} /></button><button className="button quiet" onClick={() => navigate("/employer")}>{labels.hiring}</button></div><div className="trust-row"><span><ShieldCheck size={18} /> Your information stays private</span><span><BadgeCheck size={18} /> No English required</span></div></div><div className="hero-visual" aria-label="A preview of a worker profile"><div className="sun" /><div className="location-pin"><MapPin size={19} /> Pune</div><div className="profile-card"><div className="avatar">R</div><div><small>Skill Passport</small><h3>Raju Kumar <BadgeCheck size={17} /></h3><p>Welder · 4 years experience</p></div><div className="skill-chips"><span>Welding</span><span>Fabrication</span></div><div className="profile-footer"><strong>92% match</strong><span>3 good jobs nearby</span></div></div><div className="opportunity-card"><span className="opportunity-icon"><BriefcaseBusiness size={18} /></span><div><small>A new opportunity</small><b>MIG Welder · ₹24,000/month</b></div><Check size={18} /></div></div></section><section className="proof-strip"><div><strong>Speak naturally</strong><span>Tell us about your work</span></div><div><strong>See what’s fair</strong><span>Clear wages and job terms</span></div><div><strong>Find your fit</strong><span>Matches built around you</span></div></section></main></div>; }

function ChooseRole({ labels }) { const navigate = useNavigate(); return <div className="entry-shell"><Header back="/" /><main className="entry-content"><span className="step-label">Step 1 of 3</span><h1>How can we help today?</h1><p className="entry-intro">Choose the path that feels right for you.</p><div className="role-grid"><button className="role-option worker" onClick={() => navigate("/language")}><span className="role-icon"><BriefcaseBusiness size={29} /></span><div><h2>{labels.lookingForWork}</h2><p>Build your profile and find jobs that match your skills.</p></div><ArrowRight size={21} /></button><button className="role-option" onClick={() => navigate("/employer")}><span className="role-icon employer"><Building2 size={29} /></span><div><h2>{labels.hiring}</h2><p>Meet skilled, ready-to-work people near you.</p></div><ArrowRight size={21} /></button></div><p className="help-line"><CircleHelp size={16} /> Need help getting started? <button>Call us</button></p></main></div>; }
function Language({ onLanguageSelect }) { const navigate = useNavigate(); const [selected, setSelected] = useState("हिंदी"); const prefetchLanguage = (language) => prefetchQuestionTranslations(questions, language.languageCode).catch((error) => console.error("Question prefetch failed:", error)); const chooseLanguage = (language) => { setSelected(language.name); onLanguageSelect(language.languageCode); prefetchLanguage(language); }; const chosenLanguage = languages.find((language) => language.name === selected); return <div className="entry-shell"><Header back="/choose-role" /><main className="entry-content narrow"><span className="step-label">Step 2 of 3</span><h1>Which language feels like home?</h1><p className="entry-intro">We’ll guide you through every step in this language.</p><div className="language-list">{languages.map((language) => <button key={language.name} className={`language-option ${selected === language.name ? "active" : ""}`} onClick={() => chooseLanguage(language)}><span className="lang-code">{language.code}</span><span><b>{language.name}</b><small>{language.english}</small></span>{selected === language.name && <span className="selected-check"><Check size={16} /></span>}</button>)}</div><button className="button primary full" onClick={() => { onLanguageSelect(chosenLanguage.languageCode); prefetchLanguage(chosenLanguage); navigate("/onboarding"); }}>Continue in {selected} <ArrowRight size={18} /></button></main></div>; }

function Onboarding({ preferredLanguageCode }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [answer, setAnswer] = useState("");
  const [translatedQuestion, setTranslatedQuestion] = useState("");
  const [translationError, setTranslationError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSubmittingSpeech, setIsSubmittingSpeech] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [recorder, setRecorder] = useState(null);
  const isTranslating = mode === "voice" && !translatedQuestion && !translationError;
  const next = () => { if (step < 2) { setStep(step + 1); setAnswer(""); setListening(false); setTranslatedQuestion(""); setTranslationError(""); setTranscript(""); setSpeechError(""); } else navigate("/welcome"); };
  useEffect(() => {
    if (mode !== "voice") return undefined;
    let ignoreResult = false;
    translateQuestion(questions[step], preferredLanguageCode)
      .then((translation) => { if (!ignoreResult) setTranslatedQuestion(translation); })
      .catch((error) => { if (!ignoreResult) { console.error("Question translation failed:", error); setTranslationError("Translation could not be completed. Please try the next question."); } });
    return () => { ignoreResult = true; };
  }, [mode, preferredLanguageCode, step]);
  const playQuestion = async () => { try { setIsSpeaking(true); await speakText(translatedQuestion, preferredLanguageCode); } catch (error) { console.error("Question TTS failed:", error); } finally { setIsSpeaking(false); } };
  const toggleRecording = async () => {
    if (listening && recorder) {
      recorder.stop();
      return;
    }

    try {
      setSpeechError("");
      setTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        setRecorder(null);
        setIsSubmittingSpeech(true);
        try {
          const audio = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
          const record = await submitVoiceResponse(audio, responseFields[step]);
          setTranscript(record.englishTranscript);
        } catch (error) {
          console.error("Speech recognition failed:", error);
          setSpeechError(error.message);
        } finally {
          setIsSubmittingSpeech(false);
        }
      };
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setListening(true);
    } catch (error) {
      console.error("Microphone access failed:", error);
      setSpeechError("Please allow microphone access to record your answer.");
    }
  };
  if (!mode) return <div className="entry-shell"><Header back="/language" progress={66} /><main className="entry-content narrow mode-page"><span className="step-label">Step 3 of 3</span><h1>Tell us about yourself.</h1><p className="entry-intro">Choose what feels easiest. You can switch anytime.</p><div className="mode-options"><button className="mode-option featured" onClick={() => setMode("voice")}><span className="mode-icon"><Mic size={28} /></span><div><span className="recommended">Recommended</span><h2>Speak & Listen</h2><p>Have a simple conversation with KaamSetu.</p></div><ArrowRight size={20} /></button><button className="mode-option" onClick={() => setMode("write")}><span className="mode-icon write"><PenLine size={27} /></span><div><h2>Write & Select</h2><p>Answer a few short questions at your own pace.</p></div><ArrowRight size={20} /></button></div><p className="privacy-note"><ShieldCheck size={16} /> Your answers are only used to find better work.</p></main></div>;
  return <div className="conversation-shell"><Header back="/onboarding" progress={66 + step * 11} /><main className="conversation"><div className="conversation-top"><span className="ai-orb"><Sparkles size={19} /></span><div><span className="speaking-label">KAAMSETU ASSISTANT</span><h2>{mode === "voice" ? "Let’s have a quick chat" : "A few quick questions"}</h2></div><button className="close-button" onClick={() => navigate("/")}><X size={19} /></button></div><div className="question-progress"><span className="active" /><span className={step > 0 ? "active" : ""} /><span className={step > 1 ? "active" : ""} /></div><section className="question-card"><button className="listen-question" aria-label="Listen to question" onClick={playQuestion} disabled={isTranslating || isSpeaking || !translatedQuestion}><Volume2 size={18} /></button><p className="hindi-question">{isTranslating ? "Translating…" : translatedQuestion || questions[step]}</p><p className="translation">{translatedQuestion ? questions[step] : translationError || "Preparing your question in the selected language."}</p></section>{mode === "voice" ? <section className="voice-answer"><div className={`sound-wave ${listening ? "is-listening" : ""}`}>{[1,2,3,4,5,6,7].map((i) => <i key={i} />)}</div><p>{listening ? "Listening…" : isSubmittingSpeech ? "Checking your answer…" : "Tap the microphone when you’re ready"}</p><button className={`mic-button ${listening ? "recording" : ""}`} onClick={toggleRecording} disabled={isSubmittingSpeech}><Mic size={28} /></button><small>{listening ? "Tap again when you’re done" : "You can speak in your selected language"}</small>{transcript && <p className="translation">We heard: “{transcript}”</p>}{speechError && <p className="translation">{speechError}</p>}{transcript && <button className="button primary response-next" onClick={next}>Continue <ArrowRight size={17} /></button>}</section> : <section className="write-answer"><label htmlFor="response">Your answer</label><input id="response" autoFocus value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={step === 0 ? "e.g. Raju Kumar" : step === 1 ? "e.g. Welder" : "e.g. 4 years"} /><button className="button primary full" disabled={!answer.trim()} onClick={next}>Continue <ArrowRight size={17} /></button></section>}<p className="conversation-helper"><MessageCircle size={15} /> Take your time. There are no wrong answers.</p></main></div>;
}
function Employer() { const navigate = useNavigate(); return <div className="entry-shell"><Header back="/choose-role" /><main className="entry-content narrow employer-page"><span className="step-label">FOR EMPLOYERS</span><h1>Find people ready to work.</h1><p className="entry-intro">A simpler way to meet skilled local talent — with profiles built around real experience.</p><div className="employer-preview"><BadgeCheck size={27} /><div><b>Candidate profiles that tell the full story</b><span>Skills, availability, experience and wage expectations.</span></div></div><button className="button primary full" onClick={() => navigate("/")}>Explore employer access <ArrowRight size={18} /></button></main></div>; }
function Welcome() { const navigate = useNavigate(); return <div className="entry-shell"><Header /><main className="entry-content narrow success-page"><span className="success-icon"><Check size={35} /></span><span className="step-label">YOU’RE ALL SET</span><h1>Thank you, Raju.</h1><p className="entry-intro">We’re building your Skill Passport and looking for opportunities that fit.</p><button className="button primary full" onClick={() => navigate("/")}>See your matches <ArrowRight size={18} /></button></main></div>; }
function App() {
  const path = useLocation().pathname;
  const [preferredLanguageCode, setPreferredLanguageCode] = useState("en-IN");
  const [labels, setLabels] = useState(uiCopy);

  useEffect(() => {
    let ignoreResult = false;
    getUiTranslations(preferredLanguageCode)
      .then((translations) => { if (!ignoreResult) setLabels(translations); })
      .catch((error) => console.error("Site translation failed:", error));
    return () => { ignoreResult = true; };
  }, [preferredLanguageCode]);

  if (path === "/choose-role") return <ChooseRole labels={labels} />;
  if (path === "/language") return <Language onLanguageSelect={setPreferredLanguageCode} />;
  if (path === "/onboarding") return <Onboarding preferredLanguageCode={preferredLanguageCode} />;
  if (path === "/employer") return <Employer />;
  if (path === "/welcome") return <Welcome />;
  return <Landing languageCode={preferredLanguageCode} onLanguageChange={setPreferredLanguageCode} labels={labels} />;
}
export default App;
