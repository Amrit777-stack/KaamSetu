const EARTH_RADIUS_KM = 6371;

export function calculateDistanceKm(latitudeA, longitudeA, latitudeB, longitudeB) {
  const values = [latitudeA, longitudeA, latitudeB, longitudeB].map(Number);
  if (!values.every(Number.isFinite)) return null;
  const [latA, lonA, latB, lonB] = values.map((value) => (value * Math.PI) / 180);
  const latDelta = latB - latA;
  const lonDelta = lonB - lonA;
  const haversine = Math.sin(latDelta / 2) ** 2 + Math.cos(latA) * Math.cos(latB) * Math.sin(lonDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function roundedDistanceKm(distance) {
  if (!Number.isFinite(distance)) return null;
  return distance < 10 ? Number(distance.toFixed(1)) : Math.round(distance);
}
