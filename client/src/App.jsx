import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  Edit2,
  Info,
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
  Trash2,
  User,
  UserPlus,
  Volume2,
  X,
} from "lucide-react";
import { apiRequest } from "./services/api.js";
import {
  captureAndSaveWorkerLocation,
  calculateDistanceKm,
  KNOWN_CITY_COORDINATES,
  resolveCity,
  getCityCoordinates,
} from "./services/workerLocation.js";
import {
  prefetchQuestionTranslations,
  translateQuestion,
  speakText,
  getFallbackQuestion,
} from "./services/questionSpeech.js";
import { submitVoiceResponse, transcribeTemporaryJobSearch } from "./services/voiceResponse.js";
import { useTranslatedJobTitle, useTranslatedJobDescription } from "./services/jobTitleTranslation.js";
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

function LocalizedJobTitle({ title, languageCode }) {
  const translatedTitle = useTranslatedJobTitle(title, languageCode);
  return <>{translatedTitle}</>;
}

function LocalizedJobDescription({ description, languageCode }) {
  const translatedDesc = useTranslatedJobDescription(description, languageCode);
  return <>{translatedDesc}</>;
}

// Clean up any stale legacy user in localStorage on module load
try {
  localStorage.removeItem("kaamsetu_user");
} catch {
  // Ignore storage access error
}

// Helper to get / set auth state in sessionStorage
function getStoredUser() {
  try {
    const raw = sessionStorage.getItem("kaamsetu_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredUser(user) {
  try {
    if (user) {
      sessionStorage.setItem("kaamsetu_user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("kaamsetu_user");
    }
  } catch {
    // Ignore storage access error
  }
  window.dispatchEvent(new CustomEvent("kaamsetu_auth_changed", { detail: user }));
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
    const handleAuthChange = (e) => {
      setCurrentUser(e.detail !== undefined ? e.detail : getStoredUser());
    };
    const handleStorage = () => {
      setCurrentUser(getStoredUser());
      setCurrentLang(localStorage.getItem("kaamsetu_language") || "hi-IN");
    };
    const handleLangChange = (e) => {
      const code = e.detail || localStorage.getItem("kaamsetu_language") || "hi-IN";
      setCurrentLang(code);
    };
    window.addEventListener("kaamsetu_auth_changed", handleAuthChange);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("kaamsetu_language_changed", handleLangChange);
    return () => {
      window.removeEventListener("kaamsetu_auth_changed", handleAuthChange);
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

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setLangMenuOpen(false);
    };
    if (langMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [langMenuOpen]);

  const t = dashboardTranslations[currentLang] || dashboardTranslations["en-IN"];
  const currentLanguageObj =
    languages.find((l) => l.languageCode === currentLang) || languages[0];

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
        {/* Top-right language selector custom dialog box matching website UI */}
        <div className="language-selector-wrap" ref={langMenuRef} title="Change Language / भाषा बदलें">
          <button
            type="button"
            className={`language-button ${langMenuOpen ? "active" : ""}`}
            onClick={() => setLangMenuOpen((prev) => !prev)}
            aria-expanded={langMenuOpen}
            aria-haspopup="listbox"
            aria-label="Select Language"
          >
            <Languages size={15} style={{ color: "var(--green)" }} />
            <span>{currentLanguageObj.name}</span>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "500" }}>({currentLanguageObj.code})</span>
            <ChevronDown size={14} className={`language-chevron ${langMenuOpen ? "rotated" : ""}`} />
          </button>

          {langMenuOpen && (
            <div className="language-dialog-box" role="listbox" aria-label="Languages">
              <div className="language-dialog-header">
                <span className="language-dialog-title">
                  <Languages size={13} /> {t.languageTitle || "Language"}
                </span>
                <span className="language-dialog-count">6 Languages</span>
              </div>
              <div className="language-dialog-list">
                {languages.map((l) => {
                  const isSelected = l.languageCode === currentLang;
                  return (
                    <button
                      key={l.languageCode}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`language-dialog-item ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        handleLanguageSelect(l.languageCode);
                        setLangMenuOpen(false);
                      }}
                    >
                      <div className="language-dialog-item-left">
                        <span className="language-dialog-code">{l.code}</span>
                        <div className="language-dialog-names">
                          <span className="language-dialog-name">{l.name}</span>
                          <span className="language-dialog-english">{l.english}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="language-dialog-check">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {currentUser ? (
          <div className="header-user">
            <button
              className="user-badge"
              onClick={() => navigate(currentUser.role === "worker" ? "/worker/dashboard" : "/employer")}
              title="Go to dashboard"
            >
              <User size={15} />
              <span>
                {currentUser.name} ({currentUser.role === "worker" ? t.jobSeeker : (t.employerRole || "Employer")})
              </span>
            </button>
            <button className="logout-btn" onClick={handleLogout} title={t.signOut || "Sign out"}>
              <LogOut size={16} /> {t.signOut || "Sign out"}
            </button>
          </div>
        ) : (
          <>
            <button className="text-button" onClick={() => navigate("/login")}>
              {t.signInTab || "Sign In"}
            </button>
            <button className="button primary small" onClick={() => navigate("/signup")} style={{ padding: "8px 14px", fontSize: "13px" }}>
              <UserPlus size={15} /> {t.createAccountTab || "Sign Up"}
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

  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> {t.heroEyebrow}</div>
            <h1>{t.heroTitleLead}<br /><em>{t.heroTitleEm}</em></h1>
            <p>{t.heroDesc}</p>
            <div className="hero-actions">
              <button
                className="button primary"
                onClick={() => {
                  navigate("/login/worker");
                }}
              >
                {t.findWork} <ArrowRight size={18} />
              </button>
              <button
                className="button quiet"
                onClick={() => {
                  const user = getStoredUser();
                  if (user && user.role === "employer") {
                    navigate("/employer");
                  } else {
                    navigate("/login/employer");
                  }
                }}
              >
                {t.hiring}
              </button>
            </div>
            <div className="trust-row">
              <span><ShieldCheck size={18} /> {t.trustPrivate}</span>
              <span><BadgeCheck size={18} /> {t.trustNoEnglish}</span>
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
            <strong>{t.proofSpeak}</strong>
            <span>{t.proofSpeakSub}</span>
          </div>
          <div>
            <strong>{t.proofWages}</strong>
            <span>{t.proofWagesSub}</span>
          </div>
          <div>
            <strong>{t.proofMatch}</strong>
            <span>{t.proofMatchSub}</span>
          </div>
        </section>
      </main>
    </div>
  );
}

function ChooseRole() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
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

  const handleWorkerClick = () => {
    navigate("/login/worker");
  };

  const handleEmployerClick = () => {
    if (currentUser && currentUser.role === "employer") {
      navigate("/employer");
    } else {
      navigate("/login/employer");
    }
  };

  return (
    <div className="entry-shell">
      <Header back="/" />
      <main className="entry-content">
        <span className="step-label">{t.chooseRoleStep}</span>
        <h1>{t.chooseRoleHeading}</h1>
        <p className="entry-intro">{t.chooseRoleSub}</p>
        <div className="role-grid">
          <button className="role-option worker" onClick={handleWorkerClick}>
            <span className="role-icon"><BriefcaseBusiness size={29} /></span>
            <div>
              <h2>{t.lookingForWorkTitle}</h2>
              <p>{t.lookingForWorkSub}</p>
            </div>
            <ArrowRight size={21} />
          </button>
          <button className="role-option" onClick={handleEmployerClick}>
            <span className="role-icon employer"><Building2 size={29} /></span>
            <div>
              <h2>{t.hiringTitle}</h2>
              <p>{t.hiringSub}</p>
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
  const [englishAnswers, setEnglishAnswers] = useState(["", "", ""]);
  const [parsedAnswers, setParsedAnswers] = useState(["", "", ""]);
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

  const next = async (overrideAnswer = "") => {
    const newAnswers = [...answers];
    newAnswers[step] =
      overrideAnswer.trim() ||
      answer.trim() ||
      (step === 0 ? "Worker" : step === 1 ? "Technician" : "3 years");
    setAnswers(newAnswers);

    const newEnglishAnswers = [...englishAnswers];
    newEnglishAnswers[step] =
      newEnglishAnswers[step].trim() || newAnswers[step];
    setEnglishAnswers(newEnglishAnswers);

    if (step < 2) {
      setStep(step + 1);
      setAnswer("");
      setTranscript("");
      setListening(false);
      setTranslatedQuestion("");
      setTranslationError("");
      setSpeechError("");
    } else {
      const user = getStoredUser();
      const workerName = newAnswers[0];
      // English translation is used for profile fields that drive matching.
      const workerOccupation = newEnglishAnswers[1];
      const experienceYears = Number(parsedAnswers[2]) || parseFloat(newEnglishAnswers[2]) || 2;

      if (user && user.id && user.role === "worker") {
        try {
          await apiRequest("/workers/profile", {
            method: "POST",
            body: JSON.stringify({
              userId: user.id,
              name: workerName,
              occupation: workerOccupation,
              skills: [workerOccupation],
              experienceYears,
              location: "Pune",
              language: preferredLanguageCode,
            }),
          });
          setStoredUser({
            ...user,
            name: workerName || user.name,
            occupation: workerOccupation,
          });
        } catch (e) {
          console.warn("Failed to persist worker profile:", e);
        }
      }

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
      // Sarvam's synchronous STT endpoint accepts recordings up to 30 seconds.
      // Stop slightly earlier so encoding and upload overhead cannot exceed its limit.
      const maximumRecordingTimer = window.setTimeout(() => {
        if (mediaRecorder.state === "recording") mediaRecorder.stop();
      }, 29_000);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        window.clearTimeout(maximumRecordingTimer);
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        setRecorder(null);
        setIsSubmittingSpeech(true);

        try {
          const audio = new Blob(chunks, {
            type: mediaRecorder.mimeType || "audio/webm",
          });

          if (audio.size === 0) {
            throw new Error("No audio was captured. Check your microphone permission and try again.");
          }

          const record = await submitVoiceResponse(
            audio,
            ["name", "occupation", "experienceYears"][step],
            getStoredUser()?.id,
          );

          const recognized = record.transcript || record.englishTranscript || "";
          const extractedValue = String(record.value ?? record.englishTranscript ?? recognized);
          setTranscript(recognized);
          setAnswer(extractedValue);

          // Store the recognized response immediately so the next step
          // keeps the worker's answer even before the Continue button.
          const newAnswers = [...answers];
          newAnswers[step] = extractedValue;
          setAnswers(newAnswers);

          const newEnglishAnswers = [...englishAnswers];
          newEnglishAnswers[step] = extractedValue;
          setEnglishAnswers(newEnglishAnswers);

          const newParsedAnswers = [...parsedAnswers];
          newParsedAnswers[step] = record.value;
          setParsedAnswers(newParsedAnswers);
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
                onClick={() => next()}
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

  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [role, setRole] = useState(
    initialRole ||
    (location.pathname === "/login/employer" ? "employer" : null) ||
    searchParams.get("role") ||
    "worker"
  ); // "worker" | "employer"
  const [name, setName] = useState(searchParams.get("name") || "");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [registeredUser, setRegisteredUser] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (mode === "signup" && role === "employer" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (mode === "signup" && role === "worker" && !occupation.trim()) {
      setError("Please enter your basic occupation");
      return;
    }

    if (mode === "login") {
      if (!email.trim() || (role === "worker" && !userId.toString().trim()) || (role === "employer" && !password.trim())) {
        setError(role === "worker" ? "Please enter both Email and User ID" : "Please enter both Email and Password");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const body = role === "worker"
          ? { email: email.trim(), userId: Number(userId.toString().trim()), expectedRole: role }
          : { email: email.trim(), password, expectedRole: role };

        const res = await apiRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify(body),
        });

        setStoredUser(res.user);
        if (res.user.role === "worker") {
          // Sign-in refreshes the worker's current position. A denial or failure
          // is deliberately non-blocking: authentication has already succeeded.
          const locationResult = await captureAndSaveWorkerLocation();
          const updatedUser = locationResult.success
            ? { ...res.user, ...locationResult.location, location: locationResult.city || res.user.location }
            : res.user;
          setStoredUser(updatedUser);
          if (!locationResult.success) {
            try { sessionStorage.setItem("kaamsetu_location_notice", locationResult.message); } catch (e) { void e; }
          }
          navigate("/worker/dashboard");
        } else {
          navigate("/employer");
        }
      } else {
        // Sign Up (Register)
        const res = await apiRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: role === "employer" ? password : undefined,
            role,
            occupation: role === "worker" ? occupation.trim() : undefined,
            companyName: role === "employer" ? (companyName.trim() || `${name.trim()}'s Company`) : null,
          }),
        });

        setStoredUser(res.user);
        if (res.user.role === "worker") {
          setRegisteredUser(res.user);
        } else {
          navigate("/employer");
        }
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg === "No worker account found" || msg.includes("No worker account found")) {
        setError("No worker account found with these details.");
      } else if (msg === "No employer account found" || msg.includes("No employer account found")) {
        setError("No employer account found with these details.");
      } else {
        setError(msg || "Operation failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (fillEmail, fillRole, fillExtra) => {
    setEmail(fillEmail);
    if (fillRole === "worker") {
      setUserId(fillExtra || "1");
      setPassword("");
    } else {
      setPassword(fillExtra || "password123");
      setUserId("");
    }
    setError(null);
    if (fillRole) setRole(fillRole);
  };

  if (registeredUser) {
    return (
      <div className="site-shell">
        <Header back="/" />
        <main className="auth-shell">
          <section className="auth-card" style={{ textAlign: "center" }}>
            <CheckCircle2 size={44} style={{ color: "var(--green)", marginBottom: "12px" }} />
            <h2>Account created</h2>
            <p>Save these login credentials. You will use them to sign in next time.</p>
            <div style={{ margin: "22px 0", padding: "18px", borderRadius: "8px", background: "#f0f5ea" }}>
              <div style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "6px" }}>Your User ID</div>
              <strong style={{ fontSize: "28px", color: "var(--green)" }}>{registeredUser.id}</strong>
              <div style={{ marginTop: "10px", fontSize: "14px" }}>{registeredUser.email}</div>
            </div>
            <button
              className="button primary full"
              onClick={() => navigate(registeredUser.role === "worker" ? "/worker/dashboard" : "/employer")}
            >
              Continue <ArrowRight size={17} />
            </button>
          </section>
        </main>
      </div>
    );
  }

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
              {t.signInTab}
            </button>
            <button
              className={`mode-toggle-btn ${mode === "signup" ? "active" : ""}`}
              onClick={() => { setMode("signup"); setError(null); }}
              type="button"
            >
              {t.createAccountTab}
            </button>
          </div>

          {/* Role Tabs */}
          <div className="role-tabs">
            <button
              className={`role-tab ${role === "worker" ? "active" : ""}`}
              onClick={() => { setRole("worker"); setError(null); }}
              type="button"
            >
              <BriefcaseBusiness size={16} /> {t.jobSeekerRoleTab}
            </button>
            <button
              className={`role-tab ${role === "employer" ? "active" : ""}`}
              onClick={() => { setRole("employer"); setError(null); }}
              type="button"
            >
              <Building2 size={16} /> {t.employerRoleTab}
            </button>
          </div>

          <div className="auth-header">
            <h2>
              {mode === "login"
                ? role === "worker" ? t.workerLoginTitle : t.employerLoginTitle
                : role === "worker" ? "Join as a Job Seeker" : "Register as an Employer"}
            </h2>
            <p>
              {mode === "login"
                ? role === "worker"
                  ? t.workerLoginSub
                  : t.employerLoginSub
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

            <div className="form-group">
              <label htmlFor="email">{t.emailLabel || "Email"}</label>
              <input
                id="email"
                type="email"
                required
                placeholder={t.emailPlaceholder || "name@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {mode === "login" && role === "worker" ? (
              <div className="form-group">
                <label htmlFor="userId">{t.userIdLabel || "User ID"}</label>
                <input
                  id="userId"
                  type="number"
                  required
                  placeholder={t.userIdPlaceholder || "Enter your User ID (e.g. 1)"}
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
            ) : mode === "login" ? (
              <div className="form-group">
                <label htmlFor="password">{t.passwordLabel || "Password"}</label>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder={t.passwordPlaceholder || "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            ) : null}

            {mode === "signup" && role === "employer" && (
              <div className="form-group">
                <label htmlFor="password">{t.passwordLabel || "Password"}</label>
                <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            )}

            {mode === "signup" && role === "employer" && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            )}

            {mode === "signup" && role === "worker" && (
              <div className="form-group">
                <label htmlFor="occupation">Basic Occupation</label>
                <input
                  id="occupation"
                  type="text"
                  required
                  placeholder="e.g. Electrician"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                />
              </div>
            )}

            {/* Additional fields for employer sign-up */}
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
                ? t.processingBtn
                : mode === "login"
                  ? t.loginBtn
                  : `Create ${role === "worker" ? "Worker" : "Employer"} Account`} <ArrowRight size={17} />
            </button>
          </form>

          {/* Quick-Fill Chips for Testing Login */}
          {mode === "login" && (
            <div className="quick-fill-section">
              <span className="quick-fill-label">{t.quickFillLabel}</span>
              {role === "worker" ? (
                <div className="chip-group">
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => fillCredentials("worker1@kaamsetu.demo", "worker", "1")}
                  >
                    <Check size={13} /> {t.quickChipWorker}
                  </button>
                  <button
                    type="button"
                    className="quick-chip warning"
                    onClick={() => fillCredentials("employer501@kaamsetu.demo", "worker", "501")}
                    title="Employer details in worker login"
                  >
                    <X size={13} /> Employer 501 &rarr; Fails
                  </button>
                </div>
              ) : (
                <div className="chip-group">
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => fillCredentials("employer501@kaamsetu.demo", "employer", "password123")}
                  >
                    <Check size={13} /> {t.quickChipEmployer}
                  </button>
                  <button
                    type="button"
                    className="quick-chip warning"
                    onClick={() => fillCredentials("worker1@kaamsetu.demo", "employer", "password123")}
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

function FitRouteBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [36, 36] });
  }, [map, points]);
  return null;
}

