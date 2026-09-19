import {
  hireApplicant,
  revokeApplicant,
  rejectApplicant,
  withdrawApplication,
  listApplications,
  resetApplicationData,
  applyForJob,
} from "../services/applicationService.js";

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
 * POST /api/applications/:id/revoke
 * Revokes a candidate's selection and returns them to 'Applied', reopening the vacancy slot.
 */
export async function revokeApplication(request, response) {
  try {
    const { id } = request.params;
    const result = await revokeApplicant(id);
    return response.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({ error: error.message });
  }
}

/**
 * POST /api/applications/:id/reject
 * Rejects an application.
 */
export async function rejectApplication(request, response) {
  try {
    const { id } = request.params;
    const result = await rejectApplicant(id);
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
    const { worker_id: workerId, job_id: jobId, employer_id: employerId, status } = request.query;
    const result = await listApplications({ workerId, jobId, employerId, status });
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
 * POST /api/applications/:id/withdraw
 * Allows a worker to withdraw their application.
 */
export async function withdrawApp(request, response) {
  try {
    const { id } = request.params;
    const { workerId } = request.body || {};
    const result = await withdrawApplication(id, workerId);
    return response.status(200).json(result);
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
