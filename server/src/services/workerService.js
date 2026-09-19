import { pool, isDatabaseConfigured } from "../config/db.js";

// In-memory fallback profiles
const fallbackWorkerProfiles = new Map();

/**
 * Retrieve worker profile by user ID
 */
export async function getWorkerProfile(userId) {
  const numericId = Number(userId);
  if (!numericId || Number.isNaN(numericId)) {
    const err = new Error("Valid worker user ID is required");
    err.status = 400;
    throw err;
  }

  if (isDatabaseConfigured()) {
    const query = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.role,
        wp.id as profile_id,
        wp.occupation,
        wp.skills,
        wp.experience_years,
        wp.expected_salary_min,
        wp.location,
        wp.latitude,
        wp.longitude,
        wp.preferred_shift,
        wp.language,
        wp.employment_history,
        wp.created_at,
        wp.updated_at
      FROM users u
      LEFT JOIN worker_profiles wp ON u.id = wp.user_id
      WHERE u.id = $1 AND u.role = 'worker'
    `;
    const { rows } = await pool.query(query, [numericId]);

    if (rows.length === 0) {
      const err = new Error("Worker not found");
      err.status = 404;
      throw err;
    }

    const row = rows[0];
    return {
      userId: Number(row.user_id),
      name: row.name,
      email: row.email,
      role: row.role,
      profileId: row.profile_id ? Number(row.profile_id) : null,
      occupation: row.occupation || "Skilled Specialist",
      skills: Array.isArray(row.skills) ? row.skills : [],
      experienceYears: Number(row.experience_years) || 0,
      expectedSalaryMin: row.expected_salary_min ? Number(row.expected_salary_min) : null,
      location: row.location || "India",
      preferredShift: row.preferred_shift || "Day",
      language: row.language || "Hindi",
      employmentHistory: Array.isArray(row.employment_history) ? row.employment_history : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Fallback in-memory
  const profile = fallbackWorkerProfiles.get(numericId) || {
    userId: numericId,
    name: "Raju Kumar",
    email: "worker1@kaamsetu.demo",
    role: "worker",
    occupation: "Welder",
    skills: ["Welding", "Fabrication"],
    experienceYears: 4,
    expectedSalaryMin: 22000,
    location: "Pune",
    preferredShift: "Day",
    language: "Hindi",
    employmentHistory: [],
  };

  return profile;
}

/**
 * Upsert worker profile associated with user_id
 */
export async function upsertWorkerProfile({
  userId,
  name,
  occupation,
  skills = [],
  experienceYears = 0,
  expectedSalaryMin = null,
  location = "Pune",
  latitude = null,
  longitude = null,
  preferredShift = "Day",
  language = "Hindi",
  employmentHistory = [],
}) {
  const numericId = Number(userId);
  if (!numericId || Number.isNaN(numericId)) {
    const err = new Error("Valid worker user ID is required");
    err.status = 400;
    throw err;
  }

  const numExp = Number(experienceYears) || 0;
  const numSalary = expectedSalaryMin ? Number(expectedSalaryMin) : null;
  const skillsArray = Array.isArray(skills)
    ? skills
    : typeof skills === "string"
      ? [skills]
      : [];
  const historyArray = Array.isArray(employmentHistory) ? employmentHistory : [];

  if (isDatabaseConfigured()) {
    // 1. Check worker user exists
    const userCheck = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1 AND role = 'worker'",
      [numericId]
    );
    if (userCheck.rows.length === 0) {
      const err = new Error("Worker account not found");
      err.status = 404;
      throw err;
    }

    // 2. Optionally update name if provided
    if (name && name.trim()) {
      await pool.query("UPDATE users SET name = $1 WHERE id = $2", [name.trim(), numericId]);
    }

    // 3. Upsert worker_profiles row
    const upsertQuery = `
      INSERT INTO worker_profiles (
        user_id,
        occupation,
        skills,
        experience_years,
        expected_salary_min,
        location,
        latitude,
        longitude,
        preferred_shift,
        language,
        employment_history,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        occupation = COALESCE(EXCLUDED.occupation, worker_profiles.occupation),
        skills = CASE
          WHEN jsonb_array_length(EXCLUDED.skills) > 0 THEN EXCLUDED.skills
          ELSE worker_profiles.skills
        END,
        experience_years = COALESCE(EXCLUDED.experience_years, worker_profiles.experience_years),
        expected_salary_min = COALESCE(EXCLUDED.expected_salary_min, worker_profiles.expected_salary_min),
        location = COALESCE(EXCLUDED.location, worker_profiles.location),
        latitude = COALESCE(EXCLUDED.latitude, worker_profiles.latitude),
        longitude = COALESCE(EXCLUDED.longitude, worker_profiles.longitude),
        preferred_shift = COALESCE(EXCLUDED.preferred_shift, worker_profiles.preferred_shift),
        language = COALESCE(EXCLUDED.language, worker_profiles.language),
        employment_history = CASE
          WHEN jsonb_array_length(EXCLUDED.employment_history) > 0 THEN EXCLUDED.employment_history
          ELSE worker_profiles.employment_history
        END,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      numericId,
      occupation || "Skilled Specialist",
      JSON.stringify(skillsArray),
      numExp,
      numSalary,
      location,
      latitude,
      longitude,
      preferredShift,
      language,
      JSON.stringify(historyArray),
    ];

    const { rows } = await pool.query(upsertQuery, values);
    const updatedProfile = rows[0];

    return {
      userId: numericId,
      name: name?.trim() || userCheck.rows[0].name,
      email: userCheck.rows[0].email,
      role: "worker",
      profileId: Number(updatedProfile.id),
      occupation: updatedProfile.occupation,
      skills: updatedProfile.skills,
      experienceYears: Number(updatedProfile.experience_years),
      expectedSalaryMin: updatedProfile.expected_salary_min,
      location: updatedProfile.location,
      preferredShift: updatedProfile.preferred_shift,
      language: updatedProfile.language,
      employmentHistory: updatedProfile.employment_history,
      updatedAt: updatedProfile.updated_at,
    };
  }

  // Fallback in-memory upsert
  const fallback = {
    userId: numericId,
    name: name?.trim() || "Raju Kumar",
    email: "worker1@kaamsetu.demo",
    role: "worker",
    occupation: occupation || "Skilled Specialist",
    skills: skillsArray,
    experienceYears: numExp,
    expectedSalaryMin: numSalary,
    location,
    preferredShift,
    language,
    employmentHistory: historyArray,
  };
  fallbackWorkerProfiles.set(numericId, fallback);
  return fallback;
}

