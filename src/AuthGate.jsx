
import { useEffect, useState } from "react";

import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

import { auth } from "./firebase";
import Login from "./Login";
import App from "./App";

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // Login states
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Check Firebase authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
    });

    return unsubscribe;
  }, []);

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoginLoading(true);
      setLoginError("");

      const provider = new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account"
      });

      const result = await signInWithPopup(auth, provider);

      console.log("Google Login Successful:", result.user);

    } catch (error) {
      console.error("Google Login Error:", error.code, error.message);

      setLoginError(error.message);

    } finally {
      setLoginLoading(false);
    }
  };

  // Temporary phone login handlers
  // Connect your existing Firebase OTP functions here.

  const handleSendOtp = async () => {
    setLoginError("Phone OTP authentication is not connected yet.");
  };

  const handleVerifyOtp = async () => {
    setLoginError("Phone OTP verification is not connected yet.");
  };

  const handleResetPhone = () => {
    setOtpSent(false);
    setOtp("");
    setLoginError("");
  };

  if (checking) {
    return (
      <div className="auth-loading">
        Loading CareBridge AI...
      </div>
    );
  }

  return user ? (
    <App />
  ) : (
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
      onSendOtp={handleSendOtp}
      onVerifyOtp={handleVerifyOtp}
      onResetPhone={handleResetPhone}
    />
  );
}
