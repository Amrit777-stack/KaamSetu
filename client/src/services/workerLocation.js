import { apiRequest } from "./api.js";

const GEO_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

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