const mapIcon = (emoji) => L.divIcon({ className: "kaamsetu-map-marker", html: `<span>${emoji}</span>`, iconSize: [30, 30], iconAnchor: [15, 30] });

function RouteModal({ job, worker, onClose }) {
  const workerLatitude = Number(worker?.latitude); const workerLongitude = Number(worker?.longitude);
  const jobLatitude = Number(job?.latitude); const jobLongitude = Number(job?.longitude);
  const hasWorkerLocation = Number.isFinite(workerLatitude) && Number.isFinite(workerLongitude);
  const hasJobLocation = Number.isFinite(jobLatitude) && Number.isFinite(jobLongitude);
  const [route, setRoute] = useState(null); const [routeError, setRouteError] = useState("");
  useEffect(() => {
    if (!hasWorkerLocation || !hasJobLocation) return undefined;
    let cancelled = false;
    const query = new URLSearchParams({ startLatitude: String(workerLatitude), startLongitude: String(workerLongitude), endLatitude: String(jobLatitude), endLongitude: String(jobLongitude) });
    apiRequest(`/location/route?${query.toString()}`).then((response) => { if (!cancelled) setRoute(response.route); }).catch(() => { if (!cancelled) setRouteError("Route unavailable. You can still view the job location."); });
    return () => { cancelled = true; };
  }, [hasWorkerLocation, hasJobLocation, workerLatitude, workerLongitude, jobLatitude, jobLongitude]);
  const workerPoint = [workerLatitude, workerLongitude]; const jobPoint = [jobLatitude, jobLongitude];
  const routePoints = route?.coordinates?.map(([longitude, latitude]) => [latitude, longitude]) || [];
  const mapPoints = routePoints.length ? routePoints : [workerPoint, jobPoint];
  return <div className="location-overlay" role="dialog" aria-modal="true" aria-labelledby="route-title"><div className="route-dialog">
    <button className="location-close" type="button" onClick={onClose} aria-label="Close directions"><X size={19} /></button>
    <h3 id="route-title">Route to this job</h3><p className="route-job-title">{job?.title} · {job?.location || "Job location"}</p>
    {!hasWorkerLocation ? <div className="location-result info">Enable location to get directions.</div> : !hasJobLocation ? <div className="location-result info">Directions are unavailable for this job.</div> : <>
      <div className="route-map"><MapContainer center={workerPoint} zoom={12} scrollWheelZoom><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Marker position={workerPoint} icon={mapIcon("📍")}><Tooltip permanent>Your location</Tooltip></Marker><Marker position={jobPoint} icon={mapIcon("🏢")}><Tooltip permanent>{job?.title || "Job location"}</Tooltip></Marker>{routePoints.length > 1 && <Polyline positions={routePoints} pathOptions={{ color: "#206449", weight: 5 }} />}<FitRouteBounds points={mapPoints} /></MapContainer></div>
      <div className="route-summary"><span>📍 Your location</span><span>🏢 {job?.location || "Job location"}</span></div>
      {Number.isFinite(job?.distance_km) && <p className="route-distance">{job.distance_km} km away</p>}
      <p className="route-distance">{route ? `Road distance: ${route.distanceKm} km${route.durationMinutes ? ` · about ${route.durationMinutes} min` : ""}` : routeError || "Finding road route..."}</p>
    </>}
    <button className="button secondary full" type="button" onClick={onClose}>Close</button>
  </div></div>;
}

