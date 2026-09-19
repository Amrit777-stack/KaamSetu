import { pool, isDatabaseConfigured } from "../config/db.js";

const reverseCache = new Map();
let lastNominatimRequestAt = 0;

function coordinate(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export function validateCoordinates(latitude, longitude) {
  const lat = coordinate(latitude, -90, 90);
  const lng = coordinate(longitude, -180, 180);
  if (lat === null || lng === null) {
    const error = new Error("Valid latitude and longitude are required");
    error.status = 400;
    throw error;
  }
  return { latitude: lat, longitude: lng };
}

export async function reverseGeocode(latitude, longitude) {
  const { latitude: lat, longitude: lng } = validateCoordinates(latitude, longitude);
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = reverseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  // Nominatim's public service asks clients to stay at or below one request/sec.
  const wait = Math.max(0, 1000 - (Date.now() - lastNominatimRequestAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastNominatimRequestAt = Date.now();

  let response;
  try {
    response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=10&addressdetails=1`, {
      headers: { "User-Agent": process.env.NOMINATIM_USER_AGENT || "KaamSetu demo location feature" },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    const error = new Error("Reverse geocoding is currently unavailable");
    error.status = 503;
    throw error;
  }
  if (!response.ok) {
    const error = new Error("Reverse geocoding is currently unavailable");
    error.status = 503;
    throw error;
  }
  const address = (await response.json()).address || {};
  const city = address.city || address.town || address.village || address.municipality || address.county || null;
  const value = { city, state: address.state || null, country: address.country || null };
  reverseCache.set(key, { value, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
  return value;
}

export async function saveReverseGeocodedCity(userId, city) {
  if (!city) return null;
  if (isDatabaseConfigured()) {
    const { rows } = await pool.query(
      "UPDATE worker_profiles SET location = $1, updated_at = NOW() WHERE user_id = $2 RETURNING location",
      [city, Number(userId)]
    );
    return rows[0]?.location || null;
  }
  return city;
}

export async function getDrivingRoute(startLatitude, startLongitude, endLatitude, endLongitude) {
  const start = validateCoordinates(startLatitude, startLongitude);
  const end = validateCoordinates(endLatitude, endLongitude);
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!response.ok) throw new Error("route unavailable");
    const route = (await response.json()).routes?.[0];
    if (!route?.geometry?.coordinates) throw new Error("route unavailable");
    return { distanceKm: Number((route.distance / 1000).toFixed(1)), durationMinutes: Math.round(route.duration / 60), coordinates: route.geometry.coordinates };
  } catch {
    const error = new Error("Route unavailable. You can still view the job location.");
    error.status = 503;
    throw error;
  }
}
