import { apiRequest } from "./api.js";

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

export const KNOWN_CITY_COORDINATES = {
  pune: { latitude: 18.5204, longitude: 73.8567 },
  mumbai: { latitude: 19.0760, longitude: 72.8777 },
  chennai: { latitude: 13.0827, longitude: 80.2707 },
  vellore: { latitude: 12.9165, longitude: 79.1325 },
  katpadi: { latitude: 12.9707, longitude: 79.1637 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  bangalore: { latitude: 12.9716, longitude: 77.5946 },
  delhi: { latitude: 28.6139, longitude: 77.2090 },
  "new delhi": { latitude: 28.6139, longitude: 77.2090 },
  hyderabad: { latitude: 17.3850, longitude: 78.4867 },
  ahmedabad: { latitude: 23.0225, longitude: 72.5714 },
  kochi: { latitude: 9.9312, longitude: 76.2673 },
  patna: { latitude: 25.5941, longitude: 85.1376 },
  mysuru: { latitude: 12.2958, longitude: 76.6394 },
  bhubaneswar: { latitude: 20.2961, longitude: 85.8245 },
  coimbatore: { latitude: 11.0168, longitude: 76.9558 },
  lucknow: { latitude: 26.8467, longitude: 80.9462 },
  jaipur: { latitude: 26.9084, longitude: 75.7953 },
  ranipet: { latitude: 12.9309, longitude: 79.3373 },
};

export function calculateDistanceKm(latitudeA, longitudeA, latitudeB, longitudeB) {
  const values = [latitudeA, longitudeA, latitudeB, longitudeB].map(Number);
  if (!values.every(Number.isFinite)) return null;
  const [latA, lonA, latB, lonB] = values.map((val) => (val * Math.PI) / 180);
  const latDelta = latB - latA;
  const lonDelta = lonB - lonA;
  const haversine = Math.sin(latDelta / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) ** 2;
  const dist = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return dist < 10 ? Number(dist.toFixed(1)) : Math.round(dist);
}

function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ code: "UNSUPPORTED" });
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS);
  });
}

function messageFor(error) {
  if (error?.code === 1 || error?.code === error?.PERMISSION_DENIED) return "Location access was not allowed. You can still browse jobs, but nearby distance and directions may be unavailable.";
  if (error?.code === 3 || error?.code === error?.TIMEOUT) return "Location request timed out. You can still browse jobs.";
  if (error?.code === "UNSUPPORTED") return "Your browser does not support location. You can still browse jobs.";
  return "Your location is unavailable right now. You can still browse jobs.";
}

// One-time current-location capture shared by worker registration/dashboard and sign-in.
export async function captureAndSaveWorkerLocation() {
  try {
    const position = await currentPosition();
    const saved = await apiRequest("/workers/location", {
      method: "POST",
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
    });
    let city = null;
    try {
      const result = await apiRequest(`/location/reverse?latitude=${encodeURIComponent(saved.location.latitude)}&longitude=${encodeURIComponent(saved.location.longitude)}`);
      city = result.city || null;
    } catch {
      // The stored city remains untouched when reverse geocoding is unavailable.
    }
    return { success: true, location: saved.location, city, message: "Location enabled" };
  } catch (error) {
    return { success: false, message: messageFor(error) };
  }
}
