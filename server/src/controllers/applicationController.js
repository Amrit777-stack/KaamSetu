import { hireApplicant, listApplications, resetApplicationData, applyForJob } from "../services/applicationService.js";

/**
 * POST /api/applications/:id/hire
 * Hires a candidate for a job opening and auto-withdraws other open applications.
 */
export async function hireApplication(request, response) {
  try {
    const { id } = request.params;
    const result = await hireApplicant(id);
    return response.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({ error: error.message });
  }
}

/**
 * GET /api/applications
 * Returns applications filtered by optional worker_id, job_id, or status query parameters.
 */
export async function getApplications(request, response) {
  try {
    const { worker_id: workerId, job_id: jobId, status } = request.query;
    const result = await listApplications({ workerId, jobId, status });
    return response.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({ error: error.message });
  }
}

/**
 * POST /api/applications/apply
 * Allows a worker to apply for a job opening.
 */
export async function applyApplication(request, response) {
  try {
    const { workerId, jobId, workerName } = request.body;
    const result = await applyForJob({ workerId, jobId, workerName });
    return response.status(201).json({ success: true, message: "Application submitted successfully", application: result });
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({ error: error.message });
  }
}

/**
 * POST /api/applications/reset
 * Resets fallback application data for demo/testing
 */
export function resetApplications(_request, response) {
  const result = resetApplicationData();
  return response.status(200).json(result);
}
