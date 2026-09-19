import { getJobs, createJob } from "../services/jobService.js";

export async function listJobs(request, response) {
  try {
    const result = await getJobs(request.query);
    return response.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({ error: error.message });
  }
}

export async function postJob(request, response) {
  try {
    const job = await createJob(request.body);
    return response.status(201).json({ success: true, job });
  } catch (error) {
    const status = error.status || 500;
    return response.status(status).json({ error: error.message });
  }
}
