
import { useEffect, useState } from "react";
import {
  FileText, UploadCloud, FileImage, FileCheck2,
  ShieldCheck, Download, RefreshCw, FolderOpen
} from "lucide-react";
import { medicalApi } from "../medicalApi";
import "./MedicalPages.css";

export default function MedicalRecords() {
  const [documents, setDocuments] = useState([]);
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState("report");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadDocuments() {
    setLoading(true);
    setError("");

    try {
      const result = await medicalApi.getDocuments();
      setDocuments(
        Array.isArray(result) ? result : result.documents || []
      );
    } catch (err) {
      setError(err.message || "Unable to load medical records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  async function uploadDocument(e) {
    e.preventDefault();

    if (!file) {
      setError("Please select a document first.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10 MB.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      await medicalApi.uploadDocument(file, documentType);
      setFile(null);
      e.target.reset();
      setMessage("Your medical document was uploaded successfully.");
      await loadDocuments();
    } catch (err) {
      setError(err.message || "Document upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function openDocument(id) {
    try {
      const result = await medicalApi.getDocumentUrl(id);
      const url = result.url || result.signed_url;

      if (!url) throw new Error("Secure document link was not returned.");

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message || "Unable to open document.");
    }
  }

  return (
    <div className="med-page">
      <div className="med-container">
        <div className="med-heading">
          <span className="med-eyebrow">
            <ShieldCheck size={14} /> PRIVATE HEALTHCARE VAULT
          </span>
          <h1>Medical Records</h1>
          <p>Keep your important medical documents organized in one place.</p>
        </div>

        <div className="med-hero">
          <div>
            <h2>Your health history, always organized.</h2>
            <p>
              Store medical reports, prescriptions and scan documents.
              Access your records securely through your account.
            </p>
          </div>
          <div className="med-hero-icon">
            <FolderOpen size={47} />
          </div>
        </div>

        <div className="med-grid" style={{ marginBottom: 22 }}>
          <div className="med-card">
            <div className="med-icon"><FileText size={23} /></div>
            <h3>Medical Reports</h3>
            <p>Save laboratory results and health reports.</p>
          </div>

          <div className="med-card">
            <div className="med-icon"><FileCheck2 size={23} /></div>
            <h3>Prescriptions</h3>
            <p>Keep your prescription documents together.</p>
          </div>

          <div className="med-card">
            <div className="med-icon"><FileImage size={23} /></div>
            <h3>Scans & Images</h3>
            <p>Organize supported scan and image files.</p>
          </div>
        </div>

        <div className="med-card">
          <h2 style={{ fontSize: 20, marginBottom: 7 }}>
            Upload a medical document
          </h2>
          <p style={{ marginBottom: 20 }}>
            Supported formats: PDF, JPG and PNG. Maximum size: 10 MB.
          </p>

          <form onSubmit={uploadDocument}>
            <div className="med-field">
              <label>Document category</label>
              <select
                className="med-select"
                value={documentType}
                onChange={e => setDocumentType(e.target.value)}
              >
                <option value="report">Medical Report</option>
                <option value="prescription">Prescription</option>
                <option value="scan">Scan / Image</option>
              </select>
            </div>

            <div className="med-field">
              <label>Select document</label>
              <input
                className="med-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {file && (
              <div className="med-success">
                Selected: {file.name}
              </div>
            )}

            <button className="med-btn" disabled={uploading}>
              <UploadCloud size={16} />
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </form>
        </div>

        {error && <div className="med-alert">{error}</div>}
        {message && <div className="med-success">{message}</div>}

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          margin: "27px 0 15px"
        }}>
          <div>
            <h2 style={{ fontSize: 20 }}>Your documents</h2>
            <p style={{ color: "#8292a4", fontSize: 13 }}>
              {documents.length} saved document(s)
            </p>
          </div>

          <button
            className="med-btn secondary"
            onClick={loadDocuments}
            disabled={loading}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        <div className="med-grid">
          {loading && <div className="med-empty">Loading your records...</div>}

          {!loading && documents.length === 0 && (
            <div className="med-empty">
              <FolderOpen size={36} />
              <h3>No medical records yet</h3>
              <p>Upload your first report or prescription to get started.</p>
            </div>
          )}

          {!loading && documents.map(doc => (
            <div className="med-card" key={doc.id}>
              <div className="med-record">
                <div className="med-record-icon">
                  <FileText size={23} />
                </div>
                <div className="med-record-info">
                  <h3>{doc.file_name || doc.name || "Medical Document"}</h3>
                  <p>{doc.document_type || "Medical record"}</p>
                </div>
              </div>

              <div className="med-record-actions">
                <button
                  className="med-btn secondary"
                  onClick={() => openDocument(doc.id)}
                >
                  <Download size={15} /> View Securely
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="med-alert" style={{ marginTop: 22 }}>
          Your medical documents contain sensitive information.
          Do not share secure document links with other people.
        </div>
      </div>
    </div>
  );
}
