import { pool, isDatabaseConfigured } from "../config/db.js";

// In-memory fallback dataset for when PostgreSQL is not yet connected
let fallbackApplications = [
  { id: 1, worker_id: 1, worker_name: "Raju Kumar", job_id: 1, job_title: "MIG Welder", company_name: "Pragati Fabrication Works", status: "shortlisted", updated_at: new Date().toISOString() },
  { id: 2, worker_id: 1, worker_name: "Raju Kumar", job_id: 2, job_title: "TIG Welder", company_name: "Pragati Fabrication Works", status: "applied", updated_at: new Date().toISOString() },
  { id: 3, worker_id: 2, worker_name: "Meena Devi", job_id: 4, job_title: "Industrial Electrician", company_name: "Metro Build Services", status: "shortlisted", updated_at: new Date().toISOString() },
  { id: 4, worker_id: 3, worker_name: "Suresh Patil", job_id: 7, job_title: "Plumber", company_name: "Metro Build Services", status: "applied", updated_at: new Date().toISOString() },
  { id: 5, worker_id: 4, worker_name: "Anitha Raj", job_id: 10, job_title: "Machine Operator", company_name: "Precision Components India", status: "shortlisted", updated_at: new Date().toISOString() },
];

let fallbackWorkers = [
  { id: 1, name: "Raju Kumar", occupation: "Welder", is_available: true },
  { id: 2, name: "Meena Devi", occupation: "Electrician", is_available: true },
  { id: 3, name: "Suresh Patil", occupation: "Plumber", is_available: true },
  { id: 4, name: "Anitha Raj", occupation: "Machine Operator", is_available: true },
];

let fallbackJobs = [
  { id: 1, title: "MIG Welder", openings: 3 },
  { id: 2, title: "TIG Welder", openings: 2 },
  { id: 4, title: "Industrial Electrician", openings: 2 },
  { id: 7, title: "Plumber", openings: 3 },
  { id: 10, title: "Machine Operator", openings: 4 },
];

/**
 * Hire an applicant for a job.
 * Runs atomically:
 *  1. Marks application as 'hired'
 *  2. Withdraws all other open applications for this worker
 *  3. Marks worker profile as unavailable (is_available = false)
 *  4. Decrements remaining job openings
 */
