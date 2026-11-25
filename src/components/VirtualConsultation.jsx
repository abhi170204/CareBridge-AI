
import { useEffect, useState } from "react";
import {
  Video, Search, MapPin, Stethoscope,
  CalendarDays, Clock, ShieldCheck, MonitorPlay
} from "lucide-react";
import { medicalApi } from "../medicalApi";
import "./MedicalPages.css";

export default function VirtualConsultation() {
  const [city, setCity] = useState("Kolkata");
  const [specialization, setSpecialization] = useState("");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    patient_name: "",
    patient_phone: "",
    appointment_date: "",
    appointment_time: "",
    reason: ""
  });

  async function searchDoctors(e) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setProviders([]);

    try {
      const result = await medicalApi.getProviders(
        city,
        specialization,
        true
      );

      setProviders(
        Array.isArray(result) ? result : result.providers || []
      );
    } catch (err) {
      setError(err.message || "Unable to find online doctors.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    searchDoctors();
  }, []);

  function updateForm(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function requestConsultation(e) {
    e.preventDefault();
    if (!selected) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await medicalApi.bookAppointment({
        provider_id: selected.id,
        appointment_type: "virtual",
        ...form
      });

      setMessage(
        "Your virtual consultation request has been submitted. Please wait for confirmation."
      );

      setSelected(null);
      setForm({
        patient_name: "",
        patient_phone: "",
        appointment_date: "",
        appointment_time: "",
        reason: ""
      });
    } catch (err) {
      setError(err.message || "Unable to submit consultation request.");
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="med-page">
      <div className="med-container">
        <div className="med-heading">
          <span className="med-eyebrow">
            <ShieldCheck size={14} /> DIGITAL HEALTHCARE
          </span>
          <h1>Virtual Consultation</h1>
          <p>Connect with healthcare providers through online consultation requests.</p>
        </div>

        <div className="med-hero">
          <div>
            <h2>Healthcare from wherever you are.</h2>
            <p>
              Discover providers offering virtual consultations.
              Choose a convenient date and time to request an online appointment.
            </p>
          </div>
          <div className="med-hero-icon">
            <Video size={48} />
          </div>
        </div>

        <div className="med-grid" style={{ marginBottom: 23 }}>
          <div className="med-card">
            <div className="med-icon"><Search size={22} /></div>
            <h3>Find a Specialist</h3>
            <p>Search virtual providers by speciality and location.</p>
          </div>

          <div className="med-card">
            <div className="med-icon"><CalendarDays size={22} /></div>
            <h3>Choose a Time</h3>
            <p>Submit your preferred consultation date and time.</p>
          </div>

          <div className="med-card">
            <div className="med-icon"><MonitorPlay size={22} /></div>
            <h3>Online Consultation</h3>
            <p>Receive confirmation and consultation instructions from the provider.</p>
          </div>
        </div>

        <form className="med-card" onSubmit={searchDoctors}>
          <h3>Discover online doctors</h3>

          <div className="med-toolbar">
            <input
              className="med-input"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Enter city"
              required
            />

            <select
              className="med-select"
              value={specialization}
              onChange={e => setSpecialization(e.target.value)}
            >
              <option value="">All specializations</option>
              <option>General Physician</option>
              <option>Cardiologist</option>
              <option>Dermatologist</option>
              <option>Neurologist</option>
              <option>Orthopedic</option>
              <option>Pediatrician</option>
              <option>Gynecologist</option>
            </select>

            <button className="med-btn" disabled={loading}>
              <Search size={15} /> {loading ? "Searching..." : "Find Doctors"}
            </button>
          </div>
        </form>

        {error && <div className="med-alert">{error}</div>}
        {message && <div className="med-success">{message}</div>}

        <div style={{ margin: "26px 0 15px" }}>
          <h2 style={{ fontSize: 20 }}>Online healthcare providers</h2>
          <p style={{ color: "#8292a4", fontSize: 13, marginTop: 5 }}>
            {providers.length} provider(s) found
          </p>
        </div>

        <div className="med-grid">
          {loading && <div className="med-empty">Finding online providers...</div>}

          {!loading && providers.length === 0 && (
            <div className="med-empty">
              <Video size={36} />
              <h3>No online providers found</h3>
              <p>Try another city or specialization.</p>
            </div>
          )}

          {!loading && providers.map(provider => (
            <div className="med-card med-provider" key={provider.id}>
              <div className="med-provider-top">
                <div className="med-avatar">
                  <Stethoscope size={23} />
                </div>
                <div className="med-provider-info">
                  <h3>{provider.name}</h3>
                  <p>{provider.specialization || "Healthcare Provider"}</p>
                </div>
              </div>

              <span className="med-tag blue">
                <Video size={12} /> Virtual consultation
              </span>

              <div className="med-divider" />

              <p>
                <MapPin size={14} style={{ verticalAlign: "middle" }} />{" "}
                {provider.city || city}
              </p>

              <button
                className="med-btn"
                style={{ marginTop: 8 }}
                onClick={() => setSelected(provider)}
              >
                Request Online Consultation
              </button>
            </div>
          ))}
        </div>

        {selected && (
          <div className="med-card med-modal">
            <h2 style={{ fontSize: 21, marginBottom: 7 }}>
              Virtual consultation request
            </h2>
            <p style={{ marginBottom: 20 }}>
              With {selected.name} · {selected.specialization}
            </p>

            <form onSubmit={requestConsultation}>
              <div className="med-field">
                <label>Patient name</label>
                <input
                  className="med-input"
                  name="patient_name"
                  value={form.patient_name}
                  onChange={updateForm}
                  required
                />
              </div>

              <div className="med-field">
                <label>Phone number</label>
                <input
                  className="med-input"
                  type="tel"
                  name="patient_phone"
                  value={form.patient_phone}
                  onChange={updateForm}
                  required
                />
              </div>

              <div className="med-form-grid">
                <div className="med-field">
                  <label>Consultation date</label>
                  <input
                    className="med-input"
                    type="date"
                    name="appointment_date"
                    min={today}
                    value={form.appointment_date}
                    onChange={updateForm}
                    required
                  />
                </div>

                <div className="med-field">
                  <label>Preferred time</label>
                  <input
                    className="med-input"
                    type="time"
                    name="appointment_time"
                    value={form.appointment_time}
                    onChange={updateForm}
                    required
                  />
                </div>
              </div>

              <div className="med-field">
                <label>Reason for consultation</label>
                <textarea
                  className="med-textarea"
                  rows="3"
                  name="reason"
                  value={form.reason}
                  onChange={updateForm}
                  placeholder="Describe your health concern"
                  required
                />
              </div>

              {error && <div className="med-alert">{error}</div>}

              <div className="med-toolbar">
                <button className="med-btn" disabled={saving}>
                  {saving ? "Submitting..." : "Submit Request"}
                </button>

                <button
                  type="button"
                  className="med-btn secondary"
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </button>
              </div>

              <p>
                This submits an appointment request. It does not start a video
                call or confirm a consultation.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
