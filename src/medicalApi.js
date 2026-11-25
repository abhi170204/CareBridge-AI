
import { auth } from "./firebase";

const API = "https://carebridge-ai-backend-t7y2.onrender.com/api/medical";

async function request(endpoint, options = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return data;
}

export const medicalApi = {
  uploadDocument: (file, type) => {
    const form = new FormData();
    form.append("file", file);
    form.append("document_type", type);

    return request("/documents/upload", {
      method: "POST",
      body: form
    });
  },

  getDocuments: () => request("/documents"),

  getDocumentUrl: (id) =>
    request(`/documents/${id}/url`),

  getProviders: (city, specialization, virtual = false) => {
    const params = new URLSearchParams({
      city,
      specialization,
      virtual: String(virtual)
    });

    return request(`/providers?${params}`);
  },

  bookAppointment: (details) =>
    request("/appointments", {
      method: "POST",
      body: JSON.stringify(details)
    }),

  getAppointments: () => request("/appointments")
};
