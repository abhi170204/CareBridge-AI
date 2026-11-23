
import { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./MapPage.css";

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const userIcon = L.divIcon({
  className: "user-map-icon",
  html: '<div class="user-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const hospitalIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

export default function MapPage() {
  const [center, setCenter] = useState([
    22.5726,
    88.3639
  ]);

  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationMessage, setLocationMessage] =
    useState("Showing Kolkata");

  const findNearbyHospitals = async (latitude, longitude) => {
    setLoading(true);
    setError("");
    setHospitals([]);

    try {
      const response = await fetch(
        `${API_URL}/locations/nearby?lat=${latitude}&lon=${longitude}&radius=5000`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to find nearby hospitals."
        );
      }

      setHospitals(data.places || []);

      if (!data.places?.length) {
        setError("No healthcare locations found nearby.");
      }
    } catch (err) {
      setError(err.message || "Unable to load locations.");
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Your browser does not support location.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setCenter([latitude, longitude]);
        setLocationMessage("Showing your current location");

        await findNearbyHospitals(latitude, longitude);
      },
      () => {
        setLoading(false);
        setError(
          "Location permission denied. Please allow location access."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000
      }
    );
  };

  return (
    <div className="map-page">
      <div className="map-header">
        <div>
          <h2>Find Healthcare Nearby</h2>
          <p>{locationMessage}</p>
        </div>

        <button
          onClick={useMyLocation}
          disabled={loading}
        >
          {loading ? "Searching..." : "Use My Location"}
        </button>
      </div>

      {error && (
        <div className="map-error">
          {error}
        </div>
      )}

      <div className="map-results">
        {hospitals.length} healthcare locations found
      </div>

      <MapContainer
        key={`${center[0]}-${center[1]}`}
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        className="carebridge-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <Marker position={center} icon={userIcon}>
          <Popup>Your selected location</Popup>
        </Marker>

        {hospitals.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lon]}
            icon={hospitalIcon}
          >
            <Popup>
              <strong>{place.name}</strong>
              <br />
              {place.type}
              <br />
              {place.address || "Address unavailable"}
              <br />
              <a
                href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=17/${place.lat}/${place.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                View on OpenStreetMap
              </a>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="hospital-list">
        {hospitals.map((place) => (
          <div className="hospital-card" key={place.id}>
            <h3>{place.name}</h3>
            <p>{place.type}</p>
            <p>{place.address || "Address unavailable"}</p>
            <a
              href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=17/${place.lat}/${place.lon}`}
              target="_blank"
              rel="noreferrer"
            >
              Open location
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
