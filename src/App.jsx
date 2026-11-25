
import { useCallback, useEffect, useRef, useState } from "react";

import {
  HeartPulse,
  Home,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Search,
  Menu,
  X,
  ArrowRight,
  Stethoscope,
  Hospital,
  Ambulance,
  Moon,
  Sun,
  FileText,
  Video
} from "lucide-react";

import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  getRedirectResult,
  signInWithRedirect,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  updateProfile
} from "firebase/auth";

import { auth } from "./firebase";
import "./Dashboard.jsx";
import MapPage from "./components/MapPage";
import LoadingScreen from "./LoadingScreen";
import Login from "./Login";
import AccidentAssistant from "./components/AccidentAssistant";
import Chatbot from "./components/Chatbot";
import HospitalAppointments from "./components/HospitalAppointments";
import MedicalRecords from "./components/MedicalRecords";
import VirtualConsultation from "./components/VirtualConsultation";

export default function App() {
const [user, setUser] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
const [showSplash, setShowSplash] = useState(true);

const [customerName, setCustomerName] = useState("");
const [phone, setPhone] = useState("");
const [otp, setOtp] = useState("");
const [confirmation, setConfirmation] = useState(null);
const [otpSent, setOtpSent] = useState(false);
const [loginError, setLoginError] = useState("");
const [loginLoading, setLoginLoading] = useState(false);
const [page, setPage] = useState("Home");
const [menu, setMenu] = useState(false);
const [darkMode, setDarkMode] = useState(() => {
  return localStorage.getItem("carebridge-theme") === "dark";
});

useEffect(() => {
  document.documentElement.setAttribute(
    "data-theme",
    darkMode ? "dark" : "light"
  );

  localStorage.setItem(
    "carebridge-theme",
    darkMode ? "dark" : "light"
  );
}, [darkMode]);
const [search, setSearch] = useState("");

const recaptchaRef = useRef(null);
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    getRedirectResult(auth).catch((err) => {
      console.error("Google login error:", err);
      if (active) {
        setLoginError(err.message || "Google login failed.");
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  

  const providers = [
  {
    name: "Sample General Clinic",
    type: "General Physician",
    location: "Kolkata",
    note: "Demonstration listing only"
  },
  {
    name: "Sample Skin Care Centre",
    type: "Dermatologist",
    location: "Kolkata",
    note: "Demonstration listing only"
  },
  {
    name: "Sample Dental Centre",
    type: "Dentist",
    location: "Kolkata",
    note: "Demonstration listing only"
  }
];


async function handleGoogleLogin() {
  setLoginError("");
  setLoginLoading(true);

  try {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  } catch (err) {
    console.error("Google login error:", err);
    setLoginError(err.message || "Google login failed.");
  } finally {
    setLoginLoading(false);
  }
}

async function sendOTP(phoneNumber) {
  setLoginError("");

  if (!customerName.trim()) {
    setLoginError("Please enter your full name.");
    return;
  }

  const formattedPhone = phoneNumber.trim();

  if (!/^\+[1-9]\d{7,14}$/.test(formattedPhone)) {
    setLoginError("Enter a valid phone number with country code.");
    return;
  }

  setLoginLoading(true);

  try {
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }

    recaptchaRef.current = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "normal"
      }
    );

    await recaptchaRef.current.render();

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedPhone,
      recaptchaRef.current
    );

    setPhone(formattedPhone);
    setConfirmation(confirmationResult);
    setOtpSent(true);
  } catch (err) {
    console.error("OTP sending error:", err);
    setLoginError(err.message || "Unable to send OTP.");

    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }
  } finally {
    setLoginLoading(false);
  }
}

