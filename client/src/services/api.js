const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function apiRequest(path, options = {}) {
  let authHeaders = {};
  try {
    const user = JSON.parse(sessionStorage.getItem("kaamsetu_user") || "null");
    if (user?.authToken) authHeaders = { Authorization: `Bearer ${user.authToken}` };
  } catch {
    // A public endpoint must remain usable even when browser storage is unavailable.
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeaders, ...options.headers },
    ...options,
  });

  if (!response.ok) {
    let message = `API request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (data && data.error) {
        message = data.error;
      }
    } catch {
      // Ignore if response is not JSON
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export { API_BASE_URL };
