const API_BASE_URL = "http://localhost:4000/api";

export async function submitVoiceResponse(audioBlob, field, userId) {
  const parameters = new URLSearchParams({ field });
  if (userId) parameters.set("userId", String(userId));

  const response = await fetch(`${API_BASE_URL}/stt?${parameters}`, {
    method: "POST",
    headers: { "Content-Type": audioBlob.type || "audio/webm" },
    body: audioBlob,
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : { error: await response.text() };

  if (!response.ok) {
    throw new Error(
      data.error || `Speech recognition failed (HTTP ${response.status}). Restart the backend and try again.`,
    );
  }

  return data.record;
}

// This endpoint only returns a transcript; unlike submitVoiceResponse it does
// not create a voice-response record or update a worker profile.
export async function transcribeTemporaryJobSearch(audioBlob, language) {
  const parameters = new URLSearchParams({ mode: "job-search" });
  if (language) parameters.set("language", language);
  const response = await fetch(`${API_BASE_URL}/stt?${parameters}`, {
    method: "POST",
    headers: { "Content-Type": audioBlob.type || "audio/webm" },
    body: audioBlob,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Speech recognition failed");
  return data.record;
}