async function verifyOTP(code) {
  setLoginError("");

  if (!confirmation) {
    setLoginError("Please request an OTP first.");
    return;
  }

  if (!/^\d{6}$/.test(code.trim())) {
    setLoginError("Please enter a valid 6-digit OTP.");
    return;
  }

  setLoginLoading(true);

  try {
    const credential = await confirmation.confirm(code.trim());

    if (customerName.trim()) {
      await updateProfile(credential.user, {
        displayName: customerName.trim()
      });
    }

    await credential.user.reload();
    setUser(auth.currentUser);
  } catch (err) {
    console.error("OTP verification error:", err);
    setLoginError("Invalid OTP or verification failed.");
  } finally {
    setLoginLoading(false);
  }
}

function resetPhoneLogin() {
  setOtpSent(false);
  setOtp("");
  setConfirmation(null);
  setLoginError("");

  if (recaptchaRef.current) {
    recaptchaRef.current.clear();
    recaptchaRef.current = null;
  }
}

async function handleLogout() {
  try {
    await signOut(auth);

    setPage("Home");
    setUser(null);
    setCustomerName("");
    setPhone("");
    setOtp("");
    setOtpSent(false);
    setConfirmation(null);
  } catch (err) {
    console.error("Logout failed:", err);
  }
}


  function navigate(value) {
    setPage(value);
    setMenu(false);
  }
  
const navigation = [
  { name: "Home", icon: Home },
  { name: "AI Assistant", icon: MessageCircle },
  { name: "Accident Assistance", icon: Ambulance },
  { name: "Care Finder", icon: MapPin },
  { name: "Medical Records", icon: FileText },
  { name: "Hospital Appointments", icon: Hospital },
  { name: "Virtual Consultation", icon: Video }
];

  const displayName =
    user?.displayName ||
    user?.email ||
    user?.phoneNumber ||
    "Customer";

   if (authLoading) {
  return (
    <div className="auth-loading">
      Checking authentication...
    </div>
  );
}

  if (!user) {
  return (
    <Login
      customerName={customerName}
      setCustomerName={setCustomerName}
      phone={phone}
      setPhone={setPhone}
      otp={otp}
      setOtp={setOtp}
      otpSent={otpSent}
      loginError={loginError}
      loginLoading={loginLoading}
      onGoogleLogin={handleGoogleLogin}
      onSendOtp={sendOTP}
      onVerifyOtp={verifyOTP}
      onResetPhone={resetPhoneLogin}
    />
  );
}

    if (showSplash || authLoading) {
    return <LoadingScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className="app">

      <aside className={`sidebar ${menu ? "show" : ""}`}>

        <div className="brand">

          <div className="brand-icon">
            <HeartPulse size={26} />
          </div>

          <div>
            <h2>
              CareBridge <span>AI</span>
            </h2>
            <small>HEALTHCARE ASSISTANT</small>
          </div>

          <button
            className="close-menu"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>

        </div>

        <p className="nav-heading">MENU</p>

        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              className={`nav-item ${page === item.name ? "active" : ""}`}
              onClick={() => navigate(item.name)}
            >
              <Icon size={19} />
              {item.name}
            </button>
          );
        })}

        <div className="sidebar-bottom">
          <ShieldCheck size={23} />
          <h4>Your safety matters</h4>
          <p>
            This educational prototype does not replace
            professional medical care.
          </p>
        </div>

      </aside>

      <main className="main">

        <header className="topbar">

          <button
            className="mobile-menu"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>

          <div className="breadcrumb">
            Workspace / <strong>{page}</strong>
          </div>

          <div className="top-status">
            <span className="status-dot"></span>
            Prototype Mode
          </div>

          <div className="user-section">

  <button
    className="theme-toggle"
    onClick={() => setDarkMode((previous) => !previous)}
    title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
    aria-label="Change appearance"
  >
    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
  </button>

  <span>
    Welcome, {displayName}
  </span>

  <button
    className="logout-btn"
    onClick={handleLogout}
  >
    Logout
  </button>

