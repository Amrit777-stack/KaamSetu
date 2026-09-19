import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Languages,
  LogOut,
  MapPin,
  MessageCircle,
  Mic,
  PenLine,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  Volume2,
  X,
} from "lucide-react";
import { apiRequest } from "./services/api.js";
import {
  prefetchQuestionTranslations,
  translateQuestion,
  speakText,
  getFallbackQuestion,
} from "./services/questionSpeech.js";
import { submitVoiceResponse } from "./services/voiceResponse.js";
import { dashboardTranslations, occupationTranslations } from "./services/dashboardTranslations.js";
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

const questions = [
  ["नमस्ते! आपका नाम क्या है?", "Hello! What is your name?"],
  ["आप किस तरह का काम करते हैं?", "What kind of work do you do?"],
  ["आपको इस काम का कितना अनुभव है?", "How much experience do you have?"],
];

// Helper to get / set auth state in localStorage
function getStoredUser() {
  try {
    const raw = localStorage.getItem("kaamsetu_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  if (user) {
    localStorage.setItem("kaamsetu_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("kaamsetu_user");
  }
}

function Logo() {
  const navigate = useNavigate();
  return (
    <button className="brand" onClick={() => navigate("/")} aria-label="KaamSetu home">
      <span className="brand-mark">K</span>
      <span>KaamSetu</span>
    </button>
  );
}

function Header({ back, progress }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [currentLang, setCurrentLang] = useState(
    () => localStorage.getItem("kaamsetu_language") || "hi-IN"
  );

  useEffect(() => {
    const handleStorage = () => {
      setCurrentUser(getStoredUser());
      setCurrentLang(localStorage.getItem("kaamsetu_language") || "hi-IN");
    };
    const handleLangChange = (e) => {
      const code = e.detail || localStorage.getItem("kaamsetu_language") || "hi-IN";
      setCurrentLang(code);
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("kaamsetu_language_changed", handleLangChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("kaamsetu_language_changed", handleLangChange);
    };
  }, []);

  const handleLanguageSelect = (langCode) => {
    localStorage.setItem("kaamsetu_language", langCode);
    setCurrentLang(langCode);
    window.dispatchEvent(
      new CustomEvent("kaamsetu_language_changed", { detail: langCode })
    );
    prefetchQuestionTranslations(
      questions.map((question) => question[1]),
      langCode
    ).catch(() => {});
  };

  const handleLogout = () => {
    setStoredUser(null);
    setCurrentUser(null);
    navigate("/");
  };

  const t = dashboardTranslations[currentLang] || dashboardTranslations["en-IN"];

  return (
    <header className="app-header">
      <Logo />
      {progress && (
        <div className="progress">
          <span>Getting to know you</span>
          <div><i style={{ width: `${progress}%` }} /></div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {/* Top-right language selector tab for all 6 languages */}
        <div className="language-selector-wrap" title="Change Language / भाषा बदलें">
          <label className="language-button" htmlFor="top-language-select">
            <Languages size={16} />
            <select
              id="top-language-select"
              value={currentLang}
              onChange={(e) => handleLanguageSelect(e.target.value)}
              aria-label="Select Language"
            >
              {languages.map((l) => (
                <option key={l.languageCode} value={l.languageCode}>
                  {l.name} ({l.code})
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>

        {currentUser ? (
          <div className="header-user">
            <button
              className="user-badge"
              onClick={() => navigate(currentUser.role === "worker" ? "/worker/dashboard" : "/employer")}
              title="Go to dashboard"
            >
              <User size={15} />
              <span>{currentUser.name} ({currentUser.role === "worker" ? t.jobSeeker : "Employer"})</span>
            </button>
            <button className="logout-btn" onClick={handleLogout} title="Sign out">
              <LogOut size={16} /> Sign out
            </button>
          </div>
        ) : (
          <>
            <button className="text-button" onClick={() => navigate("/login")}>
              Sign In
            </button>
            <button className="button primary small" onClick={() => navigate("/signup")} style={{ padding: "8px 14px", fontSize: "13px" }}>
              <UserPlus size={15} /> Sign Up
            </button>
            {back && (
              <button className="text-button" onClick={() => navigate(back)}>
                <ArrowLeft size={17} /> Back
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}

function Landing() {
  const navigate = useNavigate();
  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> Work, made more human</div>
            <h1>The right work.<br /><em>In your own words.</em></h1>
            <p>KaamSetu connects skilled people with fair, nearby opportunities — in the language they are most comfortable with.</p>
            <div className="hero-actions">
              <button
                className="button primary"
                onClick={() => {
                  navigate("/login/worker");
                }}
              >
                Find work <ArrowRight size={18} />
              </button>
              <button
                className="button quiet"
                onClick={() => {
                  const user = getStoredUser();
                  if (user && user.role === "employer") {
                    navigate("/employer");
                  } else {
                    navigate("/signup?role=employer");
                  }
                }}
              >
                I’m hiring
              </button>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={18} /> Your information stays private</span>
              <span><BadgeCheck size={18} /> No English required</span>
            </div>
          </div>
          <div className="hero-visual" aria-label="A preview of a worker profile">
            <div className="sun" />
            <div className="location-pin"><MapPin size={19} /> Pune</div>
            <div className="profile-card">
              <div className="avatar">K</div>
              <div>
                <small>Skill Passport</small>
                <h3>Your Name Here <BadgeCheck size={17} /></h3>
                <p>Skilled Technician · Verified</p>
              </div>
              <div className="skill-chips">
                <span>Certified Trade</span>
                <span>Ready to Work</span>
              </div>
              <div className="profile-footer">
                <strong>92% match</strong>
                <span>Nearby opportunities</span>
              </div>
            </div>
            <div className="opportunity-card">
              <span className="opportunity-icon"><BriefcaseBusiness size={18} /></span>
              <div>
                <small>A new opportunity</small>
                <b>MIG Welder · ₹24,000/month</b>
              </div>
              <Check size={18} />
            </div>
          </div>
        </section>
        <section className="proof-strip">
          <div>
            <strong>Speak naturally</strong>
            <span>Tell us about your work</span>
          </div>
          <div>
            <strong>See what’s fair</strong>
            <span>Clear wages and job terms</span>
          </div>
          <div>
            <strong>Find your fit</strong>
            <span>Matches built around you</span>
          </div>
        </section>
      </main>
    </div>
  );
}

function ChooseRole() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const handleWorkerClick = () => {
    navigate("/login/worker");
  };

  const handleEmployerClick = () => {
    if (currentUser && currentUser.role === "employer") {
      navigate("/employer");
    } else {
      navigate("/signup?role=employer");
    }
  };

  return (
    <div className="entry-shell">
      <Header back="/" />
      <main className="entry-content">
        <span className="step-label">Step 1 of 3</span>
        <h1>How can we help today?</h1>
        <p className="entry-intro">Choose the path that feels right for you.</p>
        <div className="role-grid">
          <button className="role-option worker" onClick={handleWorkerClick}>
            <span className="role-icon"><BriefcaseBusiness size={29} /></span>
            <div>
              <h2>I’m looking for work</h2>
              <p>Build your profile and find jobs that match your skills.</p>
            </div>
            <ArrowRight size={21} />
          </button>
          <button className="role-option" onClick={handleEmployerClick}>
            <span className="role-icon employer"><Building2 size={29} /></span>
            <div>
              <h2>I’m hiring</h2>
              <p>Meet skilled, ready-to-work people near you.</p>
            </div>
            <ArrowRight size={21} />
          </button>
        </div>
        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <p className="help-line" style={{ margin: "14px 0" }}>
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} style={{ color: "var(--green)", fontWeight: "bold" }}>
              Sign In here
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}

function Language() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const targetMode = searchParams.get("mode");

  const [selected, setSelected] = useState(() => {
    const saved = localStorage.getItem("kaamsetu_language");
    return languages.find((language) => language.languageCode === saved)?.name || "हिंदी";
  });

  const chooseLanguage = (language) => {
    setSelected(language.name);
    localStorage.setItem("kaamsetu_language", language.languageCode);
    window.dispatchEvent(
      new CustomEvent("kaamsetu_language_changed", { detail: language.languageCode })
    );
    prefetchQuestionTranslations(
      questions.map((question) => question[1]),
      language.languageCode
    ).catch((error) => console.error("Question prefetch failed:", error));
  };

  const continueToOnboarding = () => {
    const language = languages.find((item) => item.name === selected) || languages[0];
    localStorage.setItem("kaamsetu_language", language.languageCode);
    window.dispatchEvent(
      new CustomEvent("kaamsetu_language_changed", { detail: language.languageCode })
    );
    prefetchQuestionTranslations(
      questions.map((question) => question[1]),
      language.languageCode
    ).catch((error) => console.error("Question prefetch failed:", error));
    navigate(targetMode ? `/onboarding?mode=${targetMode}` : "/onboarding");
  };

  return (
    <div className="entry-shell">
      <Header back="/choose-role" />
      <main className="entry-content narrow">
        <span className="step-label">Step 2 of 3</span>
        <h1>Which language feels like home?</h1>
        <p className="entry-intro">We’ll guide you through every step in this language.</p>

        <div className="language-list">
          {languages.map((language) => (
            <button
              key={language.name}
              className={`language-option ${selected === language.name ? "active" : ""}`}
              onClick={() => chooseLanguage(language)}
            >
              <span className="lang-code">{language.code}</span>
              <span>
                <b>{language.name}</b>
                <small>{language.english}</small>
              </span>
              {selected === language.name && (
                <span className="selected-check">
                  <Check size={16} />
                </span>
              )}
            </button>
          ))}
        </div>

        <button className="button primary full" onClick={continueToOnboarding}>
          Continue in {selected} <ArrowRight size={18} />
        </button>
      </main>
    </div>
  );
}

function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [mode, setMode] = useState(() => searchParams.get("mode"));
  const [step, setStep] = useState(0);
  const [listening, setListening] = useState(false);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState(["", "", ""]);
  const [translatedQuestion, setTranslatedQuestion] = useState("");
  const [translationError, setTranslationError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSubmittingSpeech, setIsSubmittingSpeech] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [recorder, setRecorder] = useState(null);

  const [preferredLanguageCode, setPreferredLanguageCode] = useState(
    () => localStorage.getItem("kaamsetu_language") || "hi-IN"
  );

  useEffect(() => {
    const handleLangChange = (e) => {
      const code = e.detail || localStorage.getItem("kaamsetu_language") || "hi-IN";
      setPreferredLanguageCode(code);
    };
    window.addEventListener("kaamsetu_language_changed", handleLangChange);
    return () => window.removeEventListener("kaamsetu_language_changed", handleLangChange);
  }, []);

  const next = (overrideAnswer = "") => {
    const newAnswers = [...answers];
    newAnswers[step] =
      overrideAnswer.trim() ||
      answer.trim() ||
      (step === 0 ? "Worker" : step === 1 ? "Technician" : "3 years");
    setAnswers(newAnswers);

    if (step < 2) {
      setStep(step + 1);
      setAnswer("");
      setTranscript("");
      setListening(false);
      setTranslatedQuestion("");
      setTranslationError("");
      setSpeechError("");
    } else {
      navigate(
        `/welcome?name=${encodeURIComponent(newAnswers[0])}&occupation=${encodeURIComponent(newAnswers[1])}`
      );
    }
  };

  useEffect(() => {
    if (mode !== "voice") return undefined;

    let ignoreResult = false;
    const englishText = questions[step][1];

    translateQuestion(englishText, preferredLanguageCode)
      .then((translation) => {
        if (!ignoreResult && translation) {
          setTranslatedQuestion(translation);
        }
      })
      .catch((error) => {
        console.warn("Question translation failed, using fallback:", error);
      });

    return () => {
      ignoreResult = true;
    };
  }, [mode, preferredLanguageCode, step]);

  const currentQuestionDisplay =
    translatedQuestion ||
    getFallbackQuestion(questions[step][1], preferredLanguageCode) ||
    questions[step][0];

  const playQuestion = async () => {
    if (!currentQuestionDisplay) return;

    try {
      setIsSpeaking(true);
      await speakText(currentQuestionDisplay, preferredLanguageCode);
    } catch (error) {
      console.error("Question TTS failed:", error);
      setSpeechError("Could not play the question. You can still answer by speaking.");
    } finally {
      setIsSpeaking(false);
    }
  };

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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        setRecorder(null);
        setIsSubmittingSpeech(true);

        try {
          const audio = new Blob(chunks, {
            type: mediaRecorder.mimeType || "audio/webm",
          });

          const record = await submitVoiceResponse(
            audio,
            ["name", "occupation", "experienceYears"][step]
          );

          const recognized = record.englishTranscript || record.transcript || "";
          setTranscript(recognized);
          setAnswer(recognized);

          // Store the recognized response immediately so the next step
          // keeps the worker's answer even before the Continue button.
          const newAnswers = [...answers];
          newAnswers[step] = recognized;
          setAnswers(newAnswers);
        } catch (error) {
          console.error("Speech recognition failed:", error);
          setSpeechError(error.message || "Speech recognition failed.");
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

  if (!mode) {
    return (
      <div className="entry-shell">
        <Header back="/language" progress={66} />
        <main className="entry-content narrow mode-page">
          <span className="step-label">Step 3 of 3</span>
          <h1>Tell us about yourself.</h1>
          <p className="entry-intro">
            Choose what feels easiest. You can switch anytime.
          </p>

          <div className="mode-options">
            <button className="mode-option featured" onClick={() => setMode("voice")}>
              <span className="mode-icon"><Mic size={28} /></span>
              <div>
                <span className="recommended">Recommended</span>
                <h2>Speak & Listen</h2>
                <p>Have a simple conversation with KaamSetu.</p>
              </div>
              <ArrowRight size={20} />
            </button>

            <button className="mode-option" onClick={() => setMode("write")}>
              <span className="mode-icon write"><PenLine size={27} /></span>
              <div>
                <h2>Write & Select</h2>
                <p>Answer a few short questions at your own pace.</p>
              </div>
              <ArrowRight size={20} />
            </button>
          </div>

          <p className="privacy-note">
            <ShieldCheck size={16} /> Your answers are only used to find better work.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="conversation-shell">
      <Header back="/onboarding" progress={66 + step * 11} />

      <main className="conversation">
        <div className="conversation-top">
          <span className="ai-orb"><Sparkles size={19} /></span>
          <div>
            <span className="speaking-label">KAAMSETU ASSISTANT</span>
            <h2>{mode === "voice" ? "Let’s have a quick chat" : "A few quick questions"}</h2>
          </div>
          <button className="close-button" onClick={() => navigate("/")}>
            <X size={19} />
          </button>
        </div>

        <div className="question-progress">
          <span className="active" />
          <span className={step > 0 ? "active" : ""} />
          <span className={step > 1 ? "active" : ""} />
        </div>

        <section className="question-card">
          <button
            className="listen-question"
            aria-label="Listen to question"
            onClick={playQuestion}
            disabled={mode === "voice" && isSpeaking}
          >
            <Volume2 size={18} />
          </button>

          <p className="hindi-question">
            {currentQuestionDisplay}
          </p>

          <p className="translation">
            {questions[step][1]}
          </p>
        </section>

        {mode === "voice" ? (
          <section className="voice-answer">
            <div className={`sound-wave ${listening ? "is-listening" : ""}`}>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => <i key={i} />)}
            </div>

            <p>
              {listening
                ? "Listening…"
                : isSubmittingSpeech
                  ? "Checking your answer…"
                  : "Tap the microphone when you’re ready"}
            </p>

            <button
              className={`mic-button ${listening ? "recording" : ""}`}
              onClick={toggleRecording}
              disabled={isSubmittingSpeech}
            >
              <Mic size={28} />
            </button>

            <small>
              {listening
                ? "Tap again when you’re done"
                : `You can speak in ${languages.find((l) => l.languageCode === preferredLanguageCode)?.english || "your selected language"}`}
            </small>

            {transcript && (
              <p className="translation">We heard: “{transcript}”</p>
            )}

            {speechError && <p className="translation">{speechError}</p>}
            {translationError && <p className="translation">{translationError}</p>}

            {transcript && (
              <button
                className="button primary response-next"
                onClick={() => next(transcript)}
              >
                Continue <ArrowRight size={17} />
              </button>
            )}

            {/* In Voice Mode: Maintain manual fill option if user wants to enter manually */}
            <div
              style={{
                marginTop: "24px",
                borderTop: "1px dashed var(--line)",
                paddingTop: "16px",
                width: "100%",
                maxWidth: "460px",
                marginLeft: "auto",
                marginRight: "auto",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: "600" }}>
                  Or enter details manually:
                </span>
                <button
                  type="button"
                  onClick={() => setMode("write")}
                  style={{
                    background: "transparent",
                    border: 0,
                    color: "var(--green)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <PenLine size={13} /> Full typing mode
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    step === 0
                      ? "e.g. Raju Kumar"
                      : step === 1
                        ? "e.g. Welder"
                        : "e.g. 4 years"
                  }
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "1px solid #cfd7cd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outlineColor: "var(--green)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && answer.trim()) {
                      next();
                    }
                  }}
                />
                <button
                  className="button primary"
                  disabled={!answer.trim()}
                  onClick={() => next()}
                  style={{ padding: "10px 18px", fontSize: "13px", whiteSpace: "nowrap" }}
                >
                  Submit
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="write-answer">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label htmlFor="response" style={{ margin: 0, fontWeight: "700", fontSize: "13px" }}>
                Your answer
              </label>
              <button
                type="button"
                onClick={() => setMode("voice")}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--green)",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Mic size={14} /> Prefer speaking? Switch to Voice
              </button>
            </div>
            <input
              id="response"
              autoFocus
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder={
                step === 0
                  ? "e.g. Raju Kumar"
                  : step === 1
                    ? "e.g. Welder"
                    : "e.g. 4 years"
              }
            />
            <button
              className="button primary full"
              disabled={!answer.trim()}
              onClick={() => next()}
            >
              Continue <ArrowRight size={17} />
            </button>
          </section>
        )}

        <p className="conversation-helper">
          <MessageCircle size={15} /> Take your time. There are no wrong answers.
        </p>
      </main>
    </div>
  );
}

function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentUser = getStoredUser();
  const userName = currentUser?.name || searchParams.get("name") || "Friend";
  const userOccupation = currentUser?.occupation || searchParams.get("occupation") || "Skilled Specialist";

  return (
    <div className="entry-shell">
      <Header />
      <main className="entry-content narrow success-page">
        <span className="success-icon"><Check size={35} /></span>
        <span className="step-label">YOU’RE ALL SET</span>
        <h1>Thank you, {userName}.</h1>
        <p className="entry-intro">
          We’ve built your Skill Passport for <strong>{userOccupation}</strong> and matching you with fair, nearby jobs.
        </p>
        <button
          className="button primary full"
          onClick={() => navigate(currentUser ? "/worker/dashboard" : `/signup?role=worker&name=${encodeURIComponent(userName)}`)}
        >
          {currentUser ? "See your matches & applications" : "Create account to activate Skill Passport"} <ArrowRight size={18} />
        </button>
      </main>
    </div>
  );
}

/**
 * AUTH COMPONENT: Unified Sign In & Sign Up with Role Isolation
 */
function Auth({ initialMode = "login", initialRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [role, setRole] = useState(
    initialRole ||
    (location.pathname === "/login/employer" ? "employer" : null) ||
    searchParams.get("role") ||
    "worker"
  ); // "worker" | "employer"
  const [name, setName] = useState(searchParams.get("name") || "");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);



  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (mode === "login" && role === "worker") {
      if (!mobile.trim() || !password.trim()) {
        setError("Please enter both mobile number and password");
        return;
      }
      setStoredUser({
        id: "demo-worker",
        name: "Raju Kumar",
        mobile: mobile.trim(),
        role: "worker",
        occupation: "Welder",
        location: "Pune",
      });
      navigate("/worker/dashboard");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const res = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password, expectedRole: role }),
        });
        setStoredUser(res.user);
        if (res.user.role === "worker") {
          navigate("/language");
        } else {
          navigate("/employer");
        }
      } else {
        // Sign Up (Register)
        const res = await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            password,
            role,
            occupation: "Skilled Specialist",
            experienceYears: 2,
            location: "India",
            companyName: role === "employer" ? (companyName || `${name}'s Company`) : null,
          }),
        });
        setStoredUser(res.user);
        if (res.user.role === "worker") {
          navigate("/language");
        } else {
          navigate("/employer");
        }
      }
    } catch (err) {
      if (err.status === 404 || err.message === "No account found" || (err.message && err.message.includes("404"))) {
        setError("No account found");
      } else {
        setError(err.message || "Operation failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (fillVal, fillRole) => {
    if (fillRole === "worker") {
      setMobile(fillVal);
      setPassword("abc123");
    } else {
      setEmail(fillVal);
      setPassword("password123");
    }
    setError(null);
    if (fillRole) setRole(fillRole);
  };

  return (
    <div className="site-shell">
      <Header back="/" />
      <main className="auth-shell">
        <div className="auth-card">
          {/* Mode Switcher: Sign In vs Create Account */}
          <div className="auth-mode-toggle">
            <button
              className={`mode-toggle-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => { setMode("login"); setError(null); }}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`mode-toggle-btn ${mode === "signup" ? "active" : ""}`}
              onClick={() => { setMode("signup"); setError(null); }}
              type="button"
            >
              Create Account
            </button>
          </div>

          {/* Role Tabs */}
          <div className="role-tabs">
            <button
              className={`role-tab ${role === "worker" ? "active" : ""}`}
              onClick={() => { setRole("worker"); setError(null); }}
              type="button"
            >
              <BriefcaseBusiness size={16} /> Job Seeker (Worker)
            </button>
            <button
              className={`role-tab ${role === "employer" ? "active" : ""}`}
              onClick={() => { setRole("employer"); setError(null); }}
              type="button"
            >
              <Building2 size={16} /> Hiring (Employer)
            </button>
          </div>

          <div className="auth-header">
            <h2>
              {mode === "login"
                ? role === "worker" ? "Worker Login" : "Employer Sign In"
                : role === "worker" ? "Join as a Job Seeker" : "Register as an Employer"}
            </h2>
            <p>
              {mode === "login"
                ? role === "worker"
                  ? "Sign in to see the jobs you applied for and track status."
                  : "Sign in to review candidates and manage your job posts."
                : role === "worker"
                  ? "Create your personal Skill Passport and get discovered for fair work."
                  : "Post jobs and connect directly with skilled local talent."}
            </p>
          </div>

          {error && (
            <div className="banner error" style={{ marginBottom: "20px" }}>
              <AlertCircle size={20} />
              <div>
                <strong>Notice</strong>
                <span style={{ fontSize: "15px", fontWeight: "600" }}>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder={role === "worker" ? "e.g. Sunil Sharma" : "e.g. Pooja Patel"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            {mode === "login" && role === "worker" ? (
              <div className="form-group">
                <label htmlFor="mobile">Mobile Number</label>
                <input
                  id="mobile"
                  type="tel"
                  required
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder={role === "worker" ? "your.email@example.com" : "contact@company.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                placeholder={mode === "login" && role === "worker" ? "Enter your password" : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === "signup" && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {/* Additional Fields for Sign Up: Only Company for Employers */}
            {mode === "signup" && role === "employer" && (
              <div className="form-group">
                <label htmlFor="company">Company / Business Name</label>
                <input
                  id="company"
                  type="text"
                  required
                  placeholder="e.g. Apex Industrial Works"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            )}

            <button className="button primary full" type="submit" disabled={loading}>
              {loading
                ? "Processing..."
                : mode === "login"
                  ? role === "worker"
                    ? "Login"
                    : "Sign in as Employer"
                  : `Create ${role === "worker" ? "Worker" : "Employer"} Account`} <ArrowRight size={17} />
            </button>
          </form>

          {/* Quick-Fill Chips for Testing Login */}
          {mode === "login" && (
            <div className="quick-fill-section">
              <span className="quick-fill-label">⚡ One-Click Test Accounts</span>
              {role === "worker" ? (
                <div className="chip-group">
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => fillCredentials("9876543210", "worker")}
                  >
                    <Check size={13} /> Raju Kumar (9876543210)
                  </button>
                </div>
              ) : (
                <div className="chip-group">
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => fillCredentials("amit@pragati.example.test", "employer")}
                  >
                    <Check size={13} /> Amit Shah (Valid Employer)
                  </button>
                  <button
                    type="button"
                    className="quick-chip warning"
                    onClick={() => fillCredentials("raju@example.test", "employer")}
                    title="Worker email in employer login"
                  >
                    <X size={13} /> Raju Kumar (Worker &rarr; Fails)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * WORKER DASHBOARD: "Post new oppurtunity" + "See your progress"
 */
function WorkerDashboard() {
  const navigate = useNavigate();
  const [currentUser] = useState(() => getStoredUser() || {
    name: "Raju Kumar",
    occupation: "Welder",
    location: "Pune",
    role: "worker",
  });
  const [activeTab, setActiveTab] = useState("post"); // "post" | "progress"
  const [currentLang, setCurrentLang] = useState(
    () => localStorage.getItem("kaamsetu_language") || "hi-IN"
  );

  useEffect(() => {
    const handleLangChange = (e) => {
      const code = e.detail || localStorage.getItem("kaamsetu_language") || "hi-IN";
      setCurrentLang(code);
    };
    window.addEventListener("kaamsetu_language_changed", handleLangChange);
    return () => window.removeEventListener("kaamsetu_language_changed", handleLangChange);
  }, []);

  const t = dashboardTranslations[currentLang] || dashboardTranslations["en-IN"];

  const localizedOccupation =
    occupationTranslations[currentLang]?.[currentUser.occupation] ||
    currentUser.occupation ||
    "Welder";

  const localizedCity =
    currentLang === "hi-IN"
      ? "पुणे"
      : currentLang === "ta-IN"
        ? "புனே"
        : currentLang === "te-IN"
          ? "పుణె"
          : currentLang === "mr-IN"
            ? "पुणे"
            : currentLang === "kn-IN"
              ? "ಪುಣೆ"
              : "Pune";

  return (
    <div className="site-shell">
      <Header back="/" />
      <main className="dashboard-shell">
        {/* Profile Card */}
        <div className="worker-profile-card">
          <div className="worker-profile-left">
            <div className="worker-avatar-large">{currentUser.name ? currentUser.name[0] : "W"}</div>
            <div className="worker-details">
              <h2>
                {currentUser.name || "Raju Kumar"}{" "}
                <BadgeCheck size={20} style={{ color: "var(--green)", verticalAlign: "middle" }} />
              </h2>
              <p>
                {localizedOccupation} · {localizedCity}
              </p>
            </div>
          </div>
          <div>
            <span className="badge badge-applied" style={{ padding: "8px 16px", fontSize: "13px" }}>
              <CheckCircle2 size={16} /> {t.availableForWork}
            </span>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="dashboard-tabs">
          <button
            className={`dash-tab ${activeTab === "post" ? "active" : ""}`}
            onClick={() => setActiveTab("post")}
          >
            <PlusCircle size={18} /> {t.postTab}
          </button>
          <button
            className={`dash-tab ${activeTab === "progress" ? "active" : ""}`}
            onClick={() => setActiveTab("progress")}
          >
            <BriefcaseBusiness size={18} /> {t.progressTab}
          </button>
        </div>

        {activeTab === "post" ? (
          /* TAB 1: Post new oppurtunity */
          <div
            className="post-opportunity-panel"
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              padding: "36px 28px",
              textAlign: "center",
              boxShadow: "0 4px 20px #122c1b05",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "#eaf0dd",
                color: "var(--green)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 16px",
              }}
            >
              <Mic size={34} />
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#f0f5ea",
                color: "var(--green)",
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "700",
                marginBottom: "12px",
              }}
            >
              <Sparkles size={14} /> {t.voiceBadge}
            </div>

            <h2 style={{ fontSize: "24px", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
              {t.postHeading}
            </h2>
            <p
              style={{
                color: "var(--muted)",
                maxWidth: "540px",
                margin: "0 auto 26px",
                fontSize: "15px",
                lineHeight: "1.6",
              }}
            >
              {t.postDesc}
            </p>

            {/* BOTH Speech and Manual Fill Options */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "16px",
                maxWidth: "640px",
                margin: "0 auto 30px",
                textAlign: "left",
              }}
            >
              <button
                className="mode-option featured"
                onClick={() => navigate("/onboarding?mode=voice")}
                style={{ cursor: "pointer", border: "2px solid var(--green)", padding: "18px" }}
              >
                <span className="mode-icon"><Mic size={26} /></span>
                <div>
                  <span className="recommended">Recommended</span>
                  <h3 style={{ margin: "4px 0 6px", fontSize: "16px" }}>{t.speakBtn}</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>{t.speakSub}</p>
                </div>
                <ArrowRight size={18} />
              </button>

              <button
                className="mode-option"
                onClick={() => navigate("/onboarding?mode=write")}
                style={{ cursor: "pointer", padding: "18px" }}
              >
                <span className="mode-icon write"><PenLine size={26} /></span>
                <div>
                  <h3 style={{ margin: "4px 0 6px", fontSize: "16px" }}>{t.writeBtn}</h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>{t.writeSub}</p>
                </div>
                <ArrowRight size={18} />
              </button>
            </div>

            <div
              className="proof-strip"
              style={{
                maxWidth: "600px",
                margin: "0 auto",
                padding: "18px 0 0",
                borderTop: "1px solid var(--line)",
              }}
            >
              <div>
                <strong>{t.speakFeatureTitle}</strong>
                <span>{t.speakFeatureSub}</span>
              </div>
              <div>
                <strong>{t.instantExtractionTitle}</strong>
                <span>{t.instantExtractionSub}</span>
              </div>
              <div>
                <strong>{t.fairOppsTitle}</strong>
                <span>{t.fairOppsSub}</span>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: See your progress */
          <div>
            {/* Top stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "14px",
                marginBottom: "22px",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                }}
              >
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {t.passportStatus}
                </span>
                <h3
                  style={{
                    margin: "4px 0 0",
                    color: "var(--green)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <CheckCircle2 size={18} /> {t.activeVerified}
                </h3>
              </div>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                }}
              >
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {t.matchedOpps}
                </span>
                <h3 style={{ margin: "4px 0 0" }}>{t.trackedCount}</h3>
              </div>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: "10px",
                  padding: "16px 20px",
                }}
              >
                <span
                  style={{
                    color: "var(--muted)",
                    fontSize: "12px",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  {t.topMatchRate}
                </span>
                <h3 style={{ margin: "4px 0 0", color: "var(--green)" }}>{t.fitRate}</h3>
              </div>
            </div>

            {/* Application Progress Cards */}
            <div className="candidate-grid">
              {t.apps.map((app, idx) => {
                const isShortlisted = idx === 0;
                const isUnderReview = idx === 2;
                const statusLabel = isShortlisted
                  ? t.statusShortlisted
                  : isUnderReview
                    ? t.statusUnderReview
                    : t.statusApplied;
                const statusClass = isShortlisted
                  ? "shortlisted"
                  : isUnderReview
                    ? "under_review"
                    : "applied";

                return (
                  <div key={idx} className={`app-card ${isShortlisted ? "is-hired" : ""}`}>
                    <div className="app-card-left">
                      <div className="app-avatar">
                        <BriefcaseBusiness size={20} />
                      </div>
                      <div className="app-info">
                        <h3>{app.jobTitle}</h3>
                        <div className="app-meta">
                          <span>
                            <Building2 size={14} /> <strong>{app.company}</strong>
                          </span>
                          <span>
                            <MapPin size={14} /> {app.location}
                          </span>
                          <span>💰 {app.salary}</span>
                        </div>
                        <p
                          style={{
                            color: isShortlisted ? "var(--green)" : "var(--muted)",
                            fontSize: "13px",
                            margin: "6px 0 0",
                            fontWeight: isShortlisted ? "600" : "normal",
                          }}
                        >
                          {isShortlisted ? "🎉 " : "ℹ️ "}
                          {app.note}
                        </p>
                      </div>
                    </div>

                    <div className="app-card-right">
                      <span className={`badge badge-${statusClass}`}>
                        {isShortlisted && <BadgeCheck size={14} />}
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * EMPLOYER DASHBOARD: "What I Am Hiring For" + Post New Job + Candidate Review
 */
function Employer() {
  const navigate = useNavigate();
  const [currentUser] = useState(getStoredUser);
  const [activeTab, setActiveTab] = useState("jobs"); // "jobs" | "candidates"
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostJob, setShowPostJob] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [banner, setBanner] = useState(null);

  // New Job Form State
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobSalaryMin, setJobSalaryMin] = useState(22000);
  const [jobSalaryMax, setJobSalaryMax] = useState(28000);
  const [jobOpenings, setJobOpenings] = useState(2);
  const [jobExp, setJobExp] = useState(2);

  const employerId = currentUser?.role === "employer" ? currentUser.profileId : 1;

  const loadData = async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const [jobsRes, appsRes] = await Promise.all([
        apiRequest(`/jobs?employer_id=${employerId}`),
        apiRequest("/applications"),
      ]);
      setJobs(jobsRes.data || []);
      setApplications(appsRes.data || []);
    } catch (err) {
      setBanner({ type: "error", title: "Error loading data", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      navigate("/login?role=employer");
      return undefined;
    }
    if (user.role !== "employer") {
      navigate("/worker/dashboard");
      return undefined;
    }

    let isMounted = true;
    Promise.all([
      apiRequest(`/jobs?employer_id=${employerId}`),
      apiRequest("/applications"),
    ])
      .then(([jobsRes, appsRes]) => {
        if (!isMounted) return;
        setJobs(jobsRes.data || []);
        setApplications(appsRes.data || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setBanner({ type: "error", title: "Error loading data", message: err.message });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [employerId, navigate]);

  const handleHire = async (app) => {
    try {
      setActionLoading(app.id);
      const res = await apiRequest(`/applications/${app.id}/hire`, { method: "POST" });
      setBanner({
        type: "success",
        title: `Candidate Hired: ${app.worker_name}!`,
        message: `${app.worker_name} is hired for "${app.job_title}". ${res.withdrawnCount > 0 ? `${res.withdrawnCount} other open application(s) for this candidate were automatically withdrawn!` : "Worker availability set to unavailable."}`,
      });
      await loadData();
    } catch (err) {
      setBanner({ type: "error", title: "Action Failed", message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    try {
      await apiRequest("/jobs", {
        method: "POST",
        body: JSON.stringify({
          employerId: currentUser.profileId,
          companyName: currentUser.companyName,
          title: jobTitle,
          description: jobDesc,
          location: currentUser.location || "Pune",
          salaryMin: jobSalaryMin,
          salaryMax: jobSalaryMax,
          requiredExperience: jobExp,
          openings: jobOpenings,
        }),
      });

      setBanner({
        type: "success",
        title: "Job Posted!",
        message: `"${jobTitle}" has been posted with ${jobOpenings} openings. Candidates can now apply!`,
      });

      setJobTitle("");
      setJobDesc("");
      setShowPostJob(false);
      await loadData();
    } catch (err) {
      setBanner({ type: "error", title: "Failed to post job", message: err.message });
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      await apiRequest("/applications/reset", { method: "POST" });
      setBanner({
        type: "info",
        title: "Demo Data Reset",
        message: "Application records restored to initial state.",
      });
      await loadData();
    } catch (err) {
      setBanner({ type: "error", title: "Reset Failed", message: err.message });
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="site-shell">
      <Header back="/" />
      <main className="dashboard-shell">
        <div className="dashboard-topbar">
          <div>
            <span className="step-label">EMPLOYER PORTAL</span>
            <h1>{currentUser.companyName || "Employer Dashboard"}</h1>
            <p>Welcome back, <strong>{currentUser.name}</strong> · Location: {currentUser.location || "Pune"}</p>
          </div>
          <div className="dashboard-actions">
            <button
              className="button primary small"
              onClick={() => setShowPostJob(!showPostJob)}
            >
              <PlusCircle size={15} /> {showPostJob ? "Cancel" : "Post a Job"}
            </button>
            <button className="button secondary small" onClick={handleReset} title="Reset demo application records">
              <RotateCcw size={15} /> Reset Demo
            </button>
          </div>
        </div>

        {banner && (
          <div className={`banner ${banner.type}`}>
            {banner.type === "success" && <CheckCircle2 size={22} />}
            {banner.type === "error" && <AlertCircle size={22} />}
            {banner.type === "info" && <Sparkles size={22} />}
            <div>
              <strong>{banner.title}</strong>
              <span>{banner.message}</span>
            </div>
          </div>
        )}

        {/* Post a Job Form Modal / Inline Box */}
        {showPostJob && (
          <div className="post-job-card">
            <h3>Post a New Job Vacancy</h3>
            <p>Fill out the job details to publish it to skilled candidates.</p>
            <form onSubmit={handleCreateJob}>
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Industrial Pipe Welder, Solar Electrician"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  required
                  placeholder="Brief description of work and tools used"
                  value={jobDesc}
                  onChange={(e) => setJobDesc(e.target.value)}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Salary Min (₹/month)</label>
                  <input
                    type="number"
                    value={jobSalaryMin}
                    onChange={(e) => setJobSalaryMin(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Salary Max (₹/month)</label>
                  <input
                    type="number"
                    value={jobSalaryMax}
                    onChange={(e) => setJobSalaryMax(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Openings Count</label>
                  <input
                    type="number"
                    min="1"
                    value={jobOpenings}
                    onChange={(e) => setJobOpenings(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Required Experience (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={jobExp}
                    onChange={(e) => setJobExp(e.target.value)}
                  />
                </div>
              </div>
              <button className="button primary" type="submit">
                Publish Job Opening <ArrowRight size={16} />
              </button>
            </form>
          </div>
        )}

        {/* Dashboard Navigation Tabs */}
        <div className="dashboard-tabs">
          <button
            className={`dash-tab ${activeTab === "jobs" ? "active" : ""}`}
            onClick={() => setActiveTab("jobs")}
          >
            <BriefcaseBusiness size={18} /> What I Am Hiring For ({jobs.length} Openings)
          </button>
          <button
            className={`dash-tab ${activeTab === "candidates" ? "active" : ""}`}
            onClick={() => setActiveTab("candidates")}
          >
            <User size={18} /> Candidate Applications ({applications.length})
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Loading portal data...</div>
        ) : activeTab === "jobs" ? (
          /* TAB 1: What I am hiring for */
          <div>
            {jobs.length === 0 ? (
              <div className="empty-state">No job posts found for your company. Click "+ Post a Job" above to create one!</div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="job-card">
                  <div className="job-card-header">
                    <div>
                      <h3>{job.title}</h3>
                      <p>{job.description}</p>
                    </div>
                    <span className="badge badge-applied" style={{ fontSize: "13px" }}>
                      {job.openings > 0 ? `${job.openings} Openings Remaining` : "Filled"}
                    </span>
                  </div>
                  <div className="job-tags">
                    <span className="tag">📍 {job.location}</span>
                    <span className="tag">💰 ₹{job.salary_min?.toLocaleString()} - ₹{job.salary_max?.toLocaleString()}/mo</span>
                    <span className="tag">⏱️ {job.shift || "day"} shift</span>
                    <span className="tag">🛠️ {job.required_experience} yrs min exp</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* TAB 2: Candidate Applications */
          <div className="candidate-grid">
            {applications.map((app) => {
              const isHired = app.status === "hired";
              const isWithdrawn = app.status === "withdrawn";
              const canHire = ["applied", "shortlisted"].includes(app.status);

              return (
                <div
                  key={app.id}
                  className={`app-card ${isHired ? "is-hired" : ""} ${isWithdrawn ? "is-withdrawn" : ""}`}
                >
                  <div className="app-card-left">
                    <div className="app-avatar">{app.worker_name ? app.worker_name[0] : "W"}</div>
                    <div className="app-info">
                      <h3>
                        {app.worker_name}
                        {app.is_available !== false ? (
                          <span className="availability-pill avail">Available</span>
                        ) : (
                          <span className="availability-pill unavail">Unavailable / Employed</span>
                        )}
                      </h3>
                      <div className="app-meta">
                        <span><BriefcaseBusiness size={14} /> Applied for: <strong>{app.job_title}</strong></span>
                        <span><Building2 size={14} /> {app.company_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="app-card-right">
                    <span className={`badge badge-${app.status}`}>
                      {isHired && <BadgeCheck size={14} />}
                      {isWithdrawn && <X size={14} />}
                      {app.status === "withdrawn" ? "Withdrawn (Hired elsewhere)" : app.status}
                    </span>

                    {canHire ? (
                      <button
                        className="button primary small"
                        disabled={actionLoading === app.id}
                        onClick={() => handleHire(app)}
                      >
                        {actionLoading === app.id ? "Processing..." : "Hire Candidate"}
                      </button>
                    ) : (
                      <button className="button quiet small" disabled>
                        {isHired ? "Hired" : "Withdrawn"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function App() {
  const path = useLocation().pathname;
  if (path === "/choose-role") return <ChooseRole />;
  if (path === "/language") return <Language />;
  if (path === "/onboarding") return <Onboarding />;
  if (path === "/employer") return <Employer />;
  if (path === "/welcome") return <Welcome />;
  if (path === "/signup") return <Auth key="signup" initialMode="signup" />;
  if (path === "/login/worker") return <Auth key="login-worker" initialMode="login" initialRole="worker" />;
  if (path === "/login/employer") return <Auth key="login-employer" initialMode="login" initialRole="employer" />;
  if (path === "/login") return <Auth key="login" initialMode="login" initialRole="worker" />;
  if (path === "/worker/dashboard") return <WorkerDashboard />;
  return <Landing />;
}

export default App;