export async function hireApplicant(applicationId) {
  const numericId = Number(applicationId);
  if (!numericId || Number.isNaN(numericId)) {
    const error = new Error("Invalid application ID");
    error.status = 400;
    throw error;
  }

  // If database is configured, run atomic PostgreSQL transaction
  if (isDatabaseConfigured()) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Fetch application details with row lock
      const appRes = await client.query(
        `SELECT a.id, a.worker_id, a.job_id, a.status, j.openings, j.title as job_title, u.name as worker_name
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         JOIN worker_profiles wp ON a.worker_id = wp.id
         JOIN users u ON wp.user_id = u.id
         WHERE a.id = $1
         FOR UPDATE`,
        [numericId]
      );

      if (appRes.rows.length === 0) {
        const error = new Error(`Application #${numericId} not found`);
        error.status = 404;
        throw error;
      }

      const application = appRes.rows[0];

      if (application.status === "hired") {
        const error = new Error(`Application #${numericId} is already marked as hired`);
        error.status = 400;
        throw error;
      }

      if (application.openings <= 0) {
        const error = new Error(`Job "${application.job_title}" has no available openings remaining`);
        error.status = 400;
        throw error;
      }

      // 2. Mark this application as hired
      const hiredRes = await client.query(
        `UPDATE applications
         SET status = 'hired', updated_at = NOW()
         WHERE id = $1
         RETURNING id, worker_id, job_id, status, updated_at`,
        [numericId]
      );

      // 3. Withdraw all other active applications for this worker
      const withdrawnRes = await client.query(
        `UPDATE applications
         SET status = 'withdrawn', updated_at = NOW()
         WHERE worker_id = $1
           AND id != $2
           AND status IN ('applied', 'shortlisted')
         RETURNING id, job_id, status, updated_at`,
        [application.worker_id, numericId]
      );

      // 4. Mark worker profile as unavailable
      await client.query(
        `UPDATE worker_profiles
         SET is_available = FALSE, updated_at = NOW()
         WHERE id = $1`,
        [application.worker_id]
      );

      // 5. Decrement job openings
      const jobRes = await client.query(
        `UPDATE jobs
         SET openings = openings - 1
         WHERE id = $1
         RETURNING id, title, openings`,
        [application.job_id]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `${application.worker_name} was successfully hired for ${application.job_title}. Other open applications have been withdrawn.`,
        hiredApplication: hiredRes.rows[0],
        worker: {
          id: application.worker_id,
          name: application.worker_name,
          is_available: false,
        },
        job: jobRes.rows[0],
        withdrawnApplications: withdrawnRes.rows,
        withdrawnCount: withdrawnRes.rowCount,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Fallback in-memory simulation when database is not yet connected
  const appIndex = fallbackApplications.findIndex((app) => app.id === numericId);
  if (appIndex === -1) {
    const error = new Error(`Application #${numericId} not found`);
    error.status = 404;
    throw error;
  }

  const app = fallbackApplications[appIndex];
  if (app.status === "hired") {
    const error = new Error(`Application #${numericId} is already marked as hired`);
    error.status = 400;
    throw error;
  }

  const job = fallbackJobs.find((j) => j.id === app.job_id);
  if (job && job.openings <= 0) {
    const error = new Error(`Job "${app.job_title}" has no openings remaining`);
    error.status = 400;
    throw error;
  }

  // 1. Mark target application as hired
  app.status = "hired";
  app.updated_at = new Date().toISOString();

  // 2. Withdraw other active applications for this worker
  const withdrawn = [];
  for (const otherApp of fallbackApplications) {
    if (
      otherApp.worker_id === app.worker_id &&
      otherApp.id !== app.id &&
      ["applied", "shortlisted"].includes(otherApp.status)
    ) {
      otherApp.status = "withdrawn";
      otherApp.updated_at = new Date().toISOString();
      withdrawn.push({ id: otherApp.id, job_id: otherApp.job_id, status: otherApp.status });
    }
  }

  // 3. Mark worker as unavailable
  const worker = fallbackWorkers.find((w) => w.id === app.worker_id);
  if (worker) {
    worker.is_available = false;
  }

  // 4. Decrement job openings
  if (job) {
    job.openings = Math.max(0, job.openings - 1);
  }

  return {
    success: true,
    simulated: true,
    message: `${app.worker_name} was successfully hired for ${app.job_title}. Other open applications have been withdrawn.`,
    hiredApplication: { id: app.id, worker_id: app.worker_id, job_id: app.job_id, status: app.status, updated_at: app.updated_at },
    worker: { id: app.worker_id, name: app.worker_name, is_available: false },
    job: job || { id: app.job_id, openings: 0 },
    withdrawnApplications: withdrawn,
    withdrawnCount: withdrawn.length,
  };
}

/**
 * List applications with optional filtering
 */
export async function listApplications(filters = {}) {
  const { workerId, jobId, status } = filters;

  if (isDatabaseConfigured()) {
    const conditions = [];
    const values = [];

    if (workerId) {
      values.push(Number(workerId));
      conditions.push(`a.worker_id = $${values.length}`);
    }
    if (jobId) {
      values.push(Number(jobId));
      conditions.push(`a.job_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`a.status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT 
        a.id,
        a.worker_id,
        u.name as worker_name,
        wp.occupation,
        wp.is_available,
        a.job_id,
        j.title as job_title,
        ep.company_name,
        a.status,
        a.created_at,
        a.updated_at
      FROM applications a
      JOIN worker_profiles wp ON a.worker_id = wp.id
      JOIN users u ON wp.user_id = u.id
      JOIN jobs j ON a.job_id = j.id
      JOIN employer_profiles ep ON j.employer_id = ep.id
      ${whereClause}
      ORDER BY a.created_at DESC
    `;

    const { rows } = await pool.query(query, values);
    return { data: rows };
  }

  // Fallback in-memory response
  let results = [...fallbackApplications];
  if (workerId) results = results.filter((a) => a.worker_id === Number(workerId));
  if (jobId) results = results.filter((a) => a.job_id === Number(jobId));
  if (status) results = results.filter((a) => a.status === status);

  return {
    data: results,
    note: "Running in fallback mode. Configure DATABASE_URL to connect to live PostgreSQL.",
  };
}

/**
 * Reset demo data for testing
 */
export function resetApplicationData() {
  fallbackApplications = [
    { id: 1, worker_id: 1, worker_name: "Raju Kumar", job_id: 1, job_title: "MIG Welder", company_name: "Pragati Fabrication Works", status: "shortlisted", updated_at: new Date().toISOString() },
    { id: 2, worker_id: 1, worker_name: "Raju Kumar", job_id: 2, job_title: "TIG Welder", company_name: "Pragati Fabrication Works", status: "applied", updated_at: new Date().toISOString() },
    { id: 3, worker_id: 2, worker_name: "Meena Devi", job_id: 4, job_title: "Industrial Electrician", company_name: "Metro Build Services", status: "shortlisted", updated_at: new Date().toISOString() },
    { id: 4, worker_id: 3, worker_name: "Suresh Patil", job_id: 7, job_title: "Plumber", company_name: "Metro Build Services", status: "applied", updated_at: new Date().toISOString() },
    { id: 5, worker_id: 4, worker_name: "Anitha Raj", job_id: 10, job_title: "Machine Operator", company_name: "Precision Components India", status: "shortlisted", updated_at: new Date().toISOString() },
  ];
  fallbackWorkers = [
    { id: 1, name: "Raju Kumar", occupation: "Welder", is_available: true },
    { id: 2, name: "Meena Devi", occupation: "Electrician", is_available: true },
    { id: 3, name: "Suresh Patil", occupation: "Plumber", is_available: true },
    { id: 4, name: "Anitha Raj", occupation: "Machine Operator", is_available: true },
  ];
  fallbackJobs = [
    { id: 1, title: "MIG Welder", openings: 3 },
    { id: 2, title: "TIG Welder", openings: 2 },
    { id: 4, title: "Industrial Electrician", openings: 2 },
    { id: 7, title: "Plumber", openings: 3 },
    { id: 10, title: "Machine Operator", openings: 4 },
  ];
  return { success: true, message: "Demo data reset successfully" };
}

let nextAppId = 50;

/**
 * Apply for a job
 */
export async function applyForJob({ workerId, jobId, workerName = "Worker" }) {
  const numWorkerId = Number(workerId);
  const numJobId = Number(jobId);

  if (!numWorkerId || !numJobId) {
    const err = new Error("workerId and jobId are required");
    err.status = 400;
    throw err;
  }

  if (isDatabaseConfigured()) {
    const check = await pool.query(
      "SELECT id, status FROM applications WHERE worker_id = $1 AND job_id = $2",
      [numWorkerId, numJobId]
    );
    if (check.rows.length > 0) {
      const err = new Error("You have already applied for this job");
      err.status = 400;
      throw err;
    }

    const insertRes = await pool.query(
      `INSERT INTO applications (worker_id, job_id, status)
       VALUES ($1, $2, 'applied')
       RETURNING id, worker_id, job_id, status, created_at, updated_at`,
      [numWorkerId, numJobId]
    );
    return insertRes.rows[0];
  }

  const existing = fallbackApplications.find(
    (a) => a.worker_id === numWorkerId && a.job_id === numJobId
  );
  if (existing) {
    const err = new Error("You have already applied for this job");
    err.status = 400;
    throw err;
  }

  const job = fallbackJobs.find((j) => j.id === numJobId) || {
    title: "Job Opening",
    company_name: "Employer",
  };

  const newApp = {
    id: ++nextAppId,
    worker_id: numWorkerId,
    worker_name: workerName,
    job_id: numJobId,
    job_title: job.title || "Job Position",
    company_name: job.company_name || "Employer",
    status: "applied",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  fallbackApplications.unshift(newApp);
  return newApp;
}
