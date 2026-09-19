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
         JOIN users u ON a.worker_id = u.id
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

      if (application.status === "Selected") {
        const error = new Error(`Application #${numericId} is already marked as hired`);
        error.status = 400;
        throw error;
      }

      if (application.openings <= 0) {
        const error = new Error(`Job "${application.job_title}" has no available openings remaining`);
        error.status = 400;
        throw error;
      }

      // 2. Mark this application as Selected
      const hiredRes = await client.query(
        `UPDATE applications
         SET status = 'Selected', updated_at = NOW()
         WHERE id = $1
         RETURNING id, worker_id, job_id, status, updated_at`,
        [numericId]
      );

      // 3. Withdraw all other active applications for this worker
      const withdrawnRes = await client.query(
        `UPDATE applications
         SET status = 'Withdrawn', updated_at = NOW()
         WHERE worker_id = $1
           AND id != $2
           AND status IN ('Applied', 'Shortlisted')
         RETURNING id, job_id, status, updated_at`,
        [application.worker_id, numericId]
      );

      // 4. Decrement job openings
      const jobRes = await client.query(
        `UPDATE jobs
         SET openings = GREATEST(0, openings - 1)
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
          id: Number(application.worker_id),
          name: application.worker_name,
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
  const employerId = filters.employerId || filters.employer_id;

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
    if (employerId) {
      values.push(Number(employerId));
      conditions.push(`j.employer_id = $${values.length}`);
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
        u.email as worker_email,
        COALESCE(wp.occupation, 'Skilled Specialist') as occupation,
        wp.skills,
        wp.experience_years,
        wp.location as worker_location,
        a.job_id,
        j.title as job_title,
        j.company_name,
        j.employer_id,
        j.salary_min,
        j.salary_max,
        j.location as job_location,
        a.status,
        a.applied_at,
        a.updated_at
      FROM applications a
      JOIN users u ON a.worker_id = u.id
      LEFT JOIN worker_profiles wp ON wp.user_id = u.id
      JOIN jobs j ON a.job_id = j.id
      ${whereClause}
      ORDER BY a.applied_at DESC
    `;

    const { rows } = await pool.query(query, values);
    const formatted = rows.map((r) => ({
      ...r,
      id: Number(r.id),
      worker_id: Number(r.worker_id),
      job_id: Number(r.job_id),
      employer_id: r.employer_id ? Number(r.employer_id) : null,
    }));
    return { data: formatted };
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
    { id: 1, worker_id: 1, worker_name: "Raju Kumar", job_id: 1, job_title: "MIG Welder", company_name: "Pragati Fabrication Works", status: "Shortlisted", updated_at: new Date().toISOString() },
    { id: 2, worker_id: 1, worker_name: "Raju Kumar", job_id: 2, job_title: "TIG Welder", company_name: "Pragati Fabrication Works", status: "Applied", updated_at: new Date().toISOString() },
    { id: 3, worker_id: 2, worker_name: "Meena Devi", job_id: 4, job_title: "Industrial Electrician", company_name: "Metro Build Services", status: "Shortlisted", updated_at: new Date().toISOString() },
    { id: 4, worker_id: 3, worker_name: "Suresh Patil", job_id: 7, job_title: "Plumber", company_name: "Metro Build Services", status: "Applied", updated_at: new Date().toISOString() },
    { id: 5, worker_id: 4, worker_name: "Anitha Raj", job_id: 10, job_title: "Machine Operator", company_name: "Precision Components India", status: "Shortlisted", updated_at: new Date().toISOString() },
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

    try {
      const insertRes = await pool.query(
        `INSERT INTO applications (worker_id, job_id, status, applied_at, updated_at)
         VALUES ($1, $2, 'Applied', NOW(), NOW())
         RETURNING id, worker_id, job_id, status, applied_at, updated_at`,
        [numWorkerId, numJobId]
      );
      const row = insertRes.rows[0];
      return {
        id: Number(row.id),
        worker_id: Number(row.worker_id),
        job_id: Number(row.job_id),
        status: row.status,
        applied_at: row.applied_at,
        updated_at: row.updated_at,
      };
    } catch (dbErr) {
      if (dbErr.code === "23505") {
        const err = new Error("You have already applied for this job");
        err.status = 400;
        throw err;
      }
      throw dbErr;
    }
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
    status: "Applied",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  fallbackApplications.unshift(newApp);
  return newApp;
}

/**
 * Revoke selection for an applicant (changes Selected back to Applied, increments opening)
 */
