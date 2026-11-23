import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Ambulance,
  Camera,
  Upload,
  ShieldCheck,
  Phone,
  X,
  Send,
  LoaderCircle
} from "lucide-react";
import "./AccidentAssistant.css";

const API =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function AccidentAssistant() {
  const [patientCategory, setPatientCategory] = useState("Adult");
  const [accidentTime, setAccidentTime] = useState("Just now");
  const [accidentType, setAccidentType] = useState("Road accident");
  const [description, setDescription] = useState("");
  const [emergencySigns, setEmergencySigns] = useState("");
  const [language, setLanguage] = useState("English");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");   

useEffect(() => {
  if (!photo) {
    setPhotoPreview("");
    return;
  }

  const imageUrl = URL.createObjectURL(photo);
  setPhotoPreview(imageUrl);

  return () => URL.revokeObjectURL(imageUrl);
}, [photo]);

  function handlePhoto(e) {
    const selected = e.target.files?.[0];

    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    setPhoto(selected);
    setError("");
  }

  async function submitAccident(e) {
    e.preventDefault();

    setError("");
    setResult(null);

    if (description.trim().length < 5) {
      setError("Please describe what happened.");
      return;
    }

    if (!consent) {
      setError("Please provide consent for AI processing.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("patient_category", patientCategory);
      formData.append("accident_time", accidentTime);
      formData.append("accident_type", accidentType);
      formData.append("description", description);
      formData.append("emergency_signs", emergencySigns);
      formData.append("language", language);
      formData.append("consent_to_ai_processing", "true");

      if (photo) {
        formData.append("photo", photo);
      }

      const response = await fetch(
        `${API}/api/accident-assist`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to process accident information."
        );
      }

      setResult(data);

    } catch (err) {
      console.error("Accident assistance error:", err);
      setError(
        err.message || "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setPatientCategory("Adult");
    setAccidentTime("Just now");
    setAccidentType("Road accident");
    setDescription("");
    setEmergencySigns("");
    setLanguage("English");
    setPhoto(null);
    setConsent(false);
    setResult(null);
    setError("");
  }

  return (
    <div className="accident-page">

      <div className="accident-header">
        <div className="accident-heading-icon">
          <Ambulance size={30} />
        </div>

        <div>
          <h1>Accident & Emergency Assistance</h1>
          <p>
            Get general first-aid information and emergency guidance.
          </p>
        </div>
      </div>

      <div className="accident-emergency">
        <div>
          <AlertTriangle size={26} />

          <div>
            <h3>Facing a medical emergency?</h3>
            <p>
              Do not wait for AI analysis. Contact emergency services.
            </p>
          </div>
        </div>

        <a href="tel:112">
          <Phone size={18} />
          Call 112
        </a>
      </div>

      <form
        className="accident-form"
        onSubmit={submitAccident}
      >

        <h2>Patient Information</h2>

        <label>Who is injured?</label>

        <select
          value={patientCategory}
          onChange={(e) => setPatientCategory(e.target.value)}
        >
          <option value="Infant">Infant (under 1 year)</option>
          <option value="Child">Child (1–12 years)</option>
          <option value="Adolescent">Adolescent (13–17 years)</option>
          <option value="Adult">Adult (18–59 years)</option>
          <option value="Older Adult">Older Adult (60+ years)</option>
          <option value="Unknown">Age unknown</option>
        </select>

        <label>When did the accident happen?</label>

        <select
          value={accidentTime}
          onChange={(e) => setAccidentTime(e.target.value)}
        >
          <option>Just now</option>
          <option>Within the last hour</option>
          <option>2-6 hours ago</option>
          <option>Yesterday</option>
          <option>2 days ago</option>
          <option>3-7 days ago</option>
          <option>More than a week ago</option>
        </select>

        <label>What type of accident happened?</label>

        <select
          value={accidentType}
          onChange={(e) => setAccidentType(e.target.value)}
        >
          <option>Road accident</option>
          <option>Fall from height</option>
          <option>Workplace accident</option>
          <option>Burn injury</option>
          <option>Electric shock</option>
          <option>Sports injury</option>
          <option>Animal bite</option>
          <option>Other / Unknown</option>
        </select>

        <label>Describe the accident and injury</label>

        <textarea
          rows="5"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Explain what happened, where the injury is and what the patient is experiencing..."
          required
          maxLength={2000}
        />

        <label>
          Any serious warning signs? Mention them if present.
        </label>

        <textarea
          rows="3"
          value={emergencySigns}
          onChange={(e) => setEmergencySigns(e.target.value)}
          placeholder="Example: unconscious, severe bleeding, difficulty breathing..."
          maxLength={1000}
        />

        <div className="accident-note">
          If there is unconsciousness, abnormal breathing or severe
          bleeding, call 112 immediately. Do not wait to complete this form.
        </div>

        <label>Preferred response language</label>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option>English</option>
          <option>Bengali</option>
          <option>Hindi</option>
        </select>

        <h2>Upload Injury Photograph</h2>

        <label className="accident-upload">

          <Camera size={27} />

          <span>
            {photo ? photo.name : "Take a photo or upload an image"}

            <small>
              Optional. JPG, PNG or WEBP. Maximum 5 MB.
            </small>
          </span>

          <Upload size={20} />

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={handlePhoto}
          />

        </label>

        {photo && (
          <div className="accident-photo-preview">

            <img
              src={URL.createObjectURL(photo)}
              alt="Selected injury"
            />

            <button
              type="button"
              onClick={() => setPhoto(null)}
            >
              <X size={16} />
              Remove image
            </button>

          </div>
        )}

        <label className="accident-consent">

          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <span>
            I consent to sending the information and optional photograph
            to the AI service for processing. I understand that this is
            not a medical diagnosis.
          </span>

        </label>

        {error && (
          <div className="accident-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="accident-submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <LoaderCircle className="accident-spinner" />
              Processing...
            </>
          ) : (
            <>
              <Send size={18} />
              Submit Accident Information
            </>
          )}
        </button>

      </form>

      {result && (
        <div
          className={`accident-result ${
            result.emergency ? "danger" : ""
          }`}
        >

          <h2>
            {result.emergency
              ? "Emergency Warning"
              : "CareBridge AI Guidance"}
          </h2>

          <p className="accident-result-message">
            {result.message}
          </p>

          {result.emergency && (
            <a href="tel:112" className="accident-call">
              <Phone size={18} />
              Call 112 Now
            </a>
          )}

          <p className="accident-disclaimer">
            {result.disclaimer}
          </p>

          <button
            type="button"
            onClick={resetForm}
            className="accident-reset"
          >
            Submit Another Accident Report
          </button>

        </div>
      )}

      <div className="accident-footer-note">
        <ShieldCheck size={19} />
        AI guidance cannot replace emergency services or a qualified doctor.
        A photograph cannot rule out internal injuries.
      </div>

    </div>
  );
}

export default AccidentAssistant;
