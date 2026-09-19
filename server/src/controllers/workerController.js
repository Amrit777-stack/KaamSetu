import { emptyDirectory } from "../services/directoryService.js";
import { getWorkerProfile, upsertWorkerProfile } from "../services/workerService.js";

export function listWorkers(_request, response) {
  response.json(emptyDirectory("Workers"));
}

export async function getProfile(request, response) {
  try {
    const { userId } = request.params;
    const worker = await getWorkerProfile(userId);
    return response.status(200).json({ success: true, data: worker, worker });
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({ error: error.message });
  }
}

export async function saveProfile(request, response) {
  try {
    const profile = await upsertWorkerProfile(request.body);
    return response.status(200).json({
      success: true,
      message: "Worker profile updated successfully",
      data: profile,
      worker: profile,
    });
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({ error: error.message });
  }
}