export async function revokeApplicant(applicationId) {
  const numericId = Number(applicationId);
  if (!numericId || Number.isNaN(numericId)) {
    const error = new Error("Invalid application ID");
    error.status = 400;
    throw error;
  }

  if (isDatabaseConfigured()) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const appRes = await client.query(
        `SELECT a.id, a.worker_id, a.job_id, a.status, j.title as job_title, u.name as worker_name
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         JOIN users u ON a.worker_id = u.id
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

      if (application.status !== "Selected") {
        const error = new Error(`Application #${numericId} is not in Selected status (current: ${application.status})`);
        error.status = 400;
        throw error;
      }

      // Revert status to 'Applied'
      const updatedRes = await client.query(
        `UPDATE applications
         SET status = 'Applied', updated_at = NOW()
         WHERE id = $1
         RETURNING id, worker_id, job_id, status, updated_at`,
        [numericId]
      );

      // Increment job openings back
      const jobRes = await client.query(
        `UPDATE jobs
         SET openings = openings + 1
         WHERE id = $1
         RETURNING id, title, openings`,
        [application.job_id]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `Selection of ${application.worker_name} for "${application.job_title}" was successfully revoked.`,
        application: updatedRes.rows[0],
        worker: {
          id: Number(application.worker_id),
          name: application.worker_name,
        },
        job: jobRes.rows[0],
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Fallback in-memory
  const appIndex = fallbackApplications.findIndex((app) => app.id === numericId);
  if (appIndex === -1) {
    const error = new Error(`Application #${numericId} not found`);
    error.status = 404;
    throw error;
  }
  const app = fallbackApplications[appIndex];
  app.status = "Applied";
  app.updated_at = new Date().toISOString();

  const job = fallbackJobs.find((j) => j.id === app.job_id);
  if (job) {
    job.openings = (job.openings || 0) + 1;
  }

  return {
    success: true,
    message: `Selection of ${app.worker_name} was successfully revoked.`,
    application: app,
  };
}

/**
 * Reject an applicant (marks status as Rejected; if previously Selected, increments opening)
 */
export async function rejectApplicant(applicationId) {
  const numericId = Number(applicationId);
  if (!numericId || Number.isNaN(numericId)) {
    const error = new Error("Invalid application ID");
    error.status = 400;
    throw error;
  }

  if (isDatabaseConfigured()) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const appRes = await client.query(
        `SELECT a.id, a.worker_id, a.job_id, a.status, j.title as job_title, u.name as worker_name
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         JOIN users u ON a.worker_id = u.id
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

      // If application was Selected, restore opening
      if (application.status === "Selected") {
        await client.query(
          `UPDATE jobs
           SET openings = openings + 1
           WHERE id = $1`,
          [application.job_id]
        );
      }

      // Mark status as Rejected
      const rejectedRes = await client.query(
        `UPDATE applications
         SET status = 'Rejected', updated_at = NOW()
         WHERE id = $1
         RETURNING id, worker_id, job_id, status, updated_at`,
        [numericId]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `Application for ${application.worker_name} on "${application.job_title}" was rejected.`,
        application: rejectedRes.rows[0],
        worker: {
          id: Number(application.worker_id),
          name: application.worker_name,
        },
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Fallback in-memory
  const appIndex = fallbackApplications.findIndex((app) => app.id === numericId);
  if (appIndex === -1) {
    const error = new Error(`Application #${numericId} not found`);
    error.status = 404;
    throw error;
  }
  const app = fallbackApplications[appIndex];
  if (app.status === "Selected") {
    const job = fallbackJobs.find((j) => j.id === app.job_id);
    if (job) job.openings = (job.openings || 0) + 1;
  }
  app.status = "Rejected";
  app.updated_at = new Date().toISOString();

  return {
    success: true,
    message: `Application for ${app.worker_name} was rejected.`,
    application: app,
  };
}

/**
 * Withdraw an application (Worker action)
 */
export async function withdrawApplication(applicationId, workerId = null) {
  const numericId = Number(applicationId);
  if (!numericId || Number.isNaN(numericId)) {
    const error = new Error("Invalid application ID");
    error.status = 400;
    throw error;
  }

  if (isDatabaseConfigured()) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const appRes = await client.query(
        `SELECT a.id, a.worker_id, a.job_id, a.status, j.title as job_title, u.name as worker_name
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         JOIN users u ON a.worker_id = u.id
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

      if (workerId && Number(application.worker_id) !== Number(workerId)) {
        const error = new Error("You are not authorized to withdraw this application");
        error.status = 403;
        throw error;
      }

      // If already withdrawn
      if (application.status === "Withdrawn") {
        await client.query("ROLLBACK");
        const error = new Error(`Application for "${application.job_title}" is already withdrawn.`);
        error.status = 400;
        throw error;
      }

      // If application was Selected (Hired), restore opening
      if (application.status === "Selected") {
        await client.query(
          `UPDATE jobs
           SET openings = openings + 1
           WHERE id = $1`,
          [application.job_id]
        );
      }

      // Mark status as Withdrawn
      const withdrawnRes = await client.query(
        `UPDATE applications
         SET status = 'Withdrawn', updated_at = NOW()
         WHERE id = $1
         RETURNING id, worker_id, job_id, status, updated_at`,
        [numericId]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: `Application for "${application.job_title}" has been withdrawn.`,
        application: withdrawnRes.rows[0],
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Fallback in-memory
  const appIndex = fallbackApplications.findIndex((app) => app.id === numericId);
  if (appIndex === -1) {
    const error = new Error(`Application #${numericId} not found`);
    error.status = 404;
    throw error;
  }
  const app = fallbackApplications[appIndex];

  if (workerId && Number(app.worker_id) !== Number(workerId)) {
    const error = new Error("You are not authorized to withdraw this application");
    error.status = 403;
    throw error;
  }

  if (app.status === "Withdrawn") {
    const error = new Error(`Application for "${app.job_title || "job"}" is already withdrawn.`);
    error.status = 400;
    throw error;
  }

  if (app.status === "Selected" || app.status === "hired") {
    const job = fallbackJobs.find((j) => j.id === app.job_id);
    if (job) job.openings = (job.openings || 0) + 1;
  }
  app.status = "Withdrawn";
  app.updated_at = new Date().toISOString();

  return {
    success: true,
    message: `Application for "${app.job_title || "job"}" has been withdrawn.`,
    application: app,
  };
}


