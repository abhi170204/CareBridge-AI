
import { useEffect, useState } from "react";
import "./LoadingScreen.css";

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2500;
    const interval = 25;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((previous) => {
        const next = Math.min(previous + increment, 100);

        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => onComplete(), 300);
        }

        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="loading-page">
      <div className="loading-top-wave"></div>

      <div className="medical-symbol symbol-one">+</div>
      <div className="medical-symbol symbol-two">+</div>
      <div className="medical-symbol symbol-three">+</div>

      <div className="loading-content">

        <div className="logo-animation">
          <div className="logo-glow"></div>
          <img
            src="CareBridge-AI Logo.png"
            alt="CareBridge AI Logo"
            className="loading-logo"
          />
        </div>

        <div className="heartbeat-line">
          <svg viewBox="0 0 600 90" preserveAspectRatio="none">
            <path
              d="M0 45 H170 L195 45 L220 15 L245 75 L270 45 H290 L315 5 L340 85 L365 45 H400 L425 25 L450 65 L475 45 H600"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="heartbeat-path"
            />
          </svg>
        </div>

        <h1 className="loading-brand">
          CareBridge <span>AI</span>
        </h1>

        <p className="loading-tagline">
          Your Health, Our Priority.
        </p>

        <div className="loading-progress">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            >
              <div className="progress-light"></div>
            </div>
          </div>

          <span className="progress-number">
            {Math.floor(progress)}%
          </span>
        </div>

        <p className="loading-message">
          <span className="loading-spinner"></span>
          Preparing your personalized health experience...
        </p>

        <div className="loading-features">
          <div className="loading-feature">
            <span>✚</span>
            <p>Trusted<br />Healthcare</p>
          </div>

          <div className="feature-divider"></div>

          <div className="loading-feature">
            <span>♡</span>
            <p>Smart<br />Care</p>
          </div>

          <div className="feature-divider"></div>

          <div className="loading-feature">
            <span>♧</span>
            <p>Healthier<br />Tomorrow</p>
          </div>
        </div>

      </div>

      <div className="loading-bottom-wave">
        <div className="bottom-heartbeat">♡</div>
      </div>
    </div>
  );
}