/**
 * WORKER DASHBOARD: "Post new oppurtunity" + "See your progress"
 */
function WorkerDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => getStoredUser() || {
    name: "Raju Kumar",
    occupation: "Welder",
    location: "Pune",
    role: "worker",
  });
  const [activeTab, setActiveTab] = useState("post"); // "post" | "progress"
  const [progressSubTab, setProgressSubTab] = useState("applications"); // "applications" | "details"
  const [currentLang, setCurrentLang] = useState(
    () => localStorage.getItem("kaamsetu_language") || "hi-IN"
  );
  const [availableJobs, setAvailableJobs] = useState([]);
  const [workerApplications, setWorkerApplications] = useState([]);
  const [workerProfileDetails, setWorkerProfileDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [banner, setBanner] = useState(null);
  const [locationDialog, setLocationDialog] = useState(false);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [locationMessage, setLocationMessage] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [nearbyRadius, setNearbyRadius] = useState("all");
  const [routeJob, setRouteJob] = useState(null);
  const [expandedJobDetailsId, setExpandedJobDetailsId] = useState(null);

  const loadAvailableJobs = async (radius = nearbyRadius, customLat = null, customLng = null) => {
    const lat = customLat ?? currentUser?.latitude;
    const lng = customLng ?? currentUser?.longitude;
    const query = new URLSearchParams({ page: "1", limit: "40", open_only: "true", unique: "true" });
    if (radius !== "all") query.set("radius_km", radius);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      query.set("latitude", String(lat));
      query.set("longitude", String(lng));
    }
    try {
      const res = await apiRequest(`/jobs/nearby?${query.toString()}`);
      if (res?.data) setAvailableJobs(res.data);
    } catch {
      // Keep normal job browsing available for old sessions or a temporary API issue.
      const res = await apiRequest("/jobs?page=1&limit=40&open_only=true&unique=true");
      if (res?.data) setAvailableJobs(res.data);
    }
  };

  const allowLocation = async () => {
    setLocationStatus("loading");
    setLocationMessage("");
    const result = await captureAndSaveWorkerLocation();
    if (!result.success) {
      setLocationStatus("error");
      setLocationMessage(result.message);
      return;
    }
    setCurrentUser((user) => ({ ...user, ...result.location, location: result.city || user.location }));
    setLocationStatus("success");
    setLocationMessage("Showing jobs near your location.");
    await loadAvailableJobs();
  };

  const saveManualLocation = async (event) => {
    event.preventDefault();
    const cityInput = manualLocation.trim();
    if (!cityInput) return;
    try {
      const res = await apiRequest("/workers/location/manual", {
        method: "POST",
        body: JSON.stringify({ location: cityInput }),
      });
      const savedCity = res?.worker?.location || resolveCity(cityInput) || cityInput;
      const coords = getCityCoordinates(savedCity);
      const savedLat = res?.worker?.latitude ?? coords?.latitude ?? null;
      const savedLng = res?.worker?.longitude ?? coords?.longitude ?? null;

      setCurrentUser((user) => ({
        ...user,
        location: savedCity,
        latitude: savedLat !== null ? savedLat : user.latitude,
        longitude: savedLng !== null ? savedLng : user.longitude,
      }));
      setActiveVoiceSearchCriteria(null);
      setLocationStatus("manual");
      setLocationMessage(`Your location is set to ${savedCity}.`);
      setLocationDialog(false);
      await loadAvailableJobs(nearbyRadius, savedLat, savedLng);
    } catch (error) {
      setLocationStatus("error");
      setLocationMessage(error.message || "Could not save your city.");
    }
  };

  // Voice Assistant Application State (opens only when worker clicks apply for new job)
  const [voiceApplyJob, setVoiceApplyJob] = useState(null);
  const [voiceStep, setVoiceStep] = useState(0);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceAnswer, setVoiceAnswer] = useState("");
  const [voiceAnswers, setVoiceAnswers] = useState(["", "", ""]);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceSearchNormalizedAnswer, setVoiceSearchNormalizedAnswer] = useState("");
  const [voiceSubmitting, setVoiceSubmitting] = useState(false);
  const [voiceRecorder, setVoiceRecorder] = useState(null);
  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);
  // Exists only while the voice-search modal is open; never persisted.
  const [voiceSearch, setVoiceSearch] = useState(null);
  const [voiceQuestion, setVoiceQuestion] = useState("");
  // Active voice/custom search criteria applied to opportunity list
  const [activeVoiceSearchCriteria, setActiveVoiceSearchCriteria] = useState(null);

  const fetchWorkerProfileDetails = async (userId) => {
    const id = userId || currentUser?.id;
    if (!id) return;
    setLoadingDetails(true);
    setDetailsError(null);
    try {
      const res = await apiRequest(`/workers/${id}`);
      setWorkerProfileDetails(res.data || res.worker || null);
    } catch (err) {
      setDetailsError(err.message || "Failed to load worker profile from database");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      navigate("/login/worker");
      return;
    }
    if (user.role !== "worker") {
      navigate("/employer");
      return;
    }

    try {
      const locationNotice = sessionStorage.getItem("kaamsetu_location_notice");
      if (locationNotice) {
        setTimeout(() => {
          setBanner({ type: "info", title: "Location notice", message: locationNotice });
        }, 0);
        sessionStorage.removeItem("kaamsetu_location_notice");
      }
    } catch (e) {
      void e;
    }

    if (user.id) {
      // Load real worker profile from database
      apiRequest(`/workers/${user.id}`)
        .then((res) => {
          if (res && res.data) {
            setCurrentUser((prev) => ({
              ...prev,
              ...res.data,
              occupation: res.data.occupation || prev.occupation,
              location: res.data.location || prev.location,
            }));
            setWorkerProfileDetails(res.data);
            if (Number.isFinite(res.data.latitude) && Number.isFinite(res.data.longitude)) {
              apiRequest(`/location/reverse?latitude=${encodeURIComponent(res.data.latitude)}&longitude=${encodeURIComponent(res.data.longitude)}`)
                .then((result) => {
                  if (result.city) setCurrentUser((prev) => ({ ...prev, location: result.city }));
                })
                .catch(() => {});
              loadAvailableJobs(nearbyRadius, res.data.latitude, res.data.longitude);
            }
            if (!Number.isFinite(res.data.latitude) || !Number.isFinite(res.data.longitude)) {
              setLocationDialog(true);
            }
          }
        })
        .catch(() => {});

      // Load worker's applications from database
      apiRequest(`/applications?worker_id=${user.id}`)
        .then((res) => {
          if (res && res.data) {
            setWorkerApplications(res.data);
          }
        })
        .catch(() => {});
    }

    // Load available jobs for Tab 1 (only open opportunities, deduplicated)
    const loadTimer = setTimeout(() => {
      loadAvailableJobs();
    }, 0);
    return () => clearTimeout(loadTimer);
  }, [navigate]);

  useEffect(() => {
    const handleLangChange = (e) => {
      const code = e.detail || localStorage.getItem("kaamsetu_language") || "hi-IN";
      setCurrentLang(code);
    };
    window.addEventListener("kaamsetu_language_changed", handleLangChange);
    return () => window.removeEventListener("kaamsetu_language_changed", handleLangChange);
  }, []);

  const currentVoiceQuestionDisplay = voiceQuestion;

  const playVoiceQuestion = async (text) => {
    if (!text || isSpeakingVoice) return;
    try {
      setIsSpeakingVoice(true);
      await speakText(text, currentLang);
    } catch (e) {
      console.warn("TTS playback error:", e);
    } finally {
      setIsSpeakingVoice(false);
    }
  };

  const handleStartVoiceApply = async (job = null) => {
    setVoiceApplyJob(job || { title: "Skilled Opportunity", company_name: "KaamSetu Partner" });
    setVoiceStep(0);
    setVoiceAnswer("");
    setVoiceAnswers([]);
    setVoiceTranscript("");
    setVoiceSearchNormalizedAnswer("");
    setVoiceListening(false);
    try {
      const result = await apiRequest("/voice-job-search/start", { method: "POST", body: JSON.stringify({ language: currentLang }) });
      setVoiceSearch(result.search);
      setVoiceQuestion(result.nextQuestion);
    } catch (err) {
      setBanner({ type: "error", title: "Voice Search Notice", message: err.message || "Unable to start voice job search" });
      setVoiceApplyJob(null);
    }
  };

  const handleCloseVoiceApply = () => {
    if (voiceListening && voiceRecorder) {
      try {
        voiceRecorder.stop();
      } catch (e) {
        console.warn("Failed to stop voice recorder:", e);
      }
    }
    setVoiceListening(false);
    setVoiceRecorder(null);
    setVoiceApplyJob(null);
    setVoiceSearch(null);
    setVoiceQuestion("");
  };

  const toggleVoiceRecording = async () => {
    if (voiceListening && voiceRecorder) {
      voiceRecorder.stop();
      return;
    }
    try {
      setVoiceTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setVoiceListening(false);
        setVoiceRecorder(null);
        setVoiceSubmitting(true);
        try {
          const audio = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
          const record = await transcribeTemporaryJobSearch(audio, currentLang);
          const recognized = record.transcript || record.englishTranscript || "";
          const extractedValue = String(record.englishTranscript ?? recognized);
          setVoiceTranscript(recognized);
          // Keep the worker-facing answer in the language they spoke. The
          // translated transcript is only used for temporary search parsing.
          setVoiceAnswer(recognized);
          setVoiceSearchNormalizedAnswer(extractedValue);
          setVoiceAnswers((prev) => {
            const next = [...prev];
            next[voiceStep] = recognized;
            return next;
          });
        } catch (err) {
          console.warn("Voice response transcription failed:", err);
        } finally {
          setVoiceSubmitting(false);
        }
      };
      setVoiceRecorder(mediaRecorder);
      mediaRecorder.start();
      setVoiceListening(true);
    } catch (err) {
      console.warn("Microphone access failed:", err);
    }
  };

  const handleNextVoiceStep = async (overrideAnswer = "") => {
    const finalAnswer = overrideAnswer || voiceAnswer.trim() || voiceAnswers[voiceStep];
    if (!finalAnswer || !voiceSearch) return;
    const updatedAnswers = [...voiceAnswers];
    updatedAnswers[voiceStep] = finalAnswer;
    setVoiceAnswers(updatedAnswers);
    setActionLoading("submitting-voice");
    try {
      const result = await apiRequest("/voice-job-search/turn", {
        method: "POST",
        body: JSON.stringify({
          answer: voiceSearchNormalizedAnswer || finalAnswer,
          search: voiceSearch,
          language: currentLang,
          workerId: currentUser?.id,
          latitude: currentUser?.latitude,
          longitude: currentUser?.longitude,
          location: currentUser?.location,
        }),
      });
      if (result.isComplete) {
        const searchedLoc = result.searchedLocation || result.search?.location || null;
        setActiveVoiceSearchCriteria({
          ...result.search,
          searchedLocation: searchedLoc,
          isCustomLocation: Boolean(result.isCustomLocation),
        });
        const targetCoords = searchedLoc ? getCityCoordinates(searchedLoc) : null;
        const refLat = targetCoords ? targetCoords.latitude : (Number.isFinite(currentUser?.latitude) ? currentUser.latitude : null);
        const refLon = targetCoords ? targetCoords.longitude : (Number.isFinite(currentUser?.longitude) ? currentUser.longitude : null);

        const jobsWithDist = (result.matches || []).map((match) => {
          let dist = match.job?.distance_km;
          if (
            !Number.isFinite(dist) &&
            Number.isFinite(refLat) &&
            Number.isFinite(refLon) &&
            Number.isFinite(match.job?.latitude) &&
            Number.isFinite(match.job?.longitude)
          ) {
            dist = calculateDistanceKm(
              refLat,
              refLon,
              match.job.latitude,
              match.job.longitude
            );
          }
          return { ...match.job, distance_km: dist, voiceMatch: match };
        });
        setAvailableJobs(jobsWithDist);
        setBanner({
          type: "success",
          title: "Jobs found",
          message: `${result.matches?.length || 0} matching jobs found for your voice search${searchedLoc ? ` in ${searchedLoc}` : ""}.`,
        });
        handleCloseVoiceApply();
      } else {
        setVoiceSearch(result.search);
        setVoiceQuestion(result.nextQuestion);
        setVoiceStep((step) => step + 1);
        setVoiceAnswer("");
        setVoiceSearchNormalizedAnswer("");
        setVoiceTranscript("");
        setVoiceListening(false);
      }
    } catch (err) {
      setBanner({ type: "error", title: "Voice Search Notice", message: err.message || "Failed to find jobs" });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (voiceApplyJob && voiceQuestion) {
      const timer = setTimeout(() => {
        playVoiceQuestion(voiceQuestion);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [voiceApplyJob, voiceQuestion]);

  const handleApply = async (job) => {
    if (!currentUser?.id) return;
    try {
      setActionLoading(job.id);
      setBanner(null);
      await apiRequest("/applications/apply", {
        method: "POST",
        body: JSON.stringify({
          workerId: currentUser.id,
          jobId: job.id,
        }),
      });
      setBanner({
        type: "success",
        title: "Application Submitted!",
        message: `Successfully applied for "${job.title}" at ${job.company_name}.`,
      });
      const res = await apiRequest(`/applications?worker_id=${currentUser.id}`);
      if (res && res.data) {
        setWorkerApplications(res.data);
      }
    } catch (err) {
      setBanner({
        type: "error",
        title: "Notice",
        message: err.message || "Failed to submit application",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdraw = async (app) => {
    if (!window.confirm(`Are you sure you want to withdraw your application for "${app.job_title}"?`)) {
      return;
    }
    try {
      setActionLoading(`withdraw-${app.id}`);
      await apiRequest(`/applications/${app.id}/withdraw`, {
        method: "POST",
        body: JSON.stringify({ workerId: currentUser?.id }),
      });
      setWorkerApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: "Withdrawn" } : a))
      );
      setBanner({
        type: "info",
        title: "Application Withdrawn",
        message: `Your application for "${app.job_title}" has been withdrawn.`,
      });
      await loadAvailableJobs();
    } catch (err) {
      setBanner({
        type: "error",
        title: "Withdraw Failed",
        message: err.message || "Failed to withdraw application",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const t = dashboardTranslations[currentLang] || dashboardTranslations["en-IN"];

  const localizedOccupation =
    occupationTranslations[currentLang]?.[currentUser.occupation] ||
    currentUser.occupation ||
    "Welder";

  const appliedJobIds = new Set(workerApplications.map((a) => Number(a.job_id)));
  const dynamicCity = currentUser.location || "Location unavailable";

  // Re-use the active localized question so manual entry is always in the
  // selected language rather than showing a stale English field hint.
  const voiceSearchPlaceholder = currentVoiceQuestionDisplay || "Enter your answer";

  // Deduplicate and filter available open opportunities (one opportunity once)
  const displayedAvailableJobs = useMemo(() => {
    const seen = new Set();
    const unique = [];

    // Filter to only open opportunities (openings > 0 and not closed)
    const validJobs = (availableJobs || []).filter(
      (job) => job && (job.openings == null || Number(job.openings) > 0) && job.status !== "closed"
    );

    // Check if an active custom/voice search has a specific location
    const searchTargetCity = activeVoiceSearchCriteria?.searchedLocation || activeVoiceSearchCriteria?.location || null;
    const targetCoords = searchTargetCity ? getCityCoordinates(searchTargetCity) : null;

    // Determine reference coordinates for distance calculations
    let refLat = targetCoords?.latitude ?? (Number.isFinite(currentUser?.latitude) ? currentUser.latitude : null);
    let refLon = targetCoords?.longitude ?? (Number.isFinite(currentUser?.longitude) ? currentUser.longitude : null);

    if ((refLat === null || refLon === null) && currentUser?.location) {
      const cityCoords = getCityCoordinates(currentUser.location) || KNOWN_CITY_COORDINATES[currentUser.location.toLowerCase().trim()];
      if (cityCoords) {
        refLat = cityCoords.latitude;
        refLon = cityCoords.longitude;
      }
    }

    for (const job of validJobs) {
      const normTitle = (job.title || "").trim().toLowerCase();
      const normCompany = (job.company_name || "").trim().toLowerCase();
      const key = `${normTitle}:::${normCompany}`;

      if (!seen.has(key) && !seen.has(Number(job.id))) {
        seen.add(key);
        seen.add(Number(job.id));

        // Calculate distance relative to refLat/refLon if distance is missing or when a custom city was searched
        let distanceKm = job.distance_km;
        if (
          (!Number.isFinite(distanceKm) || (targetCoords && !job.voiceMatch)) &&
          refLat !== null &&
          refLon !== null &&
          Number.isFinite(job.latitude) &&
          Number.isFinite(job.longitude)
        ) {
          distanceKm = calculateDistanceKm(refLat, refLon, job.latitude, job.longitude);
        }

        unique.push(distanceKm !== job.distance_km ? { ...job, distance_km: distanceKm } : job);
      }
    }

    const workerOcc = (activeVoiceSearchCriteria?.occupation || currentUser?.occupation || "").trim().toLowerCase();
    const targetCityLower = searchTargetCity ? searchTargetCity.toLowerCase().trim() : null;

    // Order companies:
    // 1. If worker searched a custom location, jobs matching that searched city come FIRST!
    // 2. Least to max distance (ascending distance) relative to reference location
    // 3. Match score / suitability
    // 4. Occupation title match
    return [...unique].sort((a, b) => {
      if (targetCityLower) {
        const aLocMatch = String(a.location || "").toLowerCase().includes(targetCityLower);
        const bLocMatch = String(b.location || "").toLowerCase().includes(targetCityLower);
        if (aLocMatch && !bLocMatch) return -1;
        if (!aLocMatch && bLocMatch) return 1;
      }

      const aDist = Number.isFinite(a.distance_km) ? a.distance_km : Infinity;
      const bDist = Number.isFinite(b.distance_km) ? b.distance_km : Infinity;

      if (aDist !== bDist) {
        return aDist - bDist; // Least to max distance!
      }

      // Tie-breaker 1: match_score (or voiceMatch matchScore)
      const aScore = a.voiceMatch?.matchScore ?? (Number.isFinite(a.match_score) ? a.match_score : 0);
      const bScore = b.voiceMatch?.matchScore ?? (Number.isFinite(b.match_score) ? b.match_score : 0);
      if (aScore !== bScore) {
        return bScore - aScore;
      }

      // Tie-breaker 2: occupation title match
      if (workerOcc) {
        const aMatch = (a.title || "").toLowerCase().includes(workerOcc);
        const bMatch = (b.title || "").toLowerCase().includes(workerOcc);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }

      return 0;
    });
  }, [availableJobs, currentUser.occupation, currentUser.latitude, currentUser.longitude, currentUser.location, activeVoiceSearchCriteria]);

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
                {localizedOccupation} · {dynamicCity}
              </p>
            </div>
          </div>
          <div>
            <span className="badge badge-applied" style={{ padding: "8px 16px", fontSize: "13px" }}>
              <CheckCircle2 size={16} /> {t.availableForWork}
            </span>
          </div>
        </div>

        {banner && (
          <div className={`banner ${banner.type}`} style={{ marginBottom: "20px" }}>
            {banner.type === "success" && <CheckCircle2 size={22} />}
            {banner.type === "error" && <AlertCircle size={22} />}
            <div>
              <strong>{banner.title}</strong>
              <span>{banner.message}</span>
            </div>
          </div>
        )}

        {locationDialog && (
          <div className="location-overlay" role="dialog" aria-modal="true" aria-labelledby="location-title">
            <div className="location-dialog">
              <button className="location-close" type="button" onClick={() => setLocationDialog(false)} aria-label="Close location prompt"><X size={19} /></button>
              <span className="location-icon"><MapPin size={23} /></span>
              <h3 id="location-title">Find jobs near you</h3>
              <p>Allow KaamSetu to use your location to show nearby jobs and how far each job is from you.</p>
              {locationStatus === "success" ? (
                <div className="location-result success"><CheckCircle2 size={18} /><span><strong>Location enabled</strong><br />{locationMessage}</span></div>
              ) : (
                <button type="button" className="button primary full" onClick={allowLocation} disabled={locationStatus === "loading"}><MapPin size={17} /> {locationStatus === "loading" ? "Finding location..." : "Allow Location"}</button>
              )}
              {locationStatus === "success" ? (
                <button type="button" className="button secondary full" onClick={() => setLocationDialog(false)}>Continue to jobs</button>
              ) : (
                <form onSubmit={saveManualLocation} className="manual-location-form">
                  <label htmlFor="manual-location">Enter location manually</label>
                  <div><input id="manual-location" value={manualLocation} onChange={(event) => setManualLocation(event.target.value)} placeholder="City or area (for example, Pune)" maxLength="160" /><button type="submit" className="button secondary small">Save city</button></div>
                </form>
              )}
              {locationMessage && locationStatus !== "success" && <div className="location-result info">{locationMessage}</div>}
              <button type="button" className="location-skip" onClick={() => setLocationDialog(false)}>Continue without location</button>
            </div>
          </div>
        )}

        {routeJob && <RouteModal job={routeJob} worker={currentUser} onClose={() => setRouteJob(null)} />}

        {/* Dashboard Tabs */}
        <div className="dashboard-tabs">
          <button
            type="button"
            className={`dash-tab ${activeTab === "post" ? "active" : ""}`}
            onClick={() => setActiveTab("post")}
          >
            <PlusCircle size={18} /> {t.applyNewJobTab || "Apply for new job"}
          </button>
          <button
            type="button"
            className={`dash-tab ${activeTab === "progress" ? "active" : ""}`}
            onClick={() => setActiveTab("progress")}
          >
            <BriefcaseBusiness size={18} /> {t.progressTab || "See your progress"} ({workerApplications.length})
          </button>
        </div>

        {activeTab === "post" ? (
          /* TAB 1: Apply for new job */
          <div>
            {/* Action Banner */}
            <div
              style={{
                background: "#fff",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
                boxShadow: "0 4px 16px #122c1b05",
                marginBottom: "24px",
              }}
            >
              <div>
                <span className="step-label" style={{ marginBottom: "3px" }}>
                  <Sparkles size={14} /> {t.voiceBadge || "AI VOICE ASSISTANT"}
                </span>
                <h3 style={{ margin: "2px 0 4px", fontSize: "18px", color: "var(--ink)" }}>
                  {t.applyNewJobTab || "Apply for New Job"}
                </h3>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
                  {t.browseOpportunities || "Browse open vacancies below to apply directly, or speak naturally with our Voice Assistant."}
                </p>
              </div>
              <button
                type="button"
                className="button primary"
                onClick={() => handleStartVoiceApply(null)}
              >
                <Mic size={16} /> {t.voiceSearchBtn || "Find Jobs by Voice"}
              </button>
            </div>

            {/* Voice Application Modal (opens ONLY if worker clicks apply for new job) */}
            {voiceApplyJob && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(18, 44, 27, 0.45)",
                  backdropFilter: "blur(4px)",
                  zIndex: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "16px",
                    maxWidth: "560px",
                    width: "100%",
                    padding: "30px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div className="ai-orb" style={{ width: "36px", height: "36px" }}>
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <span className="step-label">
                          {t.voiceJobSearch || "Voice Job Search"} · {voiceStep + 1}
                        </span>
                        <h3 style={{ margin: "2px 0 0", fontSize: "17px" }}>
                          {t.voiceJobSearch || "Voice Job Search"}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCloseVoiceApply}
                      style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted)", padding: "4px" }}
                      title={t.cancelClose || "Cancel and close"}
                    >
                      <X size={22} />
                    </button>
                  </div>

                  {/* Question Card */}
                  <div className="question-card" style={{ padding: "20px 24px", borderRadius: "10px", margin: "14px 0", position: "relative" }}>
                    <button
                      type="button"
                      className="listen-question"
                      onClick={() => playVoiceQuestion(currentVoiceQuestionDisplay)}
                      disabled={isSpeakingVoice}
                      title={t.listenQuestion || "Listen to question aloud"}
                    >
                      <Volume2 size={20} />
                    </button>
                    <p className="hindi-question" style={{ fontSize: "19px", margin: 0 }}>
                      {currentVoiceQuestionDisplay}
                    </p>
                    <p className="translation" style={{ margin: "6px 0 0", fontSize: "13px" }}>
                      {currentVoiceQuestionDisplay}
                    </p>
                  </div>

                  {/* Voice recording & wave */}
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <div className={`sound-wave ${voiceListening ? "is-listening" : ""}`} style={{ marginBottom: "12px" }}>
                      <i /><i /><i /><i /><i /><i /><i />
                    </div>

                    <button
                      type="button"
                      className={`mic-button ${voiceListening ? "recording" : ""}`}
                      onClick={toggleVoiceRecording}
                      disabled={voiceSubmitting}
                    >
                      <Mic size={28} />
                    </button>

                    <small style={{ display: "block", marginTop: "12px", color: "var(--muted)", fontSize: "12px" }}>
                      {voiceListening
                        ? (t.listeningVoice || "Listening... Tap to stop speaking")
                        : voiceSubmitting
                        ? (t.processingVoice || "Processing your voice...")
                        : (t.tapToSpeak || "Tap mic and speak your answer naturally")}
                    </small>
                    {voiceTranscript && (
                      <div style={{ marginTop: "10px", background: "#f0f5ea", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", color: "var(--green)" }}>
                        🎙️ <strong>{t.heard || "Heard:"}</strong> "{voiceTranscript}"
                      </div>
                    )}
                  </div>

                  {/* Manual entry option */}
                  <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed var(--line)" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "var(--muted)", marginBottom: "6px" }}>
                      {t.fillManually || "Or fill details manually:"}
                    </label>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <input
                        type="text"
                        value={voiceAnswer}
                        onChange={(e) => {
                          setVoiceAnswer(e.target.value);
                          setVoiceSearchNormalizedAnswer("");
                        }}
                        placeholder={voiceSearchPlaceholder}
                        style={{
                          flex: 1,
                          padding: "10px 14px",
                          border: "1px solid #cfd7cd",
                          borderRadius: "8px",
                          fontSize: "14px",
                        }}
                      />
                      <button
                        type="button"
                        className="button primary small"
                        onClick={() => handleNextVoiceStep()}
                        disabled={actionLoading === "submitting-voice"}
                      >
                        {actionLoading === "submitting-voice" ? (t.searching || "Searching...") : (t.next || "Next")}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Direct Opportunity Applying Section */}
            <div>
              <div className="jobs-heading-row">
              <h3 style={{ fontSize: "18px", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <BriefcaseBusiness size={20} style={{ color: "var(--green)" }} />
                {t.openOpportunities || "Open Opportunities"} ({displayedAvailableJobs.length})
              </h3>
                <label className="nearby-filter">Nearby
                  <select value={nearbyRadius} onChange={(event) => { setNearbyRadius(event.target.value); loadAvailableJobs(event.target.value); }}>
                    <option value="all">All jobs</option><option value="5">Within 5 km</option><option value="10">Within 10 km</option><option value="25">Within 25 km</option>
                  </select>
                </label>
              </div>

              {activeVoiceSearchCriteria && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#eef7ee",
                    border: "1px solid #c3e2c6",
                    borderRadius: "10px",
                    padding: "10px 16px",
                    marginBottom: "16px",
                    fontSize: "14px",
                    color: "#184420",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <MapPin size={16} style={{ color: "var(--green)" }} />
                    <span>
                      {t.showingJobsIn || "Showing jobs matching:"}{" "}
                      <strong>
                        {activeVoiceSearchCriteria.occupation ? `${activeVoiceSearchCriteria.occupation} ` : ""}
                        {activeVoiceSearchCriteria.searchedLocation || activeVoiceSearchCriteria.location
                          ? `in ${activeVoiceSearchCriteria.searchedLocation || activeVoiceSearchCriteria.location}`
                          : ""}
                      </strong>
                      {activeVoiceSearchCriteria.skills?.length > 0
                        ? ` (${activeVoiceSearchCriteria.skills.join(", ")})`
                        : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={async () => {
                      setActiveVoiceSearchCriteria(null);
                      await loadAvailableJobs();
                    }}
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      height: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <X size={13} /> {t.clearFilterShowNearby || "Clear Filter · Show Nearby Jobs"}
                  </button>
                </div>
              )}
              {displayedAvailableJobs.length === 0 ? (
                <div className="empty-state">{t.noOpenJobs || "No open jobs available currently. Check back soon!"}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {displayedAvailableJobs.map((job) => {
                    const alreadyApplied = appliedJobIds.has(Number(job.id));
                    return (
                      <div key={job.id} className="job-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                            <h3 style={{ margin: 0 }}><LocalizedJobTitle title={job.title} languageCode={currentLang} /></h3>
                            <span className="badge badge-applied" style={{ fontSize: "12px" }}>
                              {job.company_name}
                            </span>
                          </div>
                          <p style={{ color: "var(--muted)", margin: "0 0 8px", fontSize: "14px" }}>
                            <LocalizedJobDescription description={job.description} languageCode={currentLang} />
                          </p>
                          <div className="job-tags">
                            <span className="tag">📍 {job.location || "Pune"}</span>
                            {Number.isFinite(job.distance_km) ? <span className="tag">📏 {job.distance_km} km away</span> : <span className="tag">📍 Enable location to see distance</span>}
                            <span className="tag">💰 ₹{job.salary_min?.toLocaleString()} - ₹{job.salary_max?.toLocaleString()}/mo</span>
                            <span className="tag">👥 {job.openings} {t.openings || "Openings"}</span>
                            <span className="tag">
                              🛠️ {Math.round(Number(job.experience_required != null ? job.experience_required : (job.required_experience != null ? job.required_experience : 0)))} {t.minimumExperience || "yrs minimum experience"}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className={`button small ${expandedJobDetailsId === job.id ? "primary" : "secondary"}`}
                            onClick={() => setExpandedJobDetailsId(expandedJobDetailsId === job.id ? null : job.id)}
                            style={{ padding: "8px 14px", fontSize: "13px" }}
                            title={expandedJobDetailsId === job.id ? (t.hideDetailsBtn || "Hide Details") : (t.companyDetailsTab || "Company Details")}
                          >
                            <Info size={14} /> {expandedJobDetailsId === job.id ? (t.hideDetailsBtn || "Hide Details") : (t.companyDetailsTab || "Company Details")}
                          </button>
                          {alreadyApplied ? (
                            <span className="badge badge-applied" style={{ padding: "8px 14px", fontSize: "13px" }}>
                              <Check size={14} /> {t.applied || "Applied"}
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="button primary small"
                                onClick={() => handleStartVoiceApply(job)}
                                style={{ padding: "8px 14px", fontSize: "13px" }}
                                title={t.voiceSearchBtn || "Find Jobs by Voice"}
                              >
                                <Mic size={14} /> {t.voiceApplyBtn || "Voice Apply"}
                              </button>
                              <button
                                type="button"
                                className="button secondary small"
                                disabled={actionLoading === job.id}
                                onClick={() => handleApply(job)}
                                style={{ padding: "8px 14px", fontSize: "13px" }}
                              >
                                {actionLoading === job.id ? (t.applying || "Applying...") : (t.quickApplyBtn || "Quick Apply")} <ArrowRight size={14} />
                              </button>
                            </>
                          )}
                          <button type="button" className="button secondary small" onClick={() => setRouteJob(job)} style={{ padding: "8px 14px", fontSize: "13px" }}>
                            <MapPin size={14} /> Directions
                          </button>
                        </div>

                        {/* Expandable Employer Details Sub-Panel */}
                        {expandedJobDetailsId === job.id && (
                          <div
                            style={{
                              width: "100%",
                              marginTop: "8px",
                              padding: "16px",
                              background: "#f8faf8",
                              borderRadius: "10px",
                              border: "1px solid #dbe6dc",
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Building2 size={18} style={{ color: "var(--green)" }} />
                                <span style={{ fontSize: "15px", fontWeight: "700", color: "#1b3323" }}>
                                  {job.company_name}
                                </span>
                                <span className="badge badge-applied" style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px" }}>
                                  <ShieldCheck size={12} /> {t.verifiedEmployerBadge || "Verified Employer"}
                                </span>
                              </div>
                              <button
                                type="button"
                                className="button secondary small"
                                onClick={() => setExpandedJobDetailsId(null)}
                                style={{ padding: "4px 8px", fontSize: "12px", height: "auto" }}
                              >
                                <X size={13} /> {t.hideDetailsBtn || "Hide Details"}
                              </button>
                            </div>

                            {/* Key employer data grid */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "10px",
                              }}
                            >
                              <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2ebe4" }}>
                                <div style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>
                                  🏢 {t.employerIndustry || "Industry / Sector"}
                                </div>
                                <div style={{ fontWeight: "600", color: "#2d3748", fontSize: "13px" }}>
                                  {job.company_industry || "Manufacturing & Industrial Services"}
                                </div>
                              </div>

                              <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2ebe4" }}>
                                <div style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>
                                  📞 {t.employerContact || "Employer Contact"}
                                </div>
                                <div style={{ fontWeight: "600", color: "#2d3748", fontSize: "13px" }}>
                                  {job.company_contact || "+91 98230 12345 (KaamSetu Desk)"}
                                </div>
                              </div>

                              <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2ebe4" }}>
                                <div style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>
                                  ⏰ {t.employerShift || "Work Shift"}
                                </div>
                                <div style={{ fontWeight: "600", color: "#2d3748", fontSize: "13px", textTransform: "capitalize" }}>
                                  {job.shift ? `${job.shift} Shift (8 hrs)` : "Day Shift (8 hrs)"}
                                </div>
                              </div>

                              <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2ebe4" }}>
                                <div style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>
                                  💼 {t.employerJobType || "Job Type"}
                                </div>
                                <div style={{ fontWeight: "600", color: "#2d3748", fontSize: "13px" }}>
                                  {job.employment_type || "Full-time / Direct Payroll"}
                                </div>
                              </div>

                              <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2ebe4" }}>
                                <div style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>
                                  📍 {t.locationTitle || "Work Location"}
                                </div>
                                <div style={{ fontWeight: "600", color: "#2d3748", fontSize: "13px" }}>
                                  {job.location || "Pune"} {Number.isFinite(job.distance_km) ? `(${job.distance_km} km)` : ""}
                                </div>
                              </div>

                              <div style={{ background: "#ffffff", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2ebe4" }}>
                                <div style={{ color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>
                                  👥 {t.openings || "Vacancies"}
                                </div>
                                <div style={{ fontWeight: "600", color: "#2d3748", fontSize: "13px" }}>
                                  {job.openings} {t.openings || "vacancies"}
                                </div>
                              </div>
                            </div>

                            {/* Required Skills list */}
                            {(() => {
                              let skillList = [];
                              try {
                                if (Array.isArray(job.skills)) skillList = job.skills;
                                else if (Array.isArray(job.required_skills)) skillList = job.required_skills;
                                else if (typeof job.skills === "string") skillList = JSON.parse(job.skills);
                                else if (typeof job.required_skills === "string") skillList = JSON.parse(job.required_skills);
                              } catch {
                                skillList = [];
                              }
                              return skillList.length > 0 ? (
                                <div>
                                  <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>
                                    🛠️ {t.requiredSkillsLabel || "Required Skills"}:
                                  </div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                    {skillList.map((skill, idx) => (
                                      <span key={idx} className="tag" style={{ background: "#eaf3eb", color: "#1a5328", border: "1px solid #c9e0cc" }}>
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null;
                            })()}

                            {/* Localized Job Description Details */}
                            <div style={{ background: "#ffffff", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2ebe4" }}>
                              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "600", marginBottom: "4px" }}>
                                📝 {currentLang === "en-IN" ? "Job Description" : (t.postHeading ? "कार्य विवरण" : "Job Description")}:
                              </div>
                              <p style={{ margin: 0, fontSize: "14px", color: "#2d3748", lineHeight: "1.5" }}>
                                <LocalizedJobDescription description={job.description} languageCode={currentLang} />
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
                <h3 style={{ margin: "4px 0 0" }}>
                  {workerApplications.length > 0 ? `${workerApplications.length} Tracked` : t.trackedCount}
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
                  {t.topMatchRate}
                </span>
                <h3 style={{ margin: "4px 0 0", color: "var(--green)" }}>{t.fitRate}</h3>
              </div>
            </div>

            {/* Subtab Switcher: Applied Applications vs Worker Details */}
            <div className="subtab-bar">
              <button
                className={`subtab-btn ${progressSubTab === "applications" ? "active" : ""}`}
                onClick={() => setProgressSubTab("applications")}
              >
                <BriefcaseBusiness size={15} /> {t.applicationsSubTab || "Applied Opportunities"} ({workerApplications.length})
              </button>
              <button
                className={`subtab-btn ${progressSubTab === "details" ? "active" : ""}`}
                onClick={() => {
                  setProgressSubTab("details");
                  if (!workerProfileDetails && currentUser?.id) {
                    fetchWorkerProfileDetails(currentUser.id);
                  }
                }}
              >
                <BadgeCheck size={15} /> {t.detailsSubTab || "Worker Details"}
              </button>
            </div>

            {progressSubTab === "applications" ? (
              /* Subtab 1: Applications List */
              workerApplications.length > 0 ? (
                <div className="candidate-grid">
                  {workerApplications.map((app) => {
                    const status = app.status || "Applied";
                    const isSelected = status === "Selected";
                    const isShortlisted = status === "Shortlisted";
                    const isRejected = status === "Rejected" || status.toLowerCase() === "rejected";
                    const isWithdrawn = status === "Withdrawn" || status.toLowerCase() === "withdrawn";
                    const statusClass = isSelected
                      ? "shortlisted"
                      : isShortlisted
                        ? "shortlisted"
                        : isRejected
                          ? "rejected"
                          : isWithdrawn
                            ? "withdrawn"
                            : "applied";

                    return (
                      <div key={app.id} className={`app-card ${isSelected ? "is-hired" : ""} ${isRejected ? "is-withdrawn" : ""}`}>
                        <div className="app-card-left">
                          <div className="app-avatar">
                            <BriefcaseBusiness size={20} />
                          </div>
                          <div className="app-info">
                            <h3><LocalizedJobTitle title={app.job_title} languageCode={currentLang} /></h3>
                            <div className="app-meta">
                              <span>
                                <Building2 size={14} /> <strong>{app.company_name}</strong>
                              </span>
                              <span>
                                <MapPin size={14} /> {app.job_location || "Pune"}
                              </span>
                              {app.salary_min && (
                                <span>💰 ₹{Number(app.salary_min).toLocaleString()} - ₹{Number(app.salary_max).toLocaleString()}/mo</span>
                              )}
                            </div>
                            <p
                              style={{
                                color: isSelected ? "var(--green)" : isRejected ? "#c53030" : "var(--muted)",
                                fontSize: "13px",
                                margin: "6px 0 0",
                                fontWeight: isSelected || isRejected ? "600" : "normal",
                              }}
                            >
                              {isSelected
                                ? "🎉 Congratulations! You have been selected for this position."
                                : isShortlisted
                                  ? "Employer shortlisted your profile for next round."
                                  : isRejected
                                    ? "❌ Application rejected by employer."
                                    : isWithdrawn
                                      ? "Application closed."
                                      : "Application submitted to employer."}
                            </p>
                          </div>
                        </div>

                        <div className="app-card-right">
                          <span className={`badge badge-${statusClass}`}>
                            {isSelected && <BadgeCheck size={14} />}
                            {isRejected && <X size={14} />}
                            {isRejected ? "Rejected" : status}
                          </span>
                          {!isWithdrawn && !isRejected && (
                            <button
                              type="button"
                              className="button danger-outline small"
                              disabled={actionLoading === `withdraw-${app.id}`}
                              onClick={() => handleWithdraw(app)}
                              title="Withdraw this application"
                            >
                              <X size={13} /> {actionLoading === `withdraw-${app.id}` ? (t.withdrawingBtn || "Withdrawing...") : (t.withdrawBtn || "Withdraw Application")}
                            </button>
                          )}
                          <button
                            className="button secondary small"
                            onClick={() => {
                              setProgressSubTab("details");
                              fetchWorkerProfileDetails(currentUser.id);
                            }}
                          >
                            {t.viewDetailsBtn || "Details"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
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
                          <button
                            className="button secondary small"
                            onClick={() => {
                              setProgressSubTab("details");
                              fetchWorkerProfileDetails(currentUser.id);
                            }}
                          >
                            {t.viewDetailsBtn || "Details"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Subtab 2: Worker Profile Details from Database */
              <div className="worker-details-view">
                {loadingDetails ? (
                  <div className="empty-state">
                    <Sparkles size={26} style={{ color: "var(--green)", marginBottom: "8px" }} />
                    <p style={{ margin: 0, fontWeight: "600" }}>{t.loadingWorkerDetails || "Loading worker details from database..."}</p>
                  </div>
                ) : detailsError ? (
                  <div className="banner error">
                    <AlertCircle size={22} />
                    <div>
                      <strong>Failed to load profile details</strong>
                      <span>{detailsError}</span>
                    </div>
                  </div>
                ) : workerProfileDetails ? (
                  <div className="worker-details-card">
                    <div className="worker-details-header">
                      <div className="worker-details-main">
                        <div className="worker-avatar-large">
                          {workerProfileDetails.name ? workerProfileDetails.name[0] : "W"}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <h2 style={{ margin: 0, fontSize: "22px" }}>{workerProfileDetails.name}</h2>
                            <span className="badge badge-applied" style={{ fontSize: "12px" }}>
                              <BadgeCheck size={14} /> {t.profileHeader || "Verified Skill Passport"}
                            </span>
                          </div>
                          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
                            {workerProfileDetails.email} · ID: #{workerProfileDetails.userId || workerProfileDetails.id || currentUser.id} · {t.jobSeeker || "Job Seeker"}
                          </p>
                        </div>
                      </div>

                      <div>
                        <button
                          className="button secondary small"
                          onClick={() => setProgressSubTab("applications")}
                        >
                          <ArrowLeft size={14} /> {t.backToListBtn || "Back to Applications"}
                        </button>
                      </div>
                    </div>

                    <div className="worker-details-grid">
                      <div className="worker-detail-item">
                        <span className="worker-detail-label">{t.tradeTitle || "Trade / Occupation"}</span>
                        <p className="worker-detail-val">{localizedOccupation || workerProfileDetails.occupation || "Specialist"}</p>
                      </div>
                      <div className="worker-detail-item">
                        <span className="worker-detail-label">{t.experienceTitle || "Experience"}</span>
                        <p className="worker-detail-val">
                          {workerProfileDetails.experienceYears
                            ? `${workerProfileDetails.experienceYears} Years`
                            : "Experienced"}
                        </p>
                      </div>
                      <div className="worker-detail-item">
                        <span className="worker-detail-label">{t.salaryTitle || "Expected Salary"}</span>
                        <p className="worker-detail-val">
                          {workerProfileDetails.expectedSalaryMin
                            ? `₹${Number(workerProfileDetails.expectedSalaryMin).toLocaleString()}/mo`
                            : "Market Standard"}
                        </p>
                      </div>
                      <div className="worker-detail-item">
                        <span className="worker-detail-label">{t.locationTitle || "Location & Shift"}</span>
                        <p className="worker-detail-val">
                          {workerProfileDetails.location || "Pune"} · {workerProfileDetails.preferredShift || "Day"} shift
                        </p>
                      </div>
                      <div className="worker-detail-item">
                        <span className="worker-detail-label">{t.languageTitle || "Primary Language"}</span>
                        <p className="worker-detail-val">{workerProfileDetails.language || "Hindi"}</p>
                      </div>
                    </div>

                    <div className="worker-detail-skills">
                      <span className="worker-detail-label">{t.skillsTitle || "Verified Skills"}</span>
                      <div className="skills-tags-wrap">
                        {Array.isArray(workerProfileDetails.skills) && workerProfileDetails.skills.length > 0 ? (
                          workerProfileDetails.skills.map((skill, sIdx) => (
                            <span key={sIdx} className="skill-tag-pill">
                              <Check size={13} />
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "13px" }}>Technical Trade Skills</span>
                        )}
                      </div>
                    </div>

                    {Array.isArray(workerProfileDetails.employmentHistory) &&
                      workerProfileDetails.employmentHistory.length > 0 && (
                        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--line)" }}>
                          <span className="worker-detail-label">{t.employmentHistoryTitle || "Employment History"}</span>
                          <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
                            {workerProfileDetails.employmentHistory.map((hist, hIdx) => (
                              <div
                                key={hIdx}
                                style={{
                                  background: "#f9faf8",
                                  border: "1px solid var(--line)",
                                  borderRadius: "8px",
                                  padding: "12px 16px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <strong>{typeof hist === "string" ? hist : hist.role || "Technician"}</strong>
                                  {typeof hist === "object" && hist.company && (
                                    <span style={{ color: "var(--muted)", marginLeft: "8px", fontSize: "13px" }}>
                                      at {hist.company}
                                    </span>
                                  )}
                                </div>
                                {typeof hist === "object" && hist.duration && (
                                  <span className="tag">{hist.duration}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="empty-state">No profile details loaded yet.</div>
                )}
              </div>
            )}
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
  const [candidateSubTab, setCandidateSubTab] = useState("list"); // "list" | "details"
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [selectedWorkerDetails, setSelectedWorkerDetails] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingWorkerDetails, setLoadingWorkerDetails] = useState(false);
  const [workerDetailsError, setWorkerDetailsError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostJob, setShowPostJob] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [banner, setBanner] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [editingOpenings, setEditingOpenings] = useState("");

  const fetchAndShowWorkerDetails = async (app) => {
    setSelectedApp(app);
    setSelectedWorkerId(app.worker_id);
    setCandidateSubTab("details");
    setLoadingWorkerDetails(true);
    setWorkerDetailsError(null);
    try {
      const res = await apiRequest(`/workers/${app.worker_id}`);
      setSelectedWorkerDetails(res.data || res.worker || null);
    } catch (err) {
      setWorkerDetailsError(err.message || "Failed to load worker profile from database");
    } finally {
      setLoadingWorkerDetails(false);
    }
  };

  // New Job Form State
  const [jobTitle, setJobTitle] = useState("");
  const [jobDesc, setJobDesc] = useState("");
  const [jobSalaryMin, setJobSalaryMin] = useState(22000);
  const [jobSalaryMax, setJobSalaryMax] = useState(28000);
  const [jobOpenings, setJobOpenings] = useState(2);
  const [jobExp, setJobExp] = useState(2);

  const employerId = currentUser?.id || 501;

  const loadData = async (showSpinner = false) => {
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const [jobsRes, appsRes] = await Promise.all([
        apiRequest(`/jobs?employer_id=${employerId}`),
        apiRequest(`/applications?employer_id=${employerId}`),
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
      navigate("/login/employer");
      return undefined;
    }
    if (user.role !== "employer") {
      navigate("/worker/dashboard");
      return undefined;
    }

    let isMounted = true;
    Promise.all([
      apiRequest(`/jobs?employer_id=${user.id || 501}`),
      apiRequest(`/applications?employer_id=${user.id || 501}`),
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
  }, [navigate]);

  const handleHire = async (app) => {
    try {
      setActionLoading(app.id);
      const res = await apiRequest(`/applications/${app.id}/hire`, { method: "POST" });
      setBanner({
        type: "success",
        title: `Candidate Hired: ${app.worker_name}!`,
        message: `${app.worker_name} is hired for "${app.job_title}". ${res.withdrawnCount > 0 ? `${res.withdrawnCount} other open application(s) for this candidate were automatically withdrawn!` : ""}`,
      });
      setSelectedApp((prev) => (prev && prev.id === app.id ? { ...prev, status: "Selected" } : prev));
      await loadData();
    } catch (err) {
      setBanner({ type: "error", title: "Action Failed", message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (app) => {
    try {
      setActionLoading(app.id);
      await apiRequest(`/applications/${app.id}/revoke`, { method: "POST" });
      setBanner({
        type: "info",
        title: `Selection Revoked: ${app.worker_name}`,
        message: `Candidate selection for "${app.job_title}" was revoked. Opening has been restored.`,
      });
      setSelectedApp((prev) => (prev && prev.id === app.id ? { ...prev, status: "Applied" } : prev));
      await loadData();
    } catch (err) {
      setBanner({ type: "error", title: "Revoke Failed", message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (app) => {
    try {
      setActionLoading(app.id);
      await apiRequest(`/applications/${app.id}/reject`, { method: "POST" });
      setBanner({
        type: "info",
        title: `Candidate Rejected: ${app.worker_name}`,
        message: `Application for "${app.job_title}" was rejected and marked as withdrawn.`,
      });
      setSelectedApp((prev) => (prev && prev.id === app.id ? { ...prev, status: "Rejected" } : prev));
      await loadData();
    } catch (err) {
      setBanner({ type: "error", title: "Reject Failed", message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartEditOpenings = (job) => {
    setEditingJobId(job.id);
    setEditingOpenings(job.openings != null ? job.openings : 1);
  };

  const handleSaveOpenings = async (jobId) => {
    const num = Math.max(0, parseInt(editingOpenings, 10) || 0);
    try {
      setActionLoading(`save-${jobId}`);
      const res = await apiRequest(`/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({ openings: num }),
      });
      const updatedJob = res.data || res.job;
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, openings: updatedJob.openings } : j))
      );
      setEditingJobId(null);
      setBanner({
        type: "success",
        title: "Vacancies Updated!",
        message: `Number of vacancies for "${updatedJob.title}" updated to ${updatedJob.openings}.`,
      });
    } catch (err) {
      setBanner({ type: "error", title: "Update Failed", message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteJob = async (job) => {
    if (!window.confirm(`Are you sure you want to remove the job opening "${job.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      setActionLoading(`del-${job.id}`);
      await apiRequest(`/jobs/${job.id}`, { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      setBanner({
        type: "info",
        title: "Job Opening Removed",
        message: `"${job.title}" was removed from your active openings.`,
      });
      await loadData();
    } catch (err) {
      setBanner({ type: "error", title: "Failed to remove job", message: err.message });
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
          employerId: currentUser.id || 501,
          companyName: currentUser.companyName || currentUser.name || "Employer Company",
          title: jobTitle,
          description: jobDesc,
          location: currentUser.location || "Pune",
          salaryMin: Number(jobSalaryMin),
          salaryMax: Number(jobSalaryMax),
          requiredExperience: Number(jobExp),
          openings: Number(jobOpenings),
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
            <h1>{currentUser.name || "Employer Dashboard"}</h1>
            <p>Welcome back, <strong>{currentUser.name}</strong> (User ID: {currentUser.id}) · Location: {currentUser.location || "Pune"}</p>
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
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span className="badge badge-applied" style={{ fontSize: "13px" }}>
                        {job.openings > 0 ? `${job.openings} Openings Remaining` : "Filled"}
                      </span>
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => handleStartEditOpenings(job)}
                        title="Edit number of vacancies"
                      >
                        <Edit2 size={13} /> Edit Vacancies
                      </button>
                      <button
                        type="button"
                        className="button danger-outline small"
                        disabled={actionLoading === `del-${job.id}`}
                        onClick={() => handleDeleteJob(job)}
                        title="Remove this job opening"
                      >
                        <Trash2 size={13} /> {actionLoading === `del-${job.id}` ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>

                  {editingJobId === job.id && (
                    <div
                      className="vacancy-edit-box"
                      style={{
                        background: "#f6f9f5",
                        border: "1px solid #c9d8c5",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        margin: "10px 0 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--ink)" }}>
                        Openings / Vacancies:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={editingOpenings}
                        onChange={(e) => setEditingOpenings(e.target.value)}
                        style={{
                          width: "90px",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #cfd7cd",
                          fontSize: "14px",
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="button primary small"
                        disabled={actionLoading === `save-${job.id}`}
                        onClick={() => handleSaveOpenings(job.id)}
                      >
                        <Check size={13} /> {actionLoading === `save-${job.id}` ? "Saving..." : "Save Vacancies"}
                      </button>
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => setEditingJobId(null)}
                      >
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  )}

                  <div className="job-tags">
                    <span className="tag">📍 {job.location}</span>
                    <span className="tag">💰 ₹{job.salary_min?.toLocaleString()} - ₹{job.salary_max?.toLocaleString()}/mo</span>
                    <span className="tag">⏱️ {job.shift || "day"} shift</span>
                    <span className="tag">
                      🛠️ {Math.round(Number(job.experience_required != null ? job.experience_required : (job.required_experience != null ? job.required_experience : (job.requiredExperience != null ? job.requiredExperience : 0))))} yrs min exp
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* TAB 2: Candidate Applications */
          <div>
            <div className="subtab-bar">
              <button
                className={`subtab-btn ${candidateSubTab === "list" ? "active" : ""}`}
                onClick={() => setCandidateSubTab("list")}
              >
                <User size={15} /> All Candidates ({applications.length})
              </button>
              <button
                className={`subtab-btn ${candidateSubTab === "details" ? "active" : ""}`}
                onClick={() => {
                  setCandidateSubTab("details");
                  if (!selectedWorkerDetails && applications.length > 0) {
                    fetchAndShowWorkerDetails(applications[0]);
                  }
                }}
              >
                <BadgeCheck size={15} /> Worker Details {selectedWorkerDetails ? `(${selectedWorkerDetails.name})` : ""}
              </button>
            </div>

            {candidateSubTab === "list" ? (
              <div className="candidate-grid">
                {applications.length === 0 ? (
                  <div className="empty-state">No candidate applications received yet for your job openings.</div>
                ) : (
                  applications.map((app) => {
                    const status = app.status || "Applied";
                    const isHired = status === "Selected" || status.toLowerCase() === "hired";
                    const isRejected = status === "Rejected" || status.toLowerCase() === "rejected";
                    const isWithdrawn = status === "Withdrawn" || status.toLowerCase() === "withdrawn";
                    const canHire = ["Applied", "Shortlisted", "applied", "shortlisted"].includes(status);

                    return (
                      <div
                        key={app.id}
                        className={`app-card ${isHired ? "is-hired" : ""} ${isWithdrawn || isRejected ? "is-withdrawn" : ""}`}
                      >
                        <div className="app-card-left">
                          <div className="app-avatar">{app.worker_name ? app.worker_name[0] : "W"}</div>
                          <div className="app-info">
                            <h3>
                              {app.worker_name}
                              {app.occupation && (
                                <span style={{ fontSize: "13px", fontWeight: "normal", color: "var(--muted)", marginLeft: "8px" }}>
                                  · {app.occupation} ({app.experience_years ? `${app.experience_years} yrs exp` : "Experienced"})
                                </span>
                              )}
                            </h3>
                            <div className="app-meta">
                              <span><BriefcaseBusiness size={14} /> Applied for: <strong>{app.job_title}</strong></span>
                              <span><Building2 size={14} /> {app.company_name}</span>
                              {app.worker_location && (
                                <span><MapPin size={14} /> {app.worker_location}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="app-card-right">
                          {isHired ? (
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              <span className="badge badge-shortlisted">
                                <BadgeCheck size={14} />
                                Selected (Hired)
                              </span>
                              <button
                                className="cross-revoke-icon"
                                disabled={actionLoading === app.id}
                                onClick={() => handleRevoke(app)}
                                title="Revoke candidate selection"
                                aria-label="Revoke candidate selection"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : isRejected ? (
                            <span className="badge badge-rejected-red">
                              <X size={14} /> Withdrawn
                            </span>
                          ) : (
                            <span className={`badge badge-${isWithdrawn ? "withdrawn" : "applied"}`}>
                              {isWithdrawn && <X size={14} />}
                              {status}
                            </span>
                          )}

                          <button
                            className="button secondary small"
                            onClick={() => fetchAndShowWorkerDetails(app)}
                          >
                            Details
                          </button>

                          {canHire ? (
                            <>
                              <button
                                className="button danger-outline small"
                                disabled={actionLoading === app.id}
                                onClick={() => handleReject(app)}
                                title="Reject candidate"
                              >
                                <X size={14} /> Reject
                              </button>
                              <button
                                className="button primary small"
                                disabled={actionLoading === app.id}
                                onClick={() => handleHire(app)}
                              >
                                {actionLoading === app.id ? "Processing..." : "Hire Candidate"}
                              </button>
                            </>
                          ) : (
                            <button className="button quiet small" disabled>
                              {isHired ? "Hired" : "Withdrawn"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* DETAILS SUBTAB: Worker Details from Database */
              <div className="worker-details-view">
                {applications.length > 1 && (
                  <div className="candidate-selector-bar">
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted)", marginRight: "4px" }}>
                      Select Candidate:
                    </span>
                    {applications.map((app) => (
                      <button
                        key={app.id}
                        className={`candidate-select-chip ${selectedWorkerId === app.worker_id ? "active" : ""}`}
                        onClick={() => fetchAndShowWorkerDetails(app)}
                      >
                        {app.worker_name} · {app.job_title}
                      </button>
                    ))}
                  </div>
                )}

                {loadingWorkerDetails ? (
                  <div className="empty-state">
                    <Sparkles size={26} style={{ color: "var(--green)", marginBottom: "8px" }} />
                    <p style={{ margin: 0, fontWeight: "600" }}>Fetching worker profile details from database...</p>
                  </div>
                ) : workerDetailsError ? (
                  <div className="banner error">
                    <AlertCircle size={22} />
                    <div>
                      <strong>Failed to load worker profile</strong>
                      <span>{workerDetailsError}</span>
                    </div>
                  </div>
                ) : selectedWorkerDetails ? (
                  <div className="worker-details-card">
                    <div className="worker-details-header">
                      <div className="worker-details-main">
                        <div className="worker-avatar-large">
                          {selectedWorkerDetails.name ? selectedWorkerDetails.name[0] : "W"}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <h2 style={{ margin: 0, fontSize: "22px" }}>{selectedWorkerDetails.name}</h2>
                            <span className="badge badge-applied" style={{ fontSize: "12px" }}>
                              <BadgeCheck size={14} /> Verified Skill Passport
                            </span>
                          </div>
                          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
                            {selectedWorkerDetails.email} · Worker ID: #{selectedWorkerDetails.userId} · Role: {selectedWorkerDetails.role}
                          </p>
                        </div>
                      </div>

                      <div>
                        <button
                          className="button secondary small"
                          onClick={() => setCandidateSubTab("list")}
                        >
                          <ArrowLeft size={14} /> Back to Candidates List
                        </button>
                      </div>
                    </div>

                    {/* Applied Job Info Banner */}
                    {selectedApp && (
                      <div
                        style={{
                          background: "#f4f8f2",
                          border: "1px solid #d2e4ce",
                          borderRadius: "10px",
                          padding: "16px 20px",
                          margin: "22px 0",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "14px",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              textTransform: "uppercase",
                              letterSpacing: "0.7px",
                              color: "var(--green)",
                            }}
                          >
                            Application Context
                          </div>
                          <div style={{ fontSize: "16px", fontWeight: "700", marginTop: "2px" }}>
                            {selectedApp.job_title} · {selectedApp.company_name}
                          </div>
                          {selectedApp.applied_at && (
                            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                              Applied on: {new Date(selectedApp.applied_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          {selectedApp.status === "Selected" || selectedApp.status?.toLowerCase() === "hired" ? (
                            <>
                              <span className="badge badge-shortlisted">
                                <BadgeCheck size={14} /> Selected (Hired)
                              </span>
                              <button
                                className="button revoke-btn small"
                                disabled={actionLoading === selectedApp.id}
                                onClick={() => handleRevoke(selectedApp)}
                                title="Revoke candidate selection"
                              >
                                <X size={14} /> Revoke Selection
                              </button>
                            </>
                          ) : selectedApp.status === "Rejected" || selectedApp.status?.toLowerCase() === "rejected" ? (
                            <span className="badge badge-rejected-red">
                              <X size={14} /> Withdrawn
                            </span>
                          ) : (
                            <span
                              className={`badge badge-${
                                selectedApp.status === "Withdrawn" || selectedApp.status?.toLowerCase() === "withdrawn"
                                  ? "withdrawn"
                                  : "applied"
                              }`}
                            >
                              {selectedApp.status === "Withdrawn" && <X size={14} />}
                              {selectedApp.status}
                            </span>
                          )}

                          {["Applied", "Shortlisted", "applied", "shortlisted"].includes(selectedApp.status) && (
                            <>
                              <button
                                className="button danger-outline small"
                                disabled={actionLoading === selectedApp.id}
                                onClick={() => handleReject(selectedApp)}
                                title="Reject candidate"
                              >
                                <X size={14} /> Reject
                              </button>
                              <button
                                className="button primary small"
                                disabled={actionLoading === selectedApp.id}
                                onClick={() => handleHire(selectedApp)}
                              >
                                {actionLoading === selectedApp.id ? "Processing..." : "Hire Candidate"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Key Attributes Grid */}
                    <div className="worker-details-grid">
                      <div className="worker-detail-item">
                        <span className="worker-detail-label">Trade / Occupation</span>
                        <p className="worker-detail-val">{selectedWorkerDetails.occupation || "Specialist"}</p>
                      </div>
                      <div className="worker-detail-item">
                        <span className="worker-detail-label">Experience</span>
                        <p className="worker-detail-val">
                          {selectedWorkerDetails.experienceYears
                            ? `${selectedWorkerDetails.experienceYears} Years`
                            : "Experienced"}
                        </p>
                      </div>
                      <div className="worker-detail-item">
                        <span className="worker-detail-label">Expected Salary</span>
                        <p className="worker-detail-val">
                          {selectedWorkerDetails.expectedSalaryMin
                            ? `₹${Number(selectedWorkerDetails.expectedSalaryMin).toLocaleString()}/mo`
                            : "Market Standard"}
                        </p>
                      </div>
                      <div className="worker-detail-item">
                        <span className="worker-detail-label">Location & Shift</span>
                        <p className="worker-detail-val">
                          {selectedWorkerDetails.location || "Pune"} · {selectedWorkerDetails.preferredShift || "Day"} shift
                        </p>
                      </div>
                      <div className="worker-detail-item">
                        <span className="worker-detail-label">Primary Language</span>
                        <p className="worker-detail-val">{selectedWorkerDetails.language || "Hindi"}</p>
                      </div>
                    </div>

                    {/* Verified Skills */}
                    <div className="worker-detail-skills">
                      <span className="worker-detail-label">Verified Skill Competencies</span>
                      <div className="skills-tags-wrap">
                        {Array.isArray(selectedWorkerDetails.skills) && selectedWorkerDetails.skills.length > 0 ? (
                          selectedWorkerDetails.skills.map((skill, sIdx) => (
                            <span key={sIdx} className="skill-tag-pill">
                              <Check size={13} />
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: "13px" }}>General Technical Trade Skills</span>
                        )}
                      </div>
                    </div>

                    {/* Employment History */}
                    {Array.isArray(selectedWorkerDetails.employmentHistory) &&
                      selectedWorkerDetails.employmentHistory.length > 0 && (
                        <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--line)" }}>
                          <span className="worker-detail-label">Verified Employment History</span>
                          <div style={{ display: "grid", gap: "10px", marginTop: "10px" }}>
                            {selectedWorkerDetails.employmentHistory.map((hist, hIdx) => (
                              <div
                                key={hIdx}
                                style={{
                                  background: "#f9faf8",
                                  border: "1px solid var(--line)",
                                  borderRadius: "8px",
                                  padding: "12px 16px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <strong>{typeof hist === "string" ? hist : hist.role || "Technician"}</strong>
                                  {typeof hist === "object" && hist.company && (
                                    <span style={{ color: "var(--muted)", marginLeft: "8px", fontSize: "13px" }}>
                                      at {hist.company}
                                    </span>
                                  )}
                                </div>
                                {typeof hist === "object" && hist.duration && (
                                  <span className="tag">{hist.duration}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="empty-state">Select a candidate to view their verified database profile.</div>
                )}
              </div>
            )}
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
