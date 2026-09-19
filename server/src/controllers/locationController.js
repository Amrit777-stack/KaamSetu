import { getDrivingRoute, reverseGeocode, saveReverseGeocodedCity } from "../services/locationService.js";

export async function reverseLocation(request, response) {
  try {
    const result = await reverseGeocode(request.query.latitude, request.query.longitude);
    const city = await saveReverseGeocodedCity(request.user.id, result.city);
    return response.json({ success: true, ...result, city: city || result.city });
  } catch (error) {
    return response.status(error.status || 500).json({ error: error.message });
  }
}

export async function routeToJob(request, response) {
  try {
    const route = await getDrivingRoute(request.query.startLatitude, request.query.startLongitude, request.query.endLatitude, request.query.endLongitude);
    return response.json({ success: true, route });
  } catch (error) {
    return response.status(error.status || 500).json({ error: error.message });
  }
}