</div>

        </header>

        <div className="content">

          {page === "Home" && (
            <>

              <section className="hero">

                <div>

                  <h2 style={{ marginBottom: "18px" }}>
                    Welcome, {displayName}!
                  </h2>

                  <span className="eyebrow">
                    YOUR HEALTH, YOUR NEXT STEP
                  </span>

                  <h1>
                    Healthcare guidance<br />
                    <span>made simpler.</span>
                  </h1>

                  <p>
                    Explore general first-aid information,
                    recognize warning signs and find
                    appropriate healthcare services.
                  </p>

                  <button
                    className="primary-btn"
                    onClick={() => navigate("AI Assistant")}
                  >
                    Start Health Assistant
                    <ArrowRight size={17} />
                  </button>

                </div>

                <div className="hero-art">

                  <div className="heart-circle">
                    <HeartPulse size={80} />
                  </div>

                  <div className="floating-card">
                    <ShieldCheck /> Safety first
                  </div>

                </div>

              </section>

              <section className="stats">

                <div className="stat">
                  <MessageCircle />
                  <div>
                    <h3>AI Assistant</h3>
                    <p>Health information</p>
                  </div>
                </div>

                <div className="stat">
                  <ShieldCheck />
                  <div>
                    <h3>Safety Screening</h3>
                    <p>Warning reminders</p>
                  </div>
                </div>

                <div className="stat">
                  <Hospital />
                  <div>
                    <h3>Care Finder</h3>
                    <p>Healthcare directory</p>
                  </div>
                </div>

              </section>

              <h2 className="section-title">
                What would you like to do?
              </h2>

              <section className="feature-grid">

                <Feature
                   icon={<Ambulance />}
                   title="Accident Assistance"
                   description="Report an accident and get first-aid guidance."
                   action={() => navigate("Accident Assistance")}
                />

                <Feature
                  icon={<MessageCircle />}
                  title="Health Assistant"
                  description="Describe a health concern."
                  action={() => navigate("AI Assistant")}
                />

                <Feature
                  icon={<Stethoscope />}
                  title="Find Healthcare"
                  description="Explore healthcare providers."
                  action={() => navigate("Care Finder")}
                />

              </section>

              <div className="disclaimer">
                <ShieldCheck />
                <span>
                  CareBridge AI is an educational prototype.
                  It cannot diagnose, prescribe or rule out emergencies.
                </span>
              </div>

            </>
          )}

          {page === "Accident Assistance" && (
            <AccidentAssistant />
          )}
          {page === "AI Assistant" && (
             <Chatbot user={user} />
          )}

          {page === "Medical Records" && (
             <MedicalRecords />
          )}

          {page === "Hospital Appointments" && (
             <HospitalAppointments />
          )}

          {page === "Virtual Consultation" && (
             <VirtualConsultation />
          )}


          {page === "Care Finder" && (
            <>

              <PageTitle
                title="Healthcare Finder"
                subtitle="Explore the sample healthcare directory."
              />

              <div className="search">
                <Search />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search doctor or specialty..."
                />
              </div>

              <div className="provider-grid">

                {providers
                  .filter((p) =>
                    `${p.name} ${p.type} ${p.location}`
                      .toLowerCase()
                      .includes(search.toLowerCase())
                  )
                  .map((p, i) => (
                    <div className="panel provider" key={i}>

                      <Hospital />

                      <span className="sample-label">SAMPLE</span>

                      <h3>{p.name}</h3>

                      <p>{p.type}</p>

                      <p>
                        <MapPin size={15} /> {p.location}
                      </p>

                      <small>{p.note}</small>

                    </div>
                  ))}

              </div>

            <MapPage />
            </>
          )}

        </div>

        <footer>
          © 2026 CareBridge AI | Educational Student Prototype
        </footer>

      </main>

    </div>
  );
}

function Feature({ icon, title, description, action }) {
  return (
    <button className="feature-card" onClick={action}>

      <div className="feature-icon">{icon}</div>

      <h3>{title}</h3>

      <p>{description}</p>

      <span>
        Explore <ArrowRight size={15} />
      </span>

    </button>
  );
}

function PageTitle({ title, subtitle }) {
  return (
    <div className="page-title">

      <span>CAREBRIDGE AI</span>

      <h1>{title}</h1>

      <p>{subtitle}</p>

    </div>
  );
}
