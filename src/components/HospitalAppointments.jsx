
import { useEffect, useState } from "react";
import {
  Hospital, MapPin, Search, Stethoscope,
  CalendarDays, Clock, UserRound, ShieldCheck
} from "lucide-react";
import { medicalApi } from "../medicalApi";
import "./MedicalPages.css";

export default function HospitalAppointments() {
  const [city, setCity] = useState("Kolkata");
  const [specialization, setSpecialization] = useState("");
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    patient_name: "",
    patient_phone: "",
    appointment_date: "",
    appointment_time: "",
    reason: ""
  });

  async function searchProviders(e) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setProviders([]);

    try {
      const result = await medicalApi.getProviders(
        city,
        specialization,
        false
      );
      setProviders(
        Array.isArray(result) ? result : result.providers || []
      );
    } catch (err) {
      setError(err.message || "Unable to load providers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    searchProviders();
  }, []);

  function updateForm(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function bookAppointment(e) {
    e.preventDefault();
    if (!selected) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await medicalApi.bookAppointment({
        provider_id: selected.id,
        appointment_type: "hospital",
        ...form
      });

      setMessage("Your appointment request has been submitted. It is pending provider confirmation.");
      setSelected(null);
      setForm({
        patient_name: "",
        patient_phone: "",
        appointment_date: "",
        appointment_time: "",
        reason: ""
      });
    } catch (err) {
      setError(err.message || "Appointment request failed.");
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
            <ShieldCheck size={14} /> CAREBRIDGE AI HEALTHCARE
          </span>
          <h1>Hospital Appointments</h1>
          <p>Find healthcare providers and request an appointment with ease.</p>
        </div>

        <div className="med-hero">
          <div>
            <h2>Your healthcare, made simpler.</h2>
            <p>
              Discover providers by location and speciality.
              Send an appointment request without unnecessary steps.
            </p>
          </div>
          <div className="med-hero-icon">
            <Hospital size={48} />
          </div>
        </div>

        <form className="med-card" onSubmit={searchProviders}>
          <h3>Find a doctor or hospital</h3>
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
              <Search size={15} /> {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {error && <div className="med-alert">{error}</div>}
        {message && <div className="med-success">{message}</div>}

        <div style={{ margin: "25px 0 15px" }}>
          <h2 style={{ fontSize: 20 }}>Available providers</h2>
          <p style={{ color: "#8292a4", fontSize: 13, marginTop: 5 }}>
            {providers.length} provider(s) found
          </p>
        </div>

        <div className="med-grid">
          {loading && <div className="med-empty">Loading providers...</div>}

          {!loading && providers.length === 0 && (
            <div className="med-empty">
              <Hospital size={35} />
              <h3>No providers found</h3>
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

              <span className="med-tag">In-person appointments</span>

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
                Request Appointment
              </button>
            </div>
          ))}
        </div>

        {selected && (
          <div className="med-card med-modal">
            <h2 style={{ fontSize: 21, marginBottom: 7 }}>
              Request appointment
            </h2>
            <p style={{ marginBottom: 20 }}>
              With {selected.name} · {selected.specialization}
            </p>

            <form onSubmit={bookAppointment}>
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
                  name="patient_phone"
                  value={form.patient_phone}
                  onChange={updateForm}
                  type="tel"
                  required
                />
              </div>

              <div className="med-form-grid">
                <div className="med-field">
                  <label>Appointment date</label>
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
                <label>Reason for appointment</label>
                <textarea
                  className="med-textarea"
                  name="reason"
                  rows="3"
                  value={form.reason}
                  onChange={updateForm}
                  placeholder="Briefly describe your concern"
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
              <p>Submitting this form sends a request, not a confirmed booking.</p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
