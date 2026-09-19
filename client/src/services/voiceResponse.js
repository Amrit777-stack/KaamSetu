const API_BASE_URL = "http://localhost:4000/api";

export async function submitVoiceResponse(audioBlob, field) {
  const response = await fetch(`${API_BASE_URL}/stt?field=${encodeURIComponent(field)}`, {
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
