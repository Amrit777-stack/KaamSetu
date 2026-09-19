import { pool, isDatabaseConfigured } from "../config/db.js";
import { getWorkerProfile } from "./workerService.js";
import { calculateDistanceKm, roundedDistanceKm } from "./distanceService.js";

// Fallback jobs used only if DATABASE_URL is not configured
let fallbackJobs = [
  {
    id: 1,
    employer_id: 1,
    company_name: "Pragati Fabrication Works",
    title: "MIG Welder",
    description: "Fabrication work for industrial equipment.",
    location: "Pune",
    salary_min: 22000,
    salary_max: 28000,
    experience_required: 3,
    required_experience: 3,
    requiredExperience: 3,
    shift: "day",
    openings: 3,
  },
  {
    id: 2,
    employer_id: 1,
    company_name: "Pragati Fabrication Works",
    title: "TIG Welder",
    description: "Precision welding for stainless steel assemblies.",
    location: "Pune",
    salary_min: 25000,
    salary_max: 32000,
    experience_required: 4,
    required_experience: 4,
    requiredExperience: 4,
    shift: "day",
    openings: 2,
  },
];

let nextJobId = 3;

export async function getJobs(filters = {}) {
  const { employer_id: employerId, open_only: openOnly, unique, order_by: orderBy } = filters;
  const isUnique = unique === "true" || unique === true;
  const isOpenOnly = openOnly === "true" || openOnly === true;

  const workerLat = Number.isFinite(Number(filters.latitude ?? filters.worker_latitude))
    ? Number(filters.latitude ?? filters.worker_latitude)
    : null;
  const workerLon = Number.isFinite(Number(filters.longitude ?? filters.worker_longitude))
    ? Number(filters.longitude ?? filters.worker_longitude)
    : null;
  const sortByDistance = (orderBy === "distance" || filters.nearby === "true") && workerLat !== null && workerLon !== null;

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 50);
  const offset = (page - 1) * limit;

  if (isDatabaseConfigured()) {
    const conditions = [];
    const whereValues = [];

    if (employerId) {
      whereValues.push(Number(employerId));
      conditions.push(`employer_id = $${whereValues.length}`);
    }

    if (isOpenOnly) {
      conditions.push(`(openings > 0 AND (status = 'active' OR status IS NULL))`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total number of matching jobs
    const countQuery = isUnique
      ? `
        SELECT COUNT(*)::int AS total
        FROM (
          SELECT DISTINCT ON (LOWER(title), LOWER(company_name)) id
          FROM jobs
          ${whereClause}
        ) sub
      `
      : `
        SELECT COUNT(*)::int AS total
        FROM jobs
        ${whereClause}
      `;

    const countResult = await pool.query(countQuery, whereValues);
    const total = countResult.rows[0].total;

    // Get only the requested page
    const dataValues = [...whereValues];
    let latIdx = null;
    let lonIdx = null;
    if (sortByDistance) {
      dataValues.push(workerLat);
      latIdx = dataValues.length;
      dataValues.push(workerLon);
      lonIdx = dataValues.length;
    }

    dataValues.push(limit);
    const limitIdx = dataValues.length;
    dataValues.push(offset);
    const offsetIdx = dataValues.length;

    let query = "";
    if (isUnique) {
      if (sortByDistance) {
        query = `
          SELECT * FROM (
            SELECT DISTINCT ON (LOWER(title), LOWER(company_name))
              id,
              employer_id,
              company_name,
              company_industry,
              company_contact,
              title,
              description,
              skills,
              experience_required,
              salary_min,
              salary_max,
              location,
              latitude,
              longitude,
              shift,
              employment_type,
              openings,
              source,
              status,
              created_at,
              CASE
                WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN
                  (6371 * acos(least(1.0, greatest(-1.0,
                    cos(radians($${latIdx})) * cos(radians(latitude)) * cos(radians(longitude) - radians($${lonIdx})) +
                    sin(radians($${latIdx})) * sin(radians(latitude))
                  ))))
                ELSE NULL
              END AS dist
            FROM jobs
            ${whereClause}
            ORDER BY LOWER(title), LOWER(company_name), dist ASC NULLS LAST, created_at DESC
          ) sub
          ORDER BY
            CASE WHEN dist IS NOT NULL THEN 0 ELSE 1 END ASC,
            dist ASC,
            created_at DESC
          LIMIT $${limitIdx}
          OFFSET $${offsetIdx}
        `;
      } else {
        query = `
          SELECT * FROM (
            SELECT DISTINCT ON (LOWER(title), LOWER(company_name))
              id,
              employer_id,
              company_name,
              company_industry,
              company_contact,
              title,
              description,
              skills,
              experience_required,
              salary_min,
              salary_max,
              location,
              latitude,
              longitude,
              shift,
              employment_type,
              openings,
              source,
              status,
              created_at
            FROM jobs
            ${whereClause}
            ORDER BY LOWER(title), LOWER(company_name), created_at DESC
          ) sub
          ORDER BY created_at DESC
          LIMIT $${limitIdx}
          OFFSET $${offsetIdx}
        `;
      }
    } else {
      if (sortByDistance) {
        query = `
          SELECT
            id,
            employer_id,
            company_name,
            company_industry,
            company_contact,
            title,
            description,
            skills,
            experience_required,
            salary_min,
            salary_max,
            location,
            latitude,
            longitude,
            shift,
            employment_type,
            openings,
            source,
            status,
            created_at,
            CASE
              WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN
                (6371 * acos(least(1.0, greatest(-1.0,
                  cos(radians($${latIdx})) * cos(radians(latitude)) * cos(radians(longitude) - radians($${lonIdx})) +
                  sin(radians($${latIdx})) * sin(radians(latitude))
                ))))
              ELSE NULL
            END AS dist
          FROM jobs
          ${whereClause}
          ORDER BY
            CASE WHEN dist IS NOT NULL THEN 0 ELSE 1 END ASC,
            dist ASC,
            created_at DESC
          LIMIT $${limitIdx}
          OFFSET $${offsetIdx}
        `;
      } else {
        query = `
          SELECT
            id,
            employer_id,
            company_name,
            company_industry,
            company_contact,
            title,
            description,
            skills,
            experience_required,
            salary_min,
            salary_max,
            location,
            latitude,
            longitude,
            shift,
            employment_type,
            openings,
            source,
            status,
            created_at
          FROM jobs
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${limitIdx}
          OFFSET $${offsetIdx}
        `;
      }
    }

    const { rows } = await pool.query(query, dataValues);
    const formatted = rows.map((r) => {
      const expNum = Number(r.experience_required != null ? r.experience_required : r.required_experience) || 0;
      const rawDist = r.dist != null ? Number(r.dist) : null;
      return {
        ...r,
        id: Number(r.id),
        employer_id: r.employer_id ? Number(r.employer_id) : null,
        experience_required: expNum,
        required_experience: expNum,
        requiredExperience: expNum,
        distance_km: roundedDistanceKm(rawDist),
        _distance: rawDist,
      };
    });

    return {
      data: formatted,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Fallback if database is not configured
  let jobs = [...fallbackJobs];

  if (employerId) {
    jobs = jobs.filter(
      (job) => job.employer_id === Number(employerId)
    );
  }

  if (isOpenOnly) {
    jobs = jobs.filter((job) => (job.openings == null || Number(job.openings) > 0) && job.status !== "closed");
  }

  if (isUnique) {
    const seen = new Set();
    jobs = jobs.filter((job) => {
      const key = `${(job.title || "").trim().toLowerCase()}:::${(job.company_name || "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (sortByDistance) {
    jobs = jobs.map((job) => {
      const rawDistance = calculateDistanceKm(workerLat, workerLon, job.latitude, job.longitude);
      return { ...job, distance_km: roundedDistanceKm(rawDistance), _distance: rawDistance };
    });
    jobs.sort((a, b) => {
      const aDist = Number.isFinite(a._distance) ? a._distance : Infinity;
      const bDist = Number.isFinite(b._distance) ? b._distance : Infinity;
      return aDist - bDist;
    });
  }

  const total = jobs.length;
  const paginatedJobs = jobs.slice(offset, offset + limit).map((job) => {
    const expNum = Number(job.experience_required != null ? job.experience_required : job.required_experience) || 0;
    return {
      ...job,
      experience_required: expNum,
      required_experience: expNum,
      requiredExperience: expNum,
    };
  });

  return {
    data: paginatedJobs,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getNearbyJobsForWorker(workerUserId, filters = {}) {
  const worker = await getWorkerProfile(workerUserId);
  const lat = Number.isFinite(Number(filters.latitude)) ? Number(filters.latitude) : worker.latitude;
  const lon = Number.isFinite(Number(filters.longitude)) ? Number(filters.longitude) : worker.longitude;
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lon);
  const requestedRadius = Number(filters.radius_km);
  const workerOccupation = (worker.occupation || "").trim().toLowerCase();
  const workerSkills = (Array.isArray(worker.skills) ? worker.skills : []).map((skill) => String(skill).trim().toLowerCase()).filter(Boolean);

  const result = await getJobs({
    ...filters,
    latitude: lat,
    longitude: lon,
    order_by: hasLocation ? "distance" : (filters.order_by || "created_at"),
    limit: filters.limit || 50,
  });

  const jobs = result.data.map((job) => {
    const rawDistance = Number.isFinite(job._distance)
      ? job._distance
      : hasLocation
        ? calculateDistanceKm(lat, lon, job.latitude, job.longitude)
        : null;
    const title = (job.title || "").toLowerCase();
    const jobSkills = (Array.isArray(job.skills) ? job.skills : Array.isArray(job.required_skills) ? job.required_skills : []).map((skill) => String(skill).trim().toLowerCase());
    const skillMatches = workerSkills.filter((skill) => jobSkills.some((jobSkill) => jobSkill.includes(skill) || skill.includes(jobSkill))).length;
    const requiredExperience = Number(job.experience_required ?? job.required_experience) || 0;
    let matchScore = workerOccupation && title.includes(workerOccupation) ? 50 : 0;
    matchScore += Math.min(skillMatches, 3) * 10;
    if (Number(worker.experienceYears) >= requiredExperience) matchScore += 10;
    if (!worker.expectedSalaryMin || Number(job.salary_max) >= Number(worker.expectedSalaryMin)) matchScore += 6;
    if (worker.preferredShift && job.shift && String(worker.preferredShift).toLowerCase() === String(job.shift).toLowerCase()) matchScore += 4;
    return { ...job, distance_km: roundedDistanceKm(rawDistance), match_score: matchScore, _distance: rawDistance };
  }).filter((job) => !Number.isFinite(requestedRadius) || requestedRadius <= 0 || job._distance === null || job._distance <= requestedRadius);

  jobs.sort((left, right) => {
    // Primary sort: strictly least to max distance
    const leftDist = Number.isFinite(left._distance) ? left._distance : (Number.isFinite(left.distance_km) ? left.distance_km : Infinity);
    const rightDist = Number.isFinite(right._distance) ? right._distance : (Number.isFinite(right.distance_km) ? right.distance_km : Infinity);
    if (leftDist !== rightDist) {
      return leftDist - rightDist;
    }
    // Tie-breaker: suitability/match score
    if (left.match_score !== right.match_score) {
      return right.match_score - left.match_score;
    }
    return 0;
  });

  return { ...result, data: jobs.map(({ _distance, ...job }) => job), total: jobs.length, totalPages: 1, locationAvailable: hasLocation };
}
export async function createJob(jobData) {
  const {
    employerId,
    companyName = "Employer Company",
    companyIndustry = null,
    companyContact = null,
    title,
    description = "Industrial job opening",
    skills = [],
    experienceRequired,
    requiredExperience,
    experience_required,
    salaryMin = 18000,
    salaryMax = 24000,
    location = "Pune",
    latitude = null,
    longitude = null,
    shift = "day",
    employmentType = "Full-time",
    openings = 1,
    source = "KaamSetu",
  } = jobData;

  if (!title) {
    const err = new Error("Job title is required");
    err.status = 400;
    throw err;
  }

  const numericEmployerId = Number(employerId) || null;
  const numOpenings = Number(openings) || 1;
  const numSalaryMin = Number(salaryMin) || 18000;
  const numSalaryMax = Number(salaryMax) || 24000;
  const numExperience = Number(
    experienceRequired != null
      ? experienceRequired
      : requiredExperience != null
      ? requiredExperience
      : experience_required != null
      ? experience_required
      : 0
  ) || 0;

  if (isDatabaseConfigured()) {
    const insertQuery = `
      INSERT INTO jobs (
        employer_id,
        company_name,
        company_industry,
        company_contact,
        title,
        description,
        skills,
        experience_required,
        salary_min,
        salary_max,
        location,
        latitude,
        longitude,
        shift,
        employment_type,
        openings,
        source
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15, $16, $17
      )
      RETURNING *
    `;

    const values = [
      numericEmployerId,
      companyName,
      companyIndustry,
      companyContact,
      title,
      description,
      JSON.stringify(skills),
      numExperience,
      numSalaryMin,
      numSalaryMax,
      location,
      latitude,
      longitude,
      shift,
      employmentType,
      numOpenings,
      source,
    ];

    const { rows } = await pool.query(insertQuery, values);
    const row = rows[0];

    return {
      ...row,
      id: Number(row.id),
      employer_id: row.employer_id ? Number(row.employer_id) : null,
      experience_required: numExperience,
      required_experience: numExperience,
      requiredExperience: numExperience,
    };
  }

  const newJob = {
    id: ++nextJobId,
    employer_id: numericEmployerId,
    company_name: companyName,
    company_industry: companyIndustry,
    company_contact: companyContact,
    title,
    description,
    skills,
    experience_required: numExperience,
    required_experience: numExperience,
    requiredExperience: numExperience,
    salary_min: numSalaryMin,
    salary_max: numSalaryMax,
    location,
    latitude,
    longitude,
    shift,
    employment_type: employmentType,
    openings: numOpenings,
    source,
    status: "active",
    created_at: new Date().toISOString(),
  };

  fallbackJobs.unshift(newJob);

  return newJob;
}

/**
 * Update number of vacancies/openings for a job
 */
export async function updateJobOpenings(jobId, openings) {
  const numericJobId = Number(jobId);
  const numOpenings = Math.max(0, parseInt(openings, 10) || 0);

  if (!numericJobId || Number.isNaN(numericJobId)) {
    const err = new Error("Valid job ID is required");
    err.status = 400;
    throw err;
  }

  if (isDatabaseConfigured()) {
    const query = `
      UPDATE jobs
      SET openings = $1
      WHERE id = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [numOpenings, numericJobId]);
    if (rows.length === 0) {
      const err = new Error(`Job #${numericJobId} not found`);
      err.status = 404;
      throw err;
    }
    const expNum = Number(rows[0].experience_required != null ? rows[0].experience_required : rows[0].required_experience) || 0;
    return {
      ...rows[0],
      id: Number(rows[0].id),
      openings: Number(rows[0].openings),
      experience_required: expNum,
      required_experience: expNum,
      requiredExperience: expNum,
    };
  }

  const job = fallbackJobs.find((j) => j.id === numericJobId);
  if (!job) {
    const err = new Error(`Job #${numericJobId} not found`);
    err.status = 404;
    throw err;
  }
  job.openings = numOpenings;
  return job;
}

/**
 * Remove/delete a job opening from the database
 */
export async function deleteJob(jobId) {
  const numericJobId = Number(jobId);
  if (!numericJobId || Number.isNaN(numericJobId)) {
    const err = new Error("Valid job ID is required");
    err.status = 400;
    throw err;
  }

  if (isDatabaseConfigured()) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM applications WHERE job_id = $1", [numericJobId]);
      const res = await client.query("DELETE FROM jobs WHERE id = $1 RETURNING id, title", [numericJobId]);
      if (res.rows.length === 0) {
        const err = new Error(`Job #${numericJobId} not found`);
        err.status = 404;
        throw err;
      }
      await client.query("COMMIT");
      return {
        success: true,
        message: `Job opening #${numericJobId} was removed successfully.`,
        deletedJob: res.rows[0],
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  const idx = fallbackJobs.findIndex((j) => j.id === numericJobId);
  if (idx === -1) {
    const err = new Error(`Job #${numericJobId} not found`);
    err.status = 404;
    throw err;
  }
  const deleted = fallbackJobs.splice(idx, 1)[0];
  return {
    success: true,
    message: `Job opening #${numericJobId} was removed successfully.`,
    deletedJob: deleted,
  };
}
