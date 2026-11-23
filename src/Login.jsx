
import { useState } from "react";
import {
  HeartPulse,
  ShieldCheck,
  ArrowRight,
  Phone,
  Mail,
  LockKeyhole,
  Sparkles
} from "lucide-react";
import "./Login.css";

export default function Login({
  customerName,
  setCustomerName,
  phone,
  setPhone,
  otp,
  setOtp,
  otpSent,
  loginError,
  loginLoading,
  onGoogleLogin,
  onSendOtp,
  onVerifyOtp,
  onResetPhone
}) {
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);

  return (
    <div className="login-page">
      <div className="login-shell">

        {/* LEFT BRAND PANEL */}
        <section className="login-brand">

          <div className="login-brand-top">
            <div className="login-logo">
              <HeartPulse size={30} />
            </div>

            <div>
              <h2>CareBridge <span>AI</span></h2>
              <p>SMARTER HEALTHCARE</p>
            </div>
          </div>

          <div className="brand-content">
            <span className="brand-tag">
              <Sparkles size={15} />
              YOUR HEALTH COMPANION
            </span>

            <h1>
              Healthcare that
              <br />
              <span>connects with you.</span>
            </h1>

            <p>
              Discover a simpler way to access health information,
              explore care options and take your next step with confidence.
            </p>

            <div className="brand-feature">
              <div className="brand-feature-icon">
                <ShieldCheck />
              </div>

              <div>
                <h4>Privacy-conscious experience</h4>
                <p>Your account is protected with Firebase authentication.</p>
              </div>
            </div>

            <div className="brand-feature">
              <div className="brand-feature-icon">
                <HeartPulse />
              </div>

              <div>
                <h4>Care, made accessible</h4>
                <p>Health information and healthcare discovery in one place.</p>
              </div>
            </div>
          </div>

          <div className="brand-footer">
            <span>© 2026 CareBridge AI</span>
            <span>Student Prototype</span>
          </div>
        </section>

        {/* RIGHT LOGIN PANEL */}
        <section className="login-form-section">

          <div className="login-form-container">

            <div className="login-mobile-brand">
              <div className="login-logo">
                <HeartPulse size={28} />
              </div>
              <h2>CareBridge <span>AI</span></h2>
            </div>

            <div className="login-heading">
              <span className="login-welcome">WELCOME</span>

              <h1>
                {otpSent ? "Verify your number" : "Welcome back"}
              </h1>

              <p>
                {otpSent
                  ? `Enter the verification code sent to ${phone}`
                  : "Sign in to continue to your healthcare workspace."}
              </p>
            </div>

            {!otpSent && (
              <>
                <button
                  className="google-login"
                  type="button"
                  onClick={onGoogleLogin}
                  disabled={loginLoading}
                >
                  <span className="google-icon">G</span>
                  <span>
                    {loginLoading
                      ? "Connecting..."
                      : "Continue with Google"}
                  </span>
                </button>

                <div className="login-divider">
                  <span>OR CONTINUE WITH PHONE</span>
                </div>
              </>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();

                if (otpSent) {
                  onVerifyOtp(otp);
                } else {
                  onSendOtp(phone);
                }
              }}
            >
              {!otpSent && (
                <>
                  <div className="login-field">
                    <label>Full name</label>

                    <div className="login-input">
                      <Mail size={18} />

                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={customerName}
                        onChange={(e) =>
                          setCustomerName(e.target.value)
                        }
                        autoComplete="name"
                        required
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <label>Mobile number</label>

                    <div className="login-input">
                      <Phone size={18} />

                      <input
                        type="tel"
                        placeholder="+919876543210"
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value)
                        }
                        autoComplete="tel"
                        required
                      />
                    </div>

                    <small>
                      Include your country code, for example +91
                    </small>
                  </div>

                  <div
                    id="recaptcha-container"
                    className="recaptcha-box"
                  />
                </>
              )}

              {otpSent && (
                <div className="login-field">
                  <label>6-digit verification code</label>

                  <div className="login-input otp-input">
                    <LockKeyhole size={18} />

                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) =>
                        setOtp(
                          e.target.value.replace(/\D/g, "")
                        )
                      }
                      required
                    />
                  </div>
                </div>
              )}

              {loginError && (
                <div className="login-error">
                  {loginError}
                </div>
              )}

              <button
                className="login-submit"
                type="submit"
                disabled={loginLoading}
              >
                <span>
                  {loginLoading
                    ? "Please wait..."
                    : otpSent
                    ? "Verify & Sign In"
                    : "Send Verification Code"}
                </span>

                {!loginLoading && <ArrowRight size={18} />}
              </button>
            </form>

            {otpSent && (
              <button
                className="login-back"
                type="button"
                onClick={onResetPhone}
              >
                Change phone number
              </button>
            )}

            {!otpSent && (
              <p className="login-alternative">
                Prefer Google? Use the Google sign-in option above.
              </p>
            )}

            <div className="login-security">
              <ShieldCheck size={17} />

              <span>
                Secure authentication powered by Firebase
              </span>
            </div>

            <p className="login-legal">
              By continuing, you agree to our Terms of Service
              and Privacy Policy.
            </p>

          </div>
        </section>
      </div>
    </div>
  );
}
